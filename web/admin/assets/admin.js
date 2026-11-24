import {
  initializeDashboard,
  revealPage,
  openDialog,
  closeDialog,
} from './dashboard-ui.js';
import { createApi } from './api.js';
const $ = (id) => document.getElementById(id);
const node = (tag, text, classe) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (classe) el.className = classe;
  return el;
};
const labels = {
  ATIVO: 'Ativa',
  BLOQUEADO: 'Bloqueada',
  INATIVO: 'Inativa',
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  SOLICITADA: 'Pendente',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
  PROPRIO: 'Autocuidado',
  FILHO: 'Filho',
  FILHA: 'Filha',
  CONJUGE: 'Cônjuge',
  NETO: 'Neto',
  NETA: 'Neta',
  OUTRO: 'Outro',
};
const cores = {
  ATIVO: 'approved',
  APROVADO: 'approved',
  ACEITA: 'approved',
  CONCLUIDA: 'approved',
  PENDENTE: 'pending',
  SOLICITADA: 'pending',
  BLOQUEADO: 'blocked',
  REJEITADO: 'rejected',
  RECUSADA: 'rejected',
  CANCELADA: 'inactive',
  INATIVO: 'inactive',
};
const categorias = {
  cuidadores: 'Cuidadores',
  responsaveis: 'Responsáveis',
  independentes: 'Idosos independentes',
  idosos: 'Idosos',
};
const titulos = {
  'pagamentos-simulados': [
    'Pagamentos',
    'Pagamentos e resolução de contestações.',
  ],
  'visao-geral': [
    'Visão geral',
    'Acompanhe o crescimento, os cadastros e os atendimentos.',
  ],
  contratacoes: [
    'Contratações',
    'Consulte os atendimentos e acompanhe a situação de cada contratação.',
  ],
  'relatorios/financeiro': [
    'Valores contratados',
    'Volume de contratações e condições comerciais registradas.',
  ],
  'relatorios/servicos': [
    'Estatísticas de serviços',
    'Conheça os serviços mais solicitados no período.',
  ],
  'relatorios/crescimento': [
    'Crescimento de usuários',
    'Acompanhe os novos cadastros de cuidadores, responsáveis e idosos independentes.',
  ],
  administracao: [
    'Minha conta e acesso',
    'Informações da sessão administrativa e controles disponíveis.',
  ],
};
const dinheiro = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (v) =>
  v
    ? new Date(v).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : 'Não informado';
const nome = (u) => u.nomeSocial || u.nome;
function idade(v) {
  if (!v) return 'Não informada';
  const hoje = diaLocal(),
    n = v.slice(0, 10);
  let anos = Number(hoje.slice(0, 4)) - Number(n.slice(0, 4));
  if (hoje.slice(5) < n.slice(5)) anos--;
  return anos >= 0 ? `${anos} anos` : 'Não informada';
}
function diaLocal() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}
const fotos = new Map();
function avatar(u) {
  const e = node('span', nome(u).charAt(0).toUpperCase(), 'avatar');
  if (u.foto) {
    const chave = `${u.id}:${u.foto.updatedAt}`,
      sessao = token;
    if (!fotos.has(chave))
      fotos.set(
        chave,
        api
          .foto(u.id)
          .then((blob) => URL.createObjectURL(blob))
          .catch(() => null),
      );
    void fotos.get(chave).then((url) => {
      if (url && token === sessao) {
        const img = node('img');
        img.alt = '';
        img.src = url;
        e.replaceChildren(img);
      }
    });
  }
  return e;
}
let token = null;
try {
  token = sessionStorage.getItem('laco.admin.token');
} catch {}
let usuario = null,
  selecionado = null,
  categoriaDetalhe = null,
  busy = false,
  confirmar = null,
  versao = 0,
  detalheVersao = 0;
let filtros = {},
  paginaAtual = 1,
  periodoInicial = diaLocal();
