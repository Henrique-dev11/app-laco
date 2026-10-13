import { createApi } from './api.js';

const $ = (id) => document.getElementById(id);
let token = null;
try {
  token = sessionStorage.getItem('laco.admin.token');
} catch {
  /* A sessão continua em memória quando o armazenamento está indisponível. */
}
let cuidadores = [];
let selecionado = null;
let filtro = 'TODOS';
let busy = false;
let carregando = false;
let falhaLista = '';
let confirmar = null;
const verificacoes = {
  PENDENTE: ['Pendente', 'pending'],
  APROVADO: ['Aprovado', 'approved'],
  REJEITADO: ['Rejeitado', 'rejected'],
};
const contas = {
  ATIVO: ['Ativa', 'approved'],
  BLOQUEADO: ['Bloqueada', 'blocked'],
  INATIVO: ['Inativa', 'inactive'],
};
const dinheiro = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (value) =>
  new Date(value).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
const api = createApi({
  getToken: () => token,
  onUnauthorized: () => {
    limparSessao();
    aviso('login-message', 'Sua sessão expirou. Entre novamente.', 'error');
  },
});

function guardarToken(value) {
  token = value;
  try {
    if (value) sessionStorage.setItem('laco.admin.token', value);
    else sessionStorage.removeItem('laco.admin.token');
  } catch {
    /* Sem persistência nesta aba. */
  }
}
function aviso(id, message = '', kind = '') {
  const element = $(id);
  element.textContent = message;
  element.hidden = !message;
  element.className = `notice ${kind}`;
}
function limparSessao() {
  guardarToken(null);
  cuidadores = [];
  selecionado = null;
  $('caregiver-rows').replaceChildren();
  $('detail-content').replaceChildren();
  for (const id of ['detail-dialog', 'confirm-dialog'])
    if ($(id).open) $(id).close();
  $('dashboard-view').hidden = true;
  $('login-view').hidden = false;
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function badge(value, labels) {
  const [label, className] = labels[value] ?? [value, 'inactive'];
  return node('span', label, `badge ${className}`);
}
function nome(cuidador) {
  return cuidador.usuario.nomeSocial || cuidador.usuario.nome;
}
function setBusy(value) {
  busy = value;
  for (const id of [
    'approve',
    'reject',
    'account-action',
    'confirm-action',
    'cancel-action',
    'logout',
    'refresh',
  ])
    $(id).disabled = value;
  if (selecionado && !value) configurarAcoes();
}

function renderLista() {
  $('total-count').textContent = String(cuidadores.length);
  $('pending-count').textContent = String(
    cuidadores.filter((item) => item.statusVerificacao === 'PENDENTE').length,
  );
  $('approved-count').textContent = String(
    cuidadores.filter((item) => item.statusVerificacao === 'APROVADO').length,
  );
  $('blocked-count').textContent = String(
    cuidadores.filter((item) => item.usuario.status === 'BLOQUEADO').length,
  );
  $('sidebar-count').textContent = $('pending-count').textContent;
  for (const button of document.querySelectorAll('[data-filter]')) {
    const active = button.dataset.filter === filtro;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  }
  const busca = $('search').value.toLocaleLowerCase('pt-BR').trim();
  const filtrados = cuidadores.filter(
    (item) =>
      (filtro === 'TODOS' ||
        (filtro === 'BLOQUEADO'
          ? item.usuario.status === 'BLOQUEADO'
          : item.statusVerificacao === filtro)) &&
      `${nome(item)} ${item.usuario.nome} ${item.usuario.email}`
        .toLocaleLowerCase('pt-BR')
        .includes(busca),
  );
  $('results-label').textContent = carregando
    ? 'Carregando cadastros…'
    : `${filtrados.length} ${filtrados.length === 1 ? 'cadastro encontrado' : 'cadastros encontrados'}`;
  $('table-wrap').hidden = carregando || !!falhaLista || !filtrados.length;
  $('list-state').hidden = !carregando && !falhaLista && filtrados.length > 0;
  $('state-title').textContent = carregando
    ? 'Carregando cadastros'
    : falhaLista
      ? 'Não foi possível carregar'
      : 'Nenhum cadastro encontrado';
  $('state-description').textContent = carregando
    ? 'Aguarde um instante.'
    : falhaLista ||
      (busca || filtro !== 'TODOS'
        ? 'Experimente outro nome ou filtro.'
        : 'Os novos cuidadores aparecerão aqui depois de se cadastrarem no aplicativo.');
  const rows = filtrados.map((cuidador) => {
    const tr = node('tr');
    const person = node('div', undefined, 'person-cell');
    const copy = node('div');
    copy.append(
      node('strong', nome(cuidador)),
      node('small', cuidador.usuario.email),
    );
    person.append(
      node('span', nome(cuidador).charAt(0).toUpperCase(), 'avatar'),
      copy,
    );
    const colNome = node('td');
    colNome.append(person);
    const colVerificacao = node('td');
    colVerificacao.append(badge(cuidador.statusVerificacao, verificacoes));
    const colConta = node('td');
    colConta.append(badge(cuidador.usuario.status, contas));
    const colAcoes = node('td', undefined, 'align-right');
    const button = node('button', 'Ver perfil →', 'review-button');
    button.type = 'button';
    button.disabled = busy;
    button.addEventListener('click', () => abrirPerfil(cuidador));
    colAcoes.append(button);
    tr.append(
      colNome,
      node('td', `${cuidador.endereco.cidade}/${cuidador.endereco.estado}`),
      colVerificacao,
      colConta,
      colAcoes,
    );
    return tr;
  });
  $('caregiver-rows').replaceChildren(...rows);
}

async function carregarLista() {
  carregando = true;
  falhaLista = '';
  $('refresh').disabled = true;
  renderLista();
  try {
    const lista = await api.listar();
    if (!token) return;
    cuidadores = lista;
    if (selecionado) {
      selecionado = lista.find((item) => item.id === selecionado.id) ?? null;
      if (selecionado && $('detail-dialog').open) renderPerfil();
    }
  } catch (error) {
    falhaLista = error.message;
  } finally {
    carregando = false;
    $('refresh').disabled = busy;
    renderLista();
  }
}
function abrirPainel(usuario) {
  $('admin-name').textContent = usuario.nomeSocial || usuario.nome;
  $('admin-avatar').textContent = (usuario.nomeSocial || usuario.nome)
    .charAt(0)
    .toUpperCase();
  $('login-view').hidden = true;
  $('dashboard-view').hidden = false;
  $('senha').value = '';
  aviso('dashboard-message');
  void carregarLista();
}

function campo(label, value) {
  const wrapper = node('div');
  wrapper.append(
    node('span', label, 'detail-label'),
    node('span', value || 'Não informado', 'detail-value'),
  );
  return wrapper;
}
function secao(title, child) {
  const wrapper = node('section', undefined, 'detail-section');
  wrapper.append(node('h3', title), child);
  return wrapper;
}
function configurarAcoes() {
  if (!selecionado) return;
  const aprovado =
    selecionado.statusVerificacao === 'APROVADO' &&
    selecionado.usuario.status === 'ATIVO';
  $('approve').disabled = busy || aprovado;
  $('approve').textContent = aprovado
    ? 'Perfil aprovado e ativo'
    : 'Aprovar e ativar';
  $('reject').disabled = busy || selecionado.statusVerificacao === 'REJEITADO';
  $('account-action').textContent =
    selecionado.usuario.status === 'ATIVO'
      ? 'Bloquear acesso'
      : 'Reativar acesso';
}
function renderPerfil() {
  const c = selecionado;
  if (!c) return;
  $('detail-title').textContent = 'Perfil do cuidador';
  const person = node('div', undefined, 'detail-person');
  const copy = node('div');
  const badges = node('div', undefined, 'detail-badges');
  badges.append(
    badge(c.statusVerificacao, verificacoes),
    badge(c.usuario.status, contas),
  );
  copy.append(node('strong', nome(c)), node('p', c.usuario.email), badges);
  person.append(node('span', nome(c).charAt(0).toUpperCase(), 'avatar'), copy);
  const grid = node('div', undefined, 'detail-grid');
  grid.append(
    campo('Nome completo', c.usuario.nome),
    campo('CPF', c.cpf),
    campo('Telefone', c.telefone),
    campo('Nascimento', data(c.dataNascimento)),
    campo('Cidade / UF', `${c.endereco.cidade}/${c.endereco.estado}`),
    campo('Cadastrado em', data(c.createdAt)),
  );
  const endereco = node(
    'p',
    `${c.endereco.rua}, ${c.endereco.numero}${c.endereco.complemento ? ` · ${c.endereco.complemento}` : ''} · ${c.endereco.bairro} · CEP ${c.endereco.cep}`,
  );
  const servicos = node('div', undefined, 'detail-grid');
  for (const oferta of c.cuidadorServicos)
    servicos.append(
      campo(
        oferta.servico.nome,
        `${dinheiro(oferta.preco)} · ${oferta.duracaoMinutos} minutos${oferta.ativo ? '' : ' · Inativo'}`,
      ),
    );
  if (!c.cuidadorServicos.length)
    servicos.append(node('p', 'Nenhum serviço oferecido.'));
  const arquivo = node('div', undefined, 'file-card');
  arquivo.append(
    node('span', 'PDF', 'file-mark'),
    node('span', c.curriculo?.nome ?? 'Currículo não enviado', 'file-name'),
  );
  if (c.curriculo) {
    const button = node('button', 'Baixar PDF', 'review-button');
    button.type = 'button';
    button.addEventListener('click', () => {
      void baixar(c.id, button);
    });
    arquivo.append(button);
  }
  const conteudo = [
    person,
    secao('Dados pessoais', grid),
    secao('Endereço', endereco),
    secao('Serviços oferecidos', servicos),
    secao('Currículo', arquivo),
  ];
  if (c.biografia) conteudo.push(secao('Apresentação', node('p', c.biografia)));
  if (c.experienciaProfissional)
    conteudo.push(
      secao('Experiência profissional', node('p', c.experienciaProfissional)),
    );
  $('detail-content').replaceChildren(...conteudo);
  configurarAcoes();
}
function abrirPerfil(cuidador) {
  selecionado = cuidador;
  renderPerfil();
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
}
async function baixar(id, button) {
  button.disabled = true;
  try {
    const blob = await api.curriculo(id);
    const url = URL.createObjectURL(blob);
    const a = node('a');
    a.href = url;
    a.download = `curriculo-${id}.pdf`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    aviso('dashboard-message', error.message, 'error');
  } finally {
    button.disabled = false;
  }
}
function prepararAcao(title, description, action) {
  if (busy) return;
  $('confirm-title').textContent = title;
  $('confirm-description').textContent = description;
  confirmar = action;
  aviso('confirm-error');
  $('confirm-dialog').showModal();
}

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  $('login-button').disabled = true;
  $('login-button').textContent = 'Entrando…';
  aviso('login-message');
  try {
    const sessao = await api.login($('email').value, $('senha').value);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(sessao.usuario.tipoUsuario)) {
      await api.logout(sessao.token).catch(() => undefined);
      throw new Error('Use uma conta administrativa para acessar o painel.');
    }
    guardarToken(sessao.token);
    abrirPainel(sessao.usuario);
  } catch (error) {
    aviso('login-message', error.message, 'error');
  } finally {
    setBusy(false);
    $('login-button').disabled = false;
    $('login-button').textContent = 'Entrar no painel →';
  }
});
$('toggle-password').addEventListener('click', () => {
  const show = $('senha').type === 'password';
  $('senha').type = show ? 'text' : 'password';
  $('toggle-password').textContent = show ? 'Ocultar' : 'Mostrar';
  $('toggle-password').setAttribute(
    'aria-label',
    show ? 'Ocultar senha' : 'Mostrar senha',
  );
});
$('search').addEventListener('input', renderLista);
for (const button of document.querySelectorAll('[data-filter]'))
  button.addEventListener('click', () => {
    filtro = button.dataset.filter;
    renderLista();
  });