const desde = new Date(`${periodoInicial}T12:00Z`);
desde.setUTCDate(desde.getUTCDate() - 29);
let periodo = {
  inicio: desde.toISOString().slice(0, 10),
  fim: periodoInicial,
  agrupamento: 'dia',
};
const api = createApi({
  getToken: () => token,
  onUnauthorized: () => {
    limparSessao();
    aviso('login-message', 'Sua sessão expirou. Entre novamente.', 'error');
  },
});
function guardarToken(t) {
  token = t;
  try {
    if (t) sessionStorage.setItem('laco.admin.token', t);
    else sessionStorage.removeItem('laco.admin.token');
  } catch {}
}
function aviso(id, mensagem = '', tipo = '') {
  const e = $(id);
  e.textContent = mensagem;
  e.hidden = !mensagem;
  e.className = `notice ${tipo}`;
}
function limparSessao() {
  versao++;
  detalheVersao++;
  for (const promise of fotos.values())
    void promise.then((url) => url && URL.revokeObjectURL(url));
  fotos.clear();
  guardarToken(null);
  usuario = null;
  selecionado = null;
  $('page-content').replaceChildren();
  $('detail-content').replaceChildren();
  for (const id of ['detail-dialog', 'confirm-dialog'])
    if ($(id).open) void closeDialog($(id), true);
  $('dashboard-view').hidden = true;
  motionRoute = undefined;
  $('login-view').hidden = false;
}
function badge(v) {
  return node('span', labels[v] ?? v, `badge ${cores[v] ?? 'inactive'}`);
}
function button(texto, acao, classe = 'button outline') {
  const b = node('button', texto, classe);
  b.type = 'button';
  b.addEventListener('click', acao);
  return b;
}
function campo(label, value) {
  const e = node('div');
  e.append(
    node('span', label, 'detail-label'),
    node('span', value ?? 'Não informado', 'detail-value'),
  );
  return e;
}
function secao(t, ...filhos) {
  const e = node('section', undefined, 'detail-section');
  e.append(node('h3', t), ...filhos);
  return e;
}
function grid(...filhos) {
  const e = node('div', undefined, 'detail-grid');
  e.append(...filhos);
  return e;
}
function estado(t, descricao) {
  const e = node('div', undefined, 'empty-state');
  e.setAttribute('role', 'status');
  e.append(node('h3', t), node('p', descricao, 'muted'));
  return e;
}
function tabela(colunas, linhas) {
  const wrap = node('div', undefined, 'table-wrap'),
    t = node('table'),
    head = node('thead'),
    tr = node('tr'),
    body = node('tbody');
  for (const c of colunas) {
    const th = node('th', c);
    th.scope = 'col';
    tr.append(th);
  }
  head.append(tr);
  for (const linha of linhas) {
    const row = node('tr');
    for (const valor of linha) {
      const td = node('td');
      if (valor instanceof Node) td.append(valor);
      else td.textContent = valor ?? '—';
      row.append(td);
    }
    body.append(row);
  }
  t.append(head, body);
  wrap.append(t);
  return wrap;
}
function pessoa(u) {
  const e = node('div', undefined, 'person-cell'),
    a = avatar(u),
    copy = node('div');
  copy.append(node('strong', u.nome), node('small', u.email));
  e.append(a, copy);
  return e;
}
function metricas(itens) {
  const e = node('section', undefined, 'stats');
  e.setAttribute('aria-label', 'Indicadores');
  for (const i of itens) {
    const c = node(
      i.href ? 'a' : 'article',
      undefined,
      `stat-card ${i.destaque ? 'pending' : ''}`,
    );
    if (i.href) c.href = i.href;
    c.append(
      node('span', i.titulo),
      node('strong', String(i.valor)),
      node('small', i.nota ?? ''),
    );
    e.append(c);
  }
  return e;
}
function painel(t, descricao) {
  const e = node('section', undefined, 'report-panel');
  e.append(node('h2', t));
  if (descricao) e.append(node('p', descricao, 'muted'));
  return e;
}
function rotuloPeriodo(d, grupo) {
  const partes = d.split('-');
  return grupo === 'ano'
    ? partes[0]
    : grupo === 'mes'
      ? `${partes[1]}/${partes[0]}`
      : `${partes[2]}/${partes[1]}${grupo === 'semana' ? ' · seg.' : ''}`;
}
// SVG local sem bibliotecas externas. A tabela equivalente mantém todos os valores acessíveis.
function grafico(
  titulo,
  dados,
  series,
  { monetario = false, grupo = 'dia' } = {},
) {
  const box = painel(titulo),
    legenda = node('div', undefined, 'chart-legend');
  for (const s of series) {
    const l = node('span', s.nome, `legend-${s.cor}`);
    legenda.append(l);
  }
  box.append(legenda);
  if (
    !dados.length ||
    dados.every((d) => series.every((s) => Number(d[s.chave]) === 0))
  ) {
    box.append(
      estado('Sem movimentação', 'Não há registros para este recorte.'),
    );
    return box;
  }
  const ns = 'http://www.w3.org/2000/svg',
    svg = document.createElementNS(ns, 'svg'),
    width = Math.max(650, dados.length * 48),
    height = 260,
    base = 210,
    max = Math.max(
      ...dados.flatMap((d) => series.map((s) => Number(d[s.chave]))),
    );
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('role', 'group');
  svg.setAttribute(
    'aria-label',
    `${titulo}. Os valores completos estão na tabela abaixo.`,
  );
  const palette = { purple: '#784b82', rose: '#b97996', green: '#53836c' };
  for (let k = 0; k < 4; k++) {
    const y = 20 + (k * 190) / 3,
      line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '75');
    line.setAttribute('x2', String(width - 12));
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', '#eee5ef');
    svg.append(line);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', '2');
    text.setAttribute('y', String(y + 4));
    text.textContent = monetario
      ? dinheiro(max * (1 - k / 3))
      : Math.round(max * (1 - k / 3)).toLocaleString('pt-BR');
    svg.append(text);
  }
  const step = (width - 90) / dados.length,
    bar = Math.min(28, step / (series.length + 1));
  dados.forEach((d, i) => {
    series.forEach((s, n) => {
      const v = Number(d[s.chave]),
        rect = document.createElementNS(ns, 'rect'),
        h = (v / max) * 190;
      rect.setAttribute('x', String(80 + i * step + n * bar));
      rect.setAttribute('y', String(base - h));
      rect.setAttribute('width', String(bar - 2));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', '7');
      rect.classList.add('chart-bar');
      rect.setAttribute('tabindex', '0');
      rect.setAttribute('fill', palette[s.cor]);
      const title = document.createElementNS(ns, 'title');
      title.textContent = `${d.rotulo ?? rotuloPeriodo(d.periodo, grupo)} · ${s.nome}: ${monetario ? dinheiro(v) : v}`;
      rect.dataset.chartLabel = title.textContent;
      rect.setAttribute('aria-label', title.textContent);
      rect.append(title);
      svg.append(rect);
    });
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', String(80 + i * step));
    label.setAttribute('y', '235');
    const rotulo = d.rotulo ?? rotuloPeriodo(d.periodo, grupo);
    label.textContent = rotulo.length > 18 ? `${rotulo.slice(0, 17)}…` : rotulo;
    svg.append(label);
  });
  const scroll = node('div', undefined, 'chart-scroll');
  scroll.append(svg);
  box.append(scroll);
  const detalhes = node('details'),
    summary = node('summary', 'Ver dados do gráfico');
  detalhes.append(
    summary,
    tabela(
      ['Período / categoria', ...series.map((s) => s.nome)],
      dados.map((d) => [
        d.rotulo ?? rotuloPeriodo(d.periodo, grupo),
        ...series.map((s) => (monetario ? dinheiro(d[s.chave]) : d[s.chave])),
      ]),
    ),
  );
  box.append(detalhes);
  return box;
}
function formularioPeriodo(onSubmit) {
  const form = node('form', undefined, 'toolbar period-form');
  for (const [chave, titulo] of [
    ['inicio', 'De'],
    ['fim', 'Até'],
  ]) {
    const label = node('label', titulo),
      input = node('input');
    input.type = 'date';
    input.name = chave;
    input.value = periodo[chave];
    input.required = true;
    label.append(input);
    form.append(label);
  }
  const label = node('label', 'Agrupar por'),
    select = node('select');
  select.name = 'agrupamento';
  for (const [v, t] of [
    ['dia', 'Dia'],
    ['semana', 'Semana'],
    ['mes', 'Mês'],
    ['ano', 'Ano'],
  ]) {
    const o = node('option', t);
    o.value = v;
    select.append(o);
  }
  select.value = periodo.agrupamento;
  label.append(select);
  const b = node('button', 'Aplicar período', 'button primary');
  b.type = 'submit';
  form.append(label, b);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    periodo = Object.fromEntries(new FormData(form));
    onSubmit();
  });
  return form;
}
function rosca(dados) {
  const box = painel(
    'Distribuição dos atendimentos',
    'Contratações por status no período selecionado.',
  );
  const total = dados.reduce((sum, item) => sum + item.quantidade, 0);
  if (!total) {
    box.append(
      estado('Sem movimentação', 'Não há contratações neste período.'),
    );
    return box;
  }
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 240 240');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Distribuição das contratações por status');
  svg.classList.add('donut-svg');
  const colors = {
    SOLICITADA: '#a77bbb',
    ACEITA: '#b26398',
    CONCLUIDA: '#5c2d6b',
    CANCELADA: '#b9aebc',
    RECUSADA: '#d8c5df',
  };
  const circumference = 2 * Math.PI * 86;
  let offset = 0;
  const legend = node('div', undefined, 'donut-legend');
  for (const item of dados) {
    if (!item.quantidade) continue;
    const label = `${labels[item.status]}: ${item.quantidade} (${Math.round((item.quantidade / total) * 100)}%)`;
    const circle = document.createElementNS(ns, 'circle');
    for (const [key, value] of Object.entries({
      cx: 120,
      cy: 120,
      r: 86,
      fill: 'none',
      stroke: colors[item.status],
      'stroke-width': 22,
      'stroke-dasharray': `${(item.quantidade / total) * circumference} ${circumference}`,
      'stroke-dashoffset': -offset,
      transform: 'rotate(-90 120 120)',
      tabindex: 0,
      'aria-label': label,
    }))
      circle.setAttribute(key, String(value));
    circle.dataset.chartLabel = label;
    svg.append(circle);
    offset += (item.quantidade / total) * circumference;
    const row = node('div', undefined, 'legend-row');
    const dot = node('span', undefined, 'legend-dot');
    dot.style.backgroundColor = colors[item.status];
    row.append(
      dot,
      node('span', labels[item.status]),
      node('strong', item.quantidade),
    );
    legend.append(row);
  }
  for (const [y, text, cls] of [
    [119, total, 'donut-total'],
    [143, 'contratações', 'donut-caption'],
  ]) {
    const el = document.createElementNS(ns, 'text');
    el.setAttribute('x', '120');
    el.setAttribute('y', String(y));
    el.setAttribute('text-anchor', 'middle');
    el.classList.add(cls);
    el.textContent = text;
    svg.append(el);
  }
  const visual = node('div', undefined, 'donut-layout');
  visual.append(svg, legend);
  box.append(visual);
  const details = node('details');
  details.append(
    node('summary', 'Ver dados do gráfico'),
    tabela(
      ['Status', 'Quantidade'],
      dados.map((item) => [labels[item.status], item.quantidade]),
    ),
  );
  box.append(details);
  return box;
}
async function visao(atual, sessao) {
  const root = $('page-content');
  root.replaceChildren();
  const summary = node('div', undefined, 'overview-summary');
  const charts = node('div', undefined, 'overview-charts');
  const operations = node('div', undefined, 'overview-operations');
  const recent = painel(
    'Últimas contratações',
    'Os cinco registros mais recentes · todo o histórico.',
  );
  const pending = painel(
    'Aguardando análise',
    'Cuidadores com verificação pendente.',
  );
  const payments = painel(
    'Pagamentos',
    'Valores consolidados · todo o histórico.',
  );
  const distribution = node('div'),
    monthly = node('div');
  charts.append(distribution, monthly);
  operations.append(recent, pending, payments);
  root.append(summary, charts, operations);
  const valid = () => atual === versao && token === sessao && root.isConnected;
  async function bloco(container, fetcher, render, preserveHeading = false) {
    let request = 0;
    const body = preserveHeading
      ? node('div', undefined, 'block-body')
      : container;
    if (preserveHeading) container.append(body);
    async function load() {
      const current = ++request;
      body.setAttribute('aria-busy', 'true');
      body.replaceChildren(estado('Carregando', 'Consultando os registros.'));
      try {
        const result = await fetcher();
        if (!valid() || current !== request || !container.isConnected) return;
        body.replaceChildren(...render(result));
      } catch (error) {
        if (!valid() || current !== request || !container.isConnected) return;
        body.replaceChildren(
          estado('Não foi possível carregar', error.message),
          button('Tentar novamente', () => void load(), 'button outline'),
        );
      } finally {
        if (current === request) body.removeAttribute('aria-busy');
      }
    }
    await load();
  }
  const firstSummary = api.resumo();
  const firstReport = api.relatorios({ ...periodo, agrupamento: 'mes' });
  const initial = (promise, reload) => {
    let first = true;
    return () => {
      if (first) {
        first = false;
        return promise;
      }
      return reload();
    };
  };
  function paymentValues(s) {
    const p = s.pagamentos;
    if (!p?.disponivel)
      return [
        estado(
          'Financeiro indisponível',
          'O financeiro não está habilitado neste ambiente.',
        ),
      ];
    const list = node('div', undefined, 'payment-summary');
    for (const [label, amount, count, cls] of [
      [
        'Líquido liberado',
        p.liberados.liquido,
        p.liberados.quantidade,
        'released',
      ],
      [
        'Em contestação',
        p.emContestacao.bruto,
        p.emContestacao.quantidade,
        'disputed',
      ],
    ]) {
      const row = node('div', undefined, cls);
      row.append(
        node('span', label),
        node('strong', dinheiro(amount)),
        node('small', `${count} pagamento(s)`),
      );
      list.append(row);
    }
    const link = node('a', 'Ver pagamentos →', 'text-link');
    link.href = '#pagamentos-simulados';
    return [list, link];
  }
  await Promise.all([
    bloco(
      summary,
      initial(firstSummary, () => api.resumo()),
      (s) => {
        const primary = metricas([
          {
            titulo: 'Todas as contratações',
            valor: s.contratacoes,
            href: '#contratacoes',
            nota: 'Todo o histórico',
          },
          {
            titulo: 'Atendimentos concluídos',
            valor: s.porStatus.CONCLUIDA,
            href: '#contratacoes?status=CONCLUIDA',
            nota: 'Cuidado realizado',
          },
          {
            titulo: 'Aguardando análise',
            valor: s.pendentesVerificacao,
            href: '#usuarios/cuidadores?verificacao=PENDENTE',
            nota: 'Verificação de cuidadores',
          },
          {
            titulo: 'Líquido liberado',
            valor: s.pagamentos?.disponivel
              ? dinheiro(s.pagamentos.liberados.liquido)
              : 'Indisponível',
            href: '#pagamentos-simulados',
            nota: 'Pagamentos · todo o histórico',
          },
        ]);
        primary.classList.add('primary-stats');
        const secondary = metricas([
          {
            titulo: 'Cuidadores',
            valor: s.cuidadores,
            href: '#usuarios/cuidadores',
          },
          {
            titulo: 'Responsáveis',
            valor: s.responsaveis,
            href: '#usuarios/responsaveis',
          },
          { titulo: 'Idosos', valor: s.idosos, href: '#usuarios/idosos' },
          {
            titulo: 'Independentes',
            valor: s.independentes,
            href: '#usuarios/independentes',
            nota: 'Incluídos no total de idosos',
          },
          ...['SOLICITADA', 'ACEITA', 'CANCELADA'].map((status) => ({
            titulo: labels[status],
            valor: s.porStatus[status],
            href: `#contratacoes?status=${status}`,
          })),
        ]);
        secondary.classList.add('secondary-stats');
        const count = $('sidebar-count');
        count.textContent = s.pendentesVerificacao;
        count.hidden = !s.pendentesVerificacao;
        return [
          primary,
          secondary,
          node(
            'p',
            `Atualizado em ${new Date(s.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Indicadores gerais: todo o histórico.`,
            'update-note',
          ),
        ];
      },
    ),
    bloco(
      distribution,
      initial(firstReport, () =>
        api.relatorios({ ...periodo, agrupamento: 'mes' }),
      ),
      (r) => [rosca(r.porStatus)],
    ),
    bloco(
      monthly,
      initial(firstReport, () =>
        api.relatorios({ ...periodo, agrupamento: 'mes' }),
      ),
      (r) => {
        const graph = grafico(
          'Contratações por mês',
          r.mensal,
          [{ chave: 'quantidade', nome: 'Contratações', cor: 'purple' }],
          { grupo: 'mes' },
        );
        graph.insertBefore(
          node(
            'p',
            `${data(`${r.inicio}T12:00:00Z`)} a ${data(`${r.fim}T12:00:00Z`)}`,
            'muted',
          ),
          graph.children[1],
        );
        return [graph];
      },
    ),
    bloco(
      recent,
      () => api.contratacoes({ pagina: 1, limite: 5 }),
      (result) => {
        if (!result.dados.length)
          return [
            estado(
              'Nenhuma contratação',
              'Os próximos atendimentos aparecerão aqui.',
            ),
          ];
        const list = node('div', undefined, 'activity-list');
        for (const c of result.dados) {
          const row = node('div', undefined, 'activity-row');
          const copy = node('div');
          copy.append(
            node('strong', c.nomeServico),
            node('small', `#${c.id} · ${nome(c.idoso)} · ${data(c.createdAt)}`),
          );
          row.append(
            copy,
            badge(c.status),
            button(
              'Detalhes',
              () => void abrirDetalhe('contratacoes', c.id),
              'review-button',
            ),
          );
          list.append(row);
        }
        const link = node('a', 'Todas as contratações →', 'text-link');
        link.href = '#contratacoes';
        return [list, link];
      },
      true,
    ),
    bloco(
      pending,
      () =>
        api.usuarios('cuidadores', {
          pagina: 1,
          limite: 5,
          verificacao: 'PENDENTE',
        }),
      (result) => {
        if (!result.dados.length)
          return [estado('Tudo em dia', 'Nenhum cuidador aguardando análise.')];
        const list = node('div', undefined, 'activity-list');
        for (const c of result.dados) {
          const row = node('div', undefined, 'activity-row');
          const initials = node(
            'span',
            nome(c.usuario)
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join(''),
            'avatar',
          );
          initials.setAttribute('aria-hidden', 'true');
          const copy = node('div');
          copy.append(
            node('strong', nome(c.usuario)),
            node('small', `Cadastro em ${data(c.createdAt)}`),
          );
          row.append(
            initials,
            copy,
            button(
              'Analisar',
              () => void abrirDetalhe('cuidadores', c.id),
              'review-button',
            ),
          );
          list.append(row);
        }
        const link = node('a', 'Ver fila de análise →', 'text-link');
        link.href = '#usuarios/cuidadores?verificacao=PENDENTE';
        return [list, link];
      },
      true,
    ),
    bloco(
      payments,
      initial(firstSummary, () => api.resumo()),
      paymentValues,
      true,
    ),
  ]);
}
function filtroSelect(form, chave, titulo, opcoes) {
  const label = node('label', titulo),
    select = node('select');
  select.name = chave;
  for (const [v, t] of [['', 'Todos'], ...opcoes]) {
    const o = node('option', t);
    o.value = v;
    select.append(o);
  }
  select.value = filtros[chave] ?? '';
  label.append(select);
  form.append(label);
}
function filtrosLista(categoria, contratos) {
  const f = node('form', undefined, 'toolbar'),
    label = node(
      'label',
      contratos ? 'Buscar serviço ou participante' : 'Buscar por nome',
    ),
    input = node('input');
  input.type = 'search';
  input.name = 'busca';
  input.value = filtros.busca ?? '';
  input.maxLength = 100;
  label.append(input);
  f.append(label);
  if (
    categoria === 'cuidadores' ||
    categoria === 'responsaveis' ||
    categoria === 'independentes'
  )
    filtroSelect(
      f,
      'situacao',
      'Situação da conta',
      ['ATIVO', 'BLOQUEADO', 'INATIVO'].map((s) => [s, labels[s]]),
    );
  if (categoria === 'cuidadores')
    filtroSelect(
      f,
      'verificacao',
      'Verificação',
      ['PENDENTE', 'APROVADO', 'REJEITADO'].map((s) => [s, labels[s]]),
    );
  if (categoria === 'responsaveis' || categoria === 'idosos')
    filtroSelect(f, 'vinculo', 'Vínculo', [
      ['COM_VINCULO', 'Com vínculo'],
      ['SEM_VINCULO', 'Sem vínculo'],
    ]);
  if (contratos) {
    filtroSelect(
      f,
      'status',
      'Status',
      ['SOLICITADA', 'ACEITA', 'CONCLUIDA', 'CANCELADA', 'RECUSADA'].map(
        (s) => [s, labels[s]],
      ),
    );
    for (const [chave, titulo] of [
      ['inicio', 'De'],
      ['fim', 'Até'],
    ]) {
      const l = node('label', titulo),
        i = node('input');
      i.name = chave;
      i.type = 'date';
      i.value = filtros[chave] ?? '';
      l.append(i);
      f.append(l);
    }
  }
  filtroSelect(f, 'limite', 'Por página', [
    ['10', '10'],
    ['20', '20'],
    ['50', '50'],
  ]);
  f.elements.limite.value = filtros.limite ?? '20';
  const b = node('button', 'Pesquisar', 'button primary');
  b.type = 'submit';
  f.append(
    b,
    button('Limpar', () => {
      filtros = {};
      paginaAtual = 1;
      void carregar();
    }),
  );
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    filtros = Object.fromEntries(new FormData(f));
    paginaAtual = 1;
    void carregar();
  });
  return f;
}
async function lista(categoria, contratos, atual, sessao) {
  const root = $('page-content'),
    form = filtrosLista(categoria, contratos),
    conteudo = node('section', undefined, 'list-panel');
  root.replaceChildren(form, conteudo);
  conteudo.append(
    estado('Carregando registros', 'Consultando os dados do sistema.'),
  );
  if (categoria === 'independentes')
    root.prepend(
      node(
        'p',
        'Idosos que acessam a própria conta e gerenciam seu cuidado. São apresentados como idosos independentes.',
        'notice',
      ),
    );
  if (categoria === 'idosos')
    root.prepend(
      node(
        'p',
        'Consulte o acesso próprio dos idosos independentes e os responsáveis pelas demais pessoas cadastradas.',
        'muted',
      ),
    );
  const result = await (contratos
    ? api.contratacoes({ ...filtros, pagina: paginaAtual })
    : api.usuarios(categoria, { ...filtros, pagina: paginaAtual }));
  if (atual !== versao || token !== sessao) return;
  if (result.total && paginaAtual > result.paginas) {
    paginaAtual = result.paginas;
    void carregar();
    return;
  }
  conteudo.replaceChildren(
    node('p', `${result.total} registro(s) encontrado(s)`, 'results-summary'),
  );
  if (!result.dados.length)
    conteudo.append(
      estado('Nenhum registro encontrado', 'Ajuste a pesquisa ou os filtros.'),
    );
  else if (contratos)
    conteudo.append(
      tabela(
        [
          'Contratação',
          'Serviço / idoso',
          'Cuidador',
          'Contratante',
          'Valor acordado',
          'Status',
          'Cadastro',
          'Detalhes',
        ],
        result.dados.map((c) => [
          `#${c.id}`,
          `${c.nomeServico} · ${nome(c.idoso)}`,
          nome(c.cuidadorServico.cuidador.usuario),
          nome(c.responsavel.usuario),
          dinheiro(c.valorAcordado),
          badge(c.status),
          data(c.createdAt),
          button(
            'Ver detalhes',
            () => void abrirDetalhe('contratacoes', c.id),
            'review-button',
          ),
        ]),
      ),
    );
  else if (categoria === 'cuidadores')
    conteudo.append(
      tabela(
        [
          'Cuidador / e-mail',
          'Telefone',
          'Cadastro',
          'Verificação',
          'Conta',
          'Serviços oferecidos',
          'Perfil',
        ],
        result.dados.map((c) => [
          pessoa(c.usuario),
          c.telefone,
          data(c.createdAt),
          badge(c.statusVerificacao),
          badge(c.usuario.status),
          c.cuidadorServicos
            .filter((o) => o.ativo)
            .map((o) => o.servico.nome)
            .join(', ') || 'Nenhum ativo',
          button(
            'Ver perfil',
            () => void abrirDetalhe(categoria, c.id),
            'review-button',
          ),
        ]),
      ),
    );
  else if (categoria === 'responsaveis')
    conteudo.append(
      tabela(
        [
          'Responsável / e-mail',
          'Telefone',
          'Cadastro',
          'Idosos vinculados',
          'Conta',
          'Detalhes',
        ],
        result.dados.map((r) => [
          pessoa(r.usuario),
          r.telefone,
          data(r.createdAt),
          r._count.responsavelIdosos,
          badge(r.usuario.status),
          button(
            'Ver detalhes',
            () => void abrirDetalhe(categoria, r.id),
            'review-button',
          ),
        ]),
      ),
    );
  else
    conteudo.append(
      tabela(
        [
          'Nome',
          'Idade',
          categoria === 'independentes'
            ? 'Acesso próprio'
            : 'Responsáveis / acesso',
          'Cadastro',
          categoria === 'independentes'
            ? 'Conta de autocuidado'
            : 'Situação do vínculo',
          'Detalhes',
        ],
        result.dados.map((i) => [
          nome(i),
          idade(i.dataNascimento),
          categoria === 'independentes'
            ? pessoa(
                i.responsavelIdosos.find((v) => v.parentesco === 'PROPRIO')
                  .responsavel.usuario,
              )
            : [
                ...(i.perfil === 'IDOSO_INDEPENDENTE'
                  ? ['Acesso próprio (idoso independente)']
                  : []),
                ...i.responsavelIdosos
                  .filter((v) => v.parentesco !== 'PROPRIO')
                  .map(
                    (v) =>
                      `${nome(v.responsavel.usuario)} · ${labels[v.parentesco]}`,
                  ),
              ].join('; ') || 'Sem responsável',
          data(i.createdAt),
          categoria === 'independentes'
            ? i.responsavelIdosos
                .filter((v) => v.parentesco === 'PROPRIO')
                .map((v) => labels[v.responsavel.usuario.status])
                .join(', ')
            : i.responsavelIdosos.length
              ? 'Vinculado'
              : 'Sem vínculo',
          button(
            'Ver detalhes',
            () => void abrirDetalhe(categoria, i.id),
            'review-button',
          ),
        ]),
      ),
    );
  const nav = node('nav', undefined, 'pagination');
  nav.setAttribute('aria-label', 'Paginação');
  const anterior = button('← Anterior', () => {
      paginaAtual--;
      void carregar();
    }),
    proxima = button('Próxima →', () => {
      paginaAtual++;
      void carregar();
    });
  anterior.disabled = paginaAtual <= 1;
  proxima.disabled = paginaAtual >= result.paginas;
  nav.append(
    anterior,
    node('span', `Página ${result.pagina} de ${Math.max(1, result.paginas)}`),
    proxima,
  );
  conteudo.append(nav);
}
async function relatorios(aba, atual, sessao) {
  const root = $('page-content'),
    form = formularioPeriodo(() => void carregar()),
    conteudo = node('div', undefined, 'report-content');
  root.replaceChildren(form, conteudo);
  conteudo.append(
    estado('Preparando relatório', 'Consultando os registros no período.'),
  );
  const r = await api.relatorios(periodo);
  if (atual !== versao || token !== sessao) return;
  conteudo.replaceChildren(node('p', r.baseTemporal, 'notice'));
  if (aba === 'financeiro') {
    const v = r.indicadores;
    conteudo.append(
      metricas([
        {
          titulo: 'Valor contratado',
          valor: dinheiro(v.valorContratado),
          nota: 'Aceitas + concluídas',
        },
        {
          titulo: 'Contratações concluídas',
          valor: dinheiro(v.valorConcluido),
        },
        { titulo: 'Aceitas em aberto', valor: dinheiro(v.valorAceito) },
        {
          titulo: 'Contratações no período',
          valor: v.quantidade,
          nota: 'Todos os status',
        },
        {
          titulo: 'Ticket médio concluído',
          valor: dinheiro(v.ticketMedioConcluido),
        },
        {
          titulo: 'Valor total registrado',
          valor: dinheiro(v.valorTotalRegistrado),
          nota: 'Inclui solicitações, recusas e cancelamentos',
        },
      ]),
      grafico(
        'Evolução dos valores contratados',
        r.serie,
        [
          { chave: 'concluido', nome: 'Concluídas', cor: 'purple' },
          { chave: 'aceito', nome: 'Aceitas em aberto', cor: 'rose' },
        ],
        { monetario: true, grupo: r.agrupamento },
      ),
      grafico(
        'Quantidade de contratações',
        r.serie,
        [{ chave: 'quantidade', nome: 'Todos os status', cor: 'purple' }],
        { grupo: r.agrupamento },
      ),
    );
  }
  if (aba === 'servicos')
    conteudo.append(
      grafico(
        'Serviços mais contratados · até 10',
        r.servicos.map((s) => ({ ...s, rotulo: s.nome })),
        [
          {
            chave: 'quantidade',
            nome: 'Aceitas e concluídas',
            cor: 'purple',
          },
        ],
      ),
      tabela(
        [
          'Serviço',
          'Contratações aceitas e concluídas',
          'Solicitações em todos os status',
          'Valor contratado',
        ],
        r.servicos.map((s) => [
          s.nome,
          s.quantidade,
          s.solicitacoes,
          dinheiro(s.valor),
        ]),
      ),
      grafico(
        'Contratações por status',
        r.porStatus.map((s) => ({ ...s, rotulo: labels[s.status] })),
        [{ chave: 'quantidade', nome: 'Contratações', cor: 'rose' }],
      ),
    );
  if (aba === 'crescimento')
    conteudo.append(
      grafico(
        'Novos cadastros no período',
        r.crescimento,
        [
          { chave: 'cuidadores', nome: 'Cuidadores', cor: 'purple' },
          { chave: 'responsaveis', nome: 'Responsáveis', cor: 'green' },
          { chave: 'independentes', nome: 'Idosos independentes', cor: 'rose' },
        ],
        { grupo: r.agrupamento },
      ),
      node(
        'p',
        'Idosos independentes são contabilizados separadamente dos responsáveis. A classificação reflete os vínculos atuais.',
        'muted',
      ),
    );
}
async function pagamentosSimulados(atual, sessao) {
  const [dados, movimentos] = await Promise.all([
    api.pagamentosSimulados(),
    api.movimentosSimulados(),
  ]);
  if (atual !== versao || token !== sessao) return;
  const conteudo = $('page-content');
  conteudo.replaceChildren();
  const moeda = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const situacoes = {
    PENDENTE: 'Pendente',
    RETIDO: 'Retido',
    LIBERADO: 'Liberado',
    REEMBOLSADO: 'Reembolsado',
    EM_CONTESTACAO: 'Em contestação',
    CANCELADO: 'Cancelado',
  };
  if (!dados.length)
    conteudo.append(
      estado('Nenhum pagamento', 'As transações aparecerão aqui.'),
    );
  for (const p of dados) {
    const bloco = painel(
      `Visita #${p.contratacaoId} · ${p.contratacao.nomeServico}`,
      situacoes[p.status],
    );
    bloco.append(
      grid(
        campo('Pagamento', '#' + p.id),
        campo('Total', moeda(p.bruto)),
        campo('Comissão', moeda(p.comissao)),
        campo('Líquido do cuidador', moeda(p.liquido)),
      ),
    );
    if (p.motivoContestacao)
      bloco.append(node('p', 'Contestação: ' + p.motivoContestacao));
    if (p.motivoResolucao)
      bloco.append(
        node(
          'p',
          `Resolução por administrador #${p.resolvidoPorId || '–'} · ${p.motivoResolucao}`,
        ),
      );
    for (const m of p.movimentos)
      bloco.append(
        node(
          'p',
          `#${m.id} · ${m.descricao} · ${moeda(m.valor)} · ${new Date(m.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
        ),
      );
    if (['RETIDO', 'EM_CONTESTACAO'].includes(p.status)) {
      const campoMotivo = node('textarea');
      campoMotivo.maxLength = 1000;
      campoMotivo.setAttribute('aria-label', 'Justificativa da resolução');
      const nota = node('p');
      nota.setAttribute('role', 'status');
      const botoes = [];
      const acao = (descricao, valor) => {
        const botao = node('button', descricao, 'button');
        botao.addEventListener('click', async () => {
          const motivo = campoMotivo.value.trim();
          if (!motivo) {
            nota.textContent = 'Informe uma justificativa.';
            campoMotivo.focus();
            return;
          }
          if (!window.confirm(descricao + '?')) return;
          botoes.forEach((b) => {
            b.disabled = true;
          });
          try {
            await api.resolverPagamento(p.contratacaoId, valor, motivo);
            await carregar();
          } catch (e) {
            nota.textContent = e.message;
            botoes.forEach((b) => {
              b.disabled = false;
            });
          }
        });
        botoes.push(botao);
        return botao;
      };
      bloco.append(
        campoMotivo,
        nota,
        acao('Autorizar reembolso', 'REEMBOLSAR'),
      );
      if (p.status === 'EM_CONTESTACAO')
        bloco.append(
          acao('Liberar valor por decisão administrativa', 'LIBERAR'),
        );
    }
    conteudo.append(bloco);
  }
  const saques = movimentos.filter((m) => m.tipo === 'SAQUE');
  if (saques.length) {
    const bloco = painel('Saques', 'Movimentações recentes das carteiras');
    for (const m of saques)
      bloco.append(
        node(
          'p',
          `#${m.id} · Cuidador #${m.cuidadorId} · ${moeda(m.valor)} · ${new Date(m.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
        ),
      );
    conteudo.append(bloco);
  }
}
function rota() {
  return location.hash.slice(1) || 'visao-geral';
}
let motionRoute;
async function carregar() {
  if (!token) return;
  const sessao = token,
    atual = ++versao,
    rotaAtual = rota(),
    [caminho] = rotaAtual.split('?'),
    categoria = caminho.split('/')[1];
  let titulo = titulos[caminho];
  if (caminho.startsWith('usuarios/') && categorias[categoria])
    titulo = [
      categorias[categoria],
      'Gerenciamento de usuários · consulte cadastros, vínculos e situação.',
    ];
  if (!titulo) {
    location.hash = 'visao-geral';
    return;
  }
  $('page-title').textContent = titulo[0];
  $('breadcrumb').textContent = titulo[0];
  $('page-description').textContent = titulo[1];
  for (const a of document.querySelectorAll('.sidebar a[href^="#"]')) {
    const ativo = a.hash.slice(1) === caminho;
    a.classList.toggle('selected', ativo);
    if (ativo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('refresh').disabled = true;
  aviso('dashboard-message');
  $('page-content').replaceChildren(
    estado('Carregando', 'Aguarde um instante.'),
  );
  try {
    if (caminho === 'visao-geral') await visao(atual, sessao);
    else if (caminho.startsWith('usuarios/'))
      await lista(categoria, false, atual, sessao);
    else if (caminho === 'contratacoes') await lista(null, true, atual, sessao);
    else if (caminho.startsWith('relatorios/'))
      await relatorios(categoria, atual, sessao);
    else if (caminho === 'pagamentos-simulados')
      await pagamentosSimulados(atual, sessao);
    else if (caminho === 'administracao')
      $('page-content').replaceChildren(
        painel(
          'Sessão administrativa',
          'As alterações de verificação e acesso dos cuidadores estão disponíveis no detalhe do perfil.',
        ),
        grid(
          campo('Administrador', usuario.nome),
          campo('E-mail', usuario.email),
          campo('Perfil de acesso', usuario.tipoUsuario),
        ),
        node(
          'p',
          'O sistema ainda não oferece configurações gerais ou gestão de outras contas administrativas por este painel.',
          'notice',
        ),
      );
  } catch (e) {
    if (atual === versao && token === sessao) {
      aviso('dashboard-message', e.message, 'error');
      $('page-content')
        .querySelectorAll('.empty-state')
        .forEach((e) => e.remove());
      $('page-content').append(
        estado(
          'Não foi possível carregar',
          'Use Atualizar para tentar novamente.',
        ),
      );
    }
  } finally {
    if (atual === versao) {
      $('refresh').disabled = busy;
      if (motionRoute !== caminho && token === sessao) {
        revealPage($('page-content'));
        motionRoute = caminho;
      }
    }
  }
}
async function abrirDetalhe(categoria, id) {
  const sessao = token,
    atual = versao,
    abertura = ++detalheVersao;
  categoriaDetalhe = categoria;
  selecionado = null;
  $('caregiver-actions').hidden = true;
  $('detail-title').textContent = 'Carregando detalhes';
  $('detail-content').replaceChildren(
    estado('Carregando', 'Consultando o registro selecionado.'),
  );
  if (!$('detail-dialog').open) openDialog($('detail-dialog'));
  try {
    const c = await (categoria === 'contratacoes'
      ? api.contratacao(id)
      : api.detalhe(categoria, id));
    if (token !== sessao || atual !== versao || abertura !== detalheVersao)
      return;
    selecionado = c;
    renderDetalhe();
  } catch (e) {
    if (token === sessao && atual === versao && abertura === detalheVersao)
      $('detail-content').replaceChildren(
        estado('Não foi possível carregar', e.message),
      );
  }
}
function renderDetalhe() {
  const c = selecionado;
  if (!c) return;
  const categoria = categoriaDetalhe;
  const conteudo = [];
  $('detail-title').textContent =
    categoria === 'contratacoes'
      ? `Contratação #${c.id}`
      : `${categorias[categoria]} · ${c.usuario ? nome(c.usuario) : nome(c)}`;
  if (categoria === 'cuidadores') {
    conteudo.push(
      secao(
        'Dados para análise',
        grid(
          campo('Nome completo', c.usuario.nome),
          campo('E-mail', c.usuario.email),
          campo('Telefone', c.telefone),
          campo('CPF para verificação', c.cpf),
          campo('Nascimento', data(c.dataNascimento)),
          campo('Cadastrado em', data(c.createdAt)),
        ),
        grid(badge(c.statusVerificacao), badge(c.usuario.status)),
      ),
      secao(
        'Endereço',
        node(
          'p',
          `${c.endereco.rua}, ${c.endereco.numero} · ${c.endereco.bairro} · ${c.endereco.cidade}/${c.endereco.estado}`,
        ),
      ),
      secao(
        'Serviços oferecidos',
        grid(
          ...c.cuidadorServicos.map((o) =>
            campo(
              o.servico.nome,
              `${dinheiro(o.preco)} · ${o.duracaoMinutos} minutos · ${o.ativo ? 'Ativo' : 'Inativo'}`,
            ),
          ),
        ),
      ),
    );
    if (c.biografia)
      conteudo.push(secao('Apresentação', node('p', c.biografia)));
    if (c.experienciaProfissional)
      conteudo.push(secao('Experiência', node('p', c.experienciaProfissional)));
    if (c.registroProfissional)
      conteudo.push(campo('Registro profissional', c.registroProfissional));
    if (c.curriculo) {
      const arquivo = node('div', undefined, 'file-card');
      arquivo.append(
        node('span', c.curriculo.nome, 'file-name'),
        button('Baixar currículo', () => void baixar(c.id), 'review-button'),
      );
      conteudo.push(secao('Currículo', arquivo));
    } else conteudo.push(node('p', 'Currículo não enviado.', 'muted'));
  } else if (categoria === 'responsaveis') {
    conteudo.push(
      grid(
        campo('Nome completo', c.usuario.nome),
        campo('E-mail', c.usuario.email),
        campo('Telefone', c.telefone),
        campo('Cadastrado em', data(c.createdAt)),
        campo('Situação', labels[c.usuario.status]),
        campo('Localização', `${c.endereco.cidade}/${c.endereco.estado}`),
      ),
      secao(
        'Idosos vinculados',
        tabela(
          ['Idoso', 'Vínculo', 'Detalhes'],
          c.responsavelIdosos.map((v) => [
            nome(v.idoso),
            labels[v.parentesco],
            button(
              'Consultar idoso',
              () => void abrirDetalhe('idosos', v.idoso.id),
              'review-button',
            ),
          ]),
        ),
      ),
    );
  } else if (categoria === 'contratacoes') {
    conteudo.push(
      grid(
        campo('Serviço', c.nomeServico),
        campo('Status', labels[c.status]),
        campo('Idoso', nome(c.idoso)),
        campo('Contratante', nome(c.responsavel.usuario)),
        campo('Cuidador', nome(c.cuidadorServico.cuidador.usuario)),
        campo('Valor acordado', dinheiro(c.valorAcordado)),
        campo('Preço-base registrado', dinheiro(c.precoReferencia)),
        campo('Duração', `${c.duracaoMinutos} minutos`),
        campo('Cadastro', data(c.createdAt)),
        campo('Última atualização', data(c.updatedAt)),
      ),
    );
    if (c.observacoes)
      conteudo.push(
        secao('Condições do atendimento', node('p', c.observacoes)),
      );
    if (c.agendamento)
      conteudo.push(
        secao(
          'Agendamento',
          node(
            'p',
            `${new Date(c.agendamento.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} até ${new Date(c.agendamento.fim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${c.agendamento.ativo ? 'Ativo' : 'Cancelado'}`,
          ),
        ),
      );
    else
      conteudo.push(node('p', 'Atendimento ainda sem agendamento.', 'muted'));
  } else {
    const proprio = c.responsavelIdosos.find((v) => v.parentesco === 'PROPRIO');
    const vinculados = c.responsavelIdosos.filter(
      (v) => v.parentesco !== 'PROPRIO',
    );
    conteudo.push(
      grid(
        campo('Nome', c.nome),
        campo('Idade', idade(c.dataNascimento)),
        campo('Telefone', c.telefone),
        campo('Cadastro', data(c.createdAt)),
        campo('Localização', `${c.endereco.cidade}/${c.endereco.estado}`),
      ),
    );
    if (proprio)
      conteudo.push(
        secao(
          'Conta do idoso independente',
          grid(
            campo('Perfil', 'Idoso independente'),
            campo('Nome completo', proprio.responsavel.usuario.nome),
            campo('E-mail', proprio.responsavel.usuario.email),
            campo(
              'Situação da conta',
              labels[proprio.responsavel.usuario.status],
            ),
          ),
          node(
            'p',
            'Este idoso acessa a própria conta e gerencia seu cuidado.',
            'muted',
          ),
        ),
      );
    if (vinculados.length || !proprio)
      conteudo.push(
        secao(
          'Responsáveis vinculados',
          tabela(
            ['Responsável', 'Vínculo', 'Conta', 'Detalhes'],
            vinculados.map((v) => [
              nome(v.responsavel.usuario),
              labels[v.parentesco],
              badge(v.responsavel.usuario.status),
              button(
                'Consultar responsável',
                () => void abrirDetalhe('responsaveis', v.responsavel.id),
                'review-button',
              ),
            ]),
          ),
        ),
      );
  }
  $('detail-content').replaceChildren(...conteudo);
  $('caregiver-actions').hidden = categoria !== 'cuidadores';
  configurarAcoes();
}
function configurarAcoes() {
  if (categoriaDetalhe !== 'cuidadores' || !selecionado) return;
  $('approve').disabled =
    busy ||
    (selecionado.statusVerificacao === 'APROVADO' &&
      selecionado.usuario.status === 'ATIVO');
  $('reject').disabled = busy || selecionado.statusVerificacao === 'REJEITADO';
  $('account-action').disabled = busy;
  $('account-action').textContent =
    selecionado.usuario.status === 'ATIVO'
      ? 'Bloquear acesso'
      : 'Reativar acesso';
}
function setBusy(v) {
  busy = v;
  for (const id of ['logout', 'refresh', 'confirm-action', 'cancel-action'])
    $(id).disabled = v;
  configurarAcoes();
}
async function baixar(id) {
  try {
    const blob = await api.curriculo(id),
      url = URL.createObjectURL(blob),
      a = node('a');
    a.href = url;
    a.download = `curriculo-${id}.pdf`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    aviso('dashboard-message', e.message, 'error');
  }
}
function acao(titulo, descricao, action) {
  if (busy || !selecionado) return;
  $('confirm-title').textContent = titulo;
  $('confirm-description').textContent = descricao;
  confirmar = action;
  aviso('confirm-error');
  openDialog($('confirm-dialog'));
}
for (const [id, titulo, descricao, action] of [
  [
    'approve',
    'Aprovar e ativar cuidador?',
    'O perfil será aprovado e a conta será ativada.',
    (id) => api.verificar(id, 'APROVADO'),
  ],
  [
    'reject',
    'Rejeitar perfil?',
    'O cuidador deixará de aparecer na busca; o acesso à conta será mantido.',
    (id) => api.verificar(id, 'REJEITADO'),
  ],
  [
    'account-action',
    'Alterar acesso à conta?',
    'Bloquear impede novos logins e revoga sessões. Reativar mantém a verificação atual.',
    (id) =>
      api.conta(
        id,
        selecionado.usuario.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO',
      ),
  ],
])
  $(id).addEventListener('click', () => {
    if (!selecionado) return;
    const alvo = selecionado.id;
    acao(titulo, descricao, () => action(alvo));
  });
$('confirm-action').addEventListener('click', async () => {
  if (busy || !confirmar) return;
  setBusy(true);
  try {
    await confirmar();
    await closeDialog($('confirm-dialog'));
    const id = selecionado.id,
      categoria = categoriaDetalhe;
    await carregar();
    await abrirDetalhe(categoria, id);
    aviso('dashboard-message', 'Cadastro atualizado com sucesso.', 'success');
  } catch (e) {
    aviso('confirm-error', e.message, 'error');
  } finally {
    setBusy(false);
  }
});
$('cancel-action').addEventListener(
  'click',
  () => void closeDialog($('confirm-dialog')),
);
$('confirm-dialog').addEventListener('cancel', (e) => {
  if (busy) e.preventDefault();
});
$('close-detail').addEventListener(
  'click',
  () => void closeDialog($('detail-dialog')),
);
function abrirPainel(u) {
  usuario = u;
  filtros = Object.fromEntries(new URLSearchParams(rota().split('?')[1]));
  paginaAtual = 1;
  $('admin-name').textContent = nome(u);
  $('admin-avatar').textContent = nome(u).charAt(0).toUpperCase();
  $('senha').value = '';
  $('login-view').hidden = true;
  $('dashboard-view').hidden = false;
  void carregar();
}
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  setBusy(true);
  $('login-button').disabled = true;
  aviso('login-message');
  try {
    const s = await api.login($('email').value, $('senha').value);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(s.usuario.tipoUsuario)) {
      await api.logout(s.token).catch(() => undefined);
      throw new Error('Use uma conta administrativa para acessar o painel.');
    }
    guardarToken(s.token);
    abrirPainel(s.usuario);
  } catch (e) {
    aviso('login-message', e.message, 'error');
  } finally {
    setBusy(false);
    $('login-button').disabled = false;
  }
});
$('toggle-password').addEventListener('click', () => {
  const mostrar = $('senha').type === 'password';
  $('senha').type = mostrar ? 'text' : 'password';
  $('toggle-password').textContent = mostrar ? 'Ocultar' : 'Mostrar';
  $('toggle-password').setAttribute(
    'aria-label',
    mostrar ? 'Ocultar senha' : 'Mostrar senha',
  );
});
$('logout').addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  try {
    await api.logout();
    limparSessao();
  } catch (e) {
    aviso('dashboard-message', e.message, 'error');
  } finally {
    setBusy(false);
  }
});
$('refresh').addEventListener('click', () => void carregar());
window.addEventListener('hashchange', () => {
  filtros = Object.fromEntries(new URLSearchParams(rota().split('?')[1]));
  paginaAtual = 1;
  if ($('detail-dialog').open) void closeDialog($('detail-dialog'), true);
  void carregar();
});
if (token) {
  $('login-button').disabled = true;
  aviso('login-message', 'Verificando sua sessão…');
  try {
    const u = await api.perfil();
    if (!['ADMIN', 'SUPER_ADMIN'].includes(u.tipoUsuario)) {
      await api.logout().catch(() => undefined);
      limparSessao();
      throw new Error('Use uma conta administrativa.');
    }
    filtros = Object.fromEntries(new URLSearchParams(rota().split('?')[1]));
    abrirPainel(u);
  } catch (e) {
    limparSessao();
    aviso('login-message', e.message, 'error');
  } finally {
    $('login-button').disabled = false;
  }
}

initializeDashboard();