$('refresh').addEventListener('click', () => {
  void carregarLista();
});
$('close-detail').addEventListener('click', () => $('detail-dialog').close());
$('cancel-action').addEventListener('click', () => $('confirm-dialog').close());
$('confirm-dialog').addEventListener('cancel', (event) => {
  if (busy) event.preventDefault();
});
$('approve').addEventListener('click', () => {
  const id = selecionado.id;
  prepararAcao(
    'Aprovar e ativar cuidador?',
    `${nome(selecionado)} poderá acessar a conta e aparecer na busca de cuidadores. Confirme após analisar seus dados e currículo.`,
    () => api.verificar(id, 'APROVADO'),
  );
});
$('reject').addEventListener('click', () => {
  const id = selecionado.id;
  prepararAcao(
    'Rejeitar este perfil?',
    `${nome(selecionado)} deixará de aparecer na busca. A conta continuará acessível para acompanhar o cadastro.`,
    () => api.verificar(id, 'REJEITADO'),
  );
});
$('account-action').addEventListener('click', () => {
  const id = selecionado.id;
  const bloquear = selecionado.usuario.status === 'ATIVO';
  prepararAcao(
    bloquear ? 'Bloquear acesso à conta?' : 'Reativar acesso à conta?',
    bloquear
      ? `A sessão de ${nome(selecionado)} será revogada e novos logins serão impedidos.`
      : 'O cuidador poderá entrar novamente. Para aparecer na busca, o perfil também precisa estar aprovado.',
    () => api.conta(id, bloquear ? 'BLOQUEADO' : 'ATIVO'),
  );
});
$('confirm-action').addEventListener('click', async () => {
  if (busy || !confirmar) return;
  setBusy(true);
  aviso('confirm-error');
  try {
    await confirmar();
    $('confirm-dialog').close();
    aviso('dashboard-message', 'Cadastro atualizado com sucesso.', 'success');
    await carregarLista();
  } catch (error) {
    aviso('confirm-error', error.message, 'error');
  } finally {
    setBusy(false);
  }
});
$('logout').addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  try {
    await api.logout();
    limparSessao();
  } catch (error) {
    aviso('dashboard-message', error.message, 'error');
  } finally {
    setBusy(false);
  }
});

if (token) {
  $('login-button').disabled = true;
  aviso('login-message', 'Verificando sua sessão…');
  try {
    const usuario = await api.perfil();
    if (!['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)) {
      await api.logout().catch(() => undefined);
      limparSessao();
      aviso('login-message', 'Use uma conta administrativa.', 'error');
    } else abrirPainel(usuario);
  } catch (error) {
    aviso('login-message', error.message, 'error');
  } finally {
    $('login-button').disabled = false;
  }
}
