import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
// API simulada: nenhuma alteração é enviada ao backend real.
const root = process.env.MOTION_WEB_DIR ?? join(tmpdir(), 'laco-motion-web');
const artifacts = await mkdtemp(join(tmpdir(), 'laco-motion-ui-'));
const profile = join(artifacts, 'firefox');
await mkdir(profile);
const httpPort = Number(process.env.MOTION_HTTP_PORT ?? 8792);
const browserPort = Number(process.env.MOTION_BROWSER_PORT ?? 8793);
const baseUrl = 'http://127.0.0.1:' + httpPort;
const localEnv = await readFile(
  fileURLToPath(new URL('../../.env', import.meta.url)),
  'utf8',
).catch(() => '');
const sourceApi =
  process.env.EXPO_PUBLIC_API_URL ??
  localEnv.match(/^EXPO_PUBLIC_API_URL=(.*)$/m)?.[1].trim() ??
  baseUrl + '/api';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);
const endereco = {
  rua: 'Rua das Flores',
  numero: '321',
  complemento: '',
  bairro: 'Centro',
  cidade: 'Recife',
  estado: 'PE',
  cep: '50000000',
};
const elder = {
  id: 23,
  nome: 'Godôfredo Garcia',
  nomeSocial: null,
  endereco,
  foto: null,
};
const responsavel = {
  id: 7,
  telefone: '81999998888',
  cpf: '52998224725',
  dataNascimento: '1980-05-20T00:00:00.000Z',
  endereco,
  responsavelIdosos: [{ parentesco: 'PAI', idoso: elder }],
};
let user = {
  id: 1,
  nome: 'Ana Silva',
  nomeSocial: 'Ana',
  email: 'ana@teste.local',
  telefone2: null,
  foto: null,
  tipoUsuario: 'RESPONSAVEL',
  responsavel,
  cuidador: null,
};
const reduced = process.env.REDUCED_MOTION === '1';
const messages = Array.from({ length: 80 }, (_, index) => ({
  id: index + 1,
  remetenteId: 2,
  propostaId: null,
  conteudo:
    'Histórico ' +
    (index + 1) +
    ' — mensagem de teste para leitura da conversa.',
  lidaEm: null,
  createdAt: new Date().toISOString(),
}));
let proposta = {
  id: 7,
  negociacaoId: 'negociacao',
  versao: 1,
  status: 'PENDENTE',
  idosoId: 23,
  total: '50.00',
  observacoes: null,
  resposta: null,
  idoso: elder,
  cuidador: { usuario: { nome: 'Maria Cuidadora' } },
  itens: [],
};
messages.push({
  id: 81,
  remetenteId: 2,
  propostaId: 7,
  conteudo: 'Proposta',
  lidaEm: null,
  createdAt: new Date().toISOString(),
});
let failSend = false,
  failProposal = false,
  failSchedule = false,
  requests = [];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'),
      path = url.pathname;
    if (path.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ path, method: req.method, body });
      const json = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (path === '/api/auth/me') return json(user);
      if (path.startsWith('/api/fotos/')) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(png);
      }
      if (path === '/api/mensagens/conversas')
        return json([
          {
            contato: {
              id: 2,
              nome: 'Maria Cuidadora',
              nomeSocial: null,
              foto: null,
            },
            ultimaMensagem: messages.at(-1),
            naoLidas: 0,
          },
        ]);
      if (path === '/api/mensagens/conversas/2/propostas')
        return json([proposta]);
      if (path === '/api/mensagens/conversas/2/propostas/7/resposta') {
        await delay(350);
        if (failProposal)
          return json(
            { message: 'Proposta não confirmada: conflito simulado.' },
            409,
          );
        proposta = { ...proposta, status: body.status };
        return json(proposta);
      }
      if (path === '/api/mensagens/conversas/2') {
        if (req.method === 'POST') {
          await delay(350);
          if (failSend)
            return json({ message: 'Falha simulada ao enviar.' }, 500);
          const m = {
            id: messages.at(-1).id + 1,
            remetenteId: 1,
            propostaId: null,
            conteudo: body.conteudo,
            lidaEm: null,
            createdAt: new Date().toISOString(),
          };
          messages.push(m);
          return json(m, 201);
        }
        return json(
          messages.filter(
            (m) => m.id > Number(url.searchParams.get('depois') || 0),
          ),
        );
      }
      if (path === '/api/contratacoes/77/horarios') {
        const mes = url.searchParams.get('mes'),
          dia = mes + '-28';
        return json({
          duracaoMinutos: 60,
          datas: [
            {
              data: dia,
              horarios: [
                {
                  inicio: dia + 'T12:00:00.000Z',
                  fim: dia + 'T13:00:00.000Z',
                  horaInicio: '09:00',
                  horaFim: '10:00',
                },
              ],
            },
          ],
        });
      }
      if (path === '/api/contratacoes/77/agendamento') {
        await delay(350);
        return failSchedule
          ? json({ message: 'Horário indisponível: conflito simulado.' }, 409)
          : json({ id: 55 }, 201);
      }
      if (path === '/api/contratacoes')
        return json([
          {
            id: 77,
            status: 'ACEITA',
            valorAcordado: '50.00',
            precoReferencia: '50.00',
            duracaoMinutos: 60,
            nomeServico: 'Companhia',
            itemProposta: null,
            observacoes: null,
            agendamento: null,
            idoso: elder,
            responsavel: { usuario: { nome: 'Ana Silva' } },
            cuidadorServico: {
              cuidador: {
                usuario: { nome: 'Maria Cuidadora' },
                disponibilidades: [],
              },
              servico: { nome: 'Companhia' },
            },
          },
        ]);
      if (path === '/api/catalogo/cuidadores') {
        await delay(500);
        return json([
          {
            id: 8,
            usuario: {
              id: 2,
              nome: 'Maria Cuidadora',
              nomeSocial: null,
              foto: null,
            },
            endereco,
            biografia: 'Cuido com carinho.',
            cuidadorServicos: [],
            disponibilidades: [],
          },
        ]);
      }
      return json([]);
    }
    const file = path === '/' ? '/index.html' : path;
    let contents = await readFile(root + file);
    const ext = file.split('.').at(-1);
    const mime =
      {
        html: 'text/html',
        js: 'application/javascript',
        png: 'image/png',
        ttf: 'font/ttf',
        ico: 'image/x-icon',
      }[ext] || 'application/octet-stream';
    if (ext === 'js') {
      if (
        file.includes('/_expo/static/js/web/index-') &&
        !contents.toString().includes(sourceApi)
      )
        throw new Error(
          'O bundle usa outra URL de API. Exporte novamente com EXPO_PUBLIC_API_URL definido para o teste.',
        );
      contents = Buffer.from(
        contents.toString().replaceAll(sourceApi, baseUrl + '/api'),
      );
    }
    if (ext === 'html')
      contents = Buffer.from(
        contents
          .toString()
          .replace(
            '<head>',
            '<head><script>sessionStorage.setItem("laco.sessao","' +
              'a'.repeat(64) +
              '");</script>',
          ),
      );
    res.writeHead(200, { 'Content-Type': mime });
    res.end(contents);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});
await new Promise((r) => server.listen(httpPort, '127.0.0.1', r));

await writeFile(
  join(profile, 'user.js'),
  'user_pref("ui.prefersReducedMotion",' +
    (reduced ? 1 : 0) +
    ');user_pref("focusmanager.testmode",true);',
);
const ff = spawn(
  process.env.FIREFOX_BIN ?? '/usr/bin/firefox',
  [
    '--headless',
    '--no-remote',
    '--profile',
    profile,
    '--remote-debugging-port',
    String(browserPort),
    'about:blank',
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1' },
  },
);
let launchError;
ff.on('error', (e) => {
  launchError = e;
});
let stderr = '';
ff.stderr.on('data', (d) => (stderr += d));
ff.stdout.on('data', () => {});
let ws;
try {
  for (let i = 0; i < 80; i++) {
    if (launchError) throw launchError;
    try {
      const response = await fetch(
        'http://127.0.0.1:' + browserPort + '/json/version',
      );
      if (response.status) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  ws = new WebSocket('ws://127.0.0.1:' + browserPort + '/session');
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const p = pending.get(data.id);
      pending.delete(data.id);
      data.type === 'error'
        ? p.reject(new Error(JSON.stringify(data)))
        : p.resolve(data.result);
    } else if (data.method === 'log.entryAdded') logs.push(data.params);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  await send('session.new', { capabilities: {} });
  await send('session.subscribe', { events: ['log.entryAdded'] });
  const tree = await send('browsingContext.getTree');
  const context = tree.contexts[0].context;
  const run = async (expression) => {
    const response = await send('script.evaluate', {
      expression: '(async()=>(' + expression + '))()',
      target: { context },
      awaitPromise: true,
    });
    if (response.type === 'exception')
      throw new Error(JSON.stringify(response));
    return response.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 80; i++) {
      if (await run(expression)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(
      'Timeout: ' + expression + '\n' + (await run('document.body.innerText')),
    );
  };
  const click = async (text) =>
    run(
      `(()=>{const e=[...document.querySelectorAll('[role="button"],button')].find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0&&(e.getAttribute('aria-label')===${JSON.stringify(text)}||e.textContent.trim()===${JSON.stringify(text)}));if(!e)throw Error('Botão ausente: '+${JSON.stringify(text)});e.click();return true;})()`,
    );
  const fill = async (label, value) =>
    run(
      `(()=>{const e=document.querySelector('input[aria-label='+CSS.escape(${JSON.stringify(label)})+'],textarea[aria-label='+CSS.escape(${JSON.stringify(label)})+']');if(!e)throw Error('Campo ausente');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`,
    );

  const passed = [];
  const visibleButton = (label) =>
    `[...document.querySelectorAll('[role="button"],button')].find(e=>!e.closest('[aria-hidden="true"]')&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.trim()===${JSON.stringify(label)}))`;
  const screenshots = [];
  const screenshot = async (name) => {
    const shot = await send('browsingContext.captureScreenshot', { context });
    const path = join(artifacts, name + '.png');
    await writeFile(path, Buffer.from(shot.data, 'base64'));
    screenshots.push(path);
  };
  const chatLayout = async (proposal = false) => {
    const bounds = JSON.parse(
      await run(
        `JSON.stringify((()=>{
          const input=document.querySelector('textarea[aria-label="Mensagem"]');
          const rect=e=>{if(!e)throw Error('Controle ausente');const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
          const list=[...document.querySelectorAll('div')].find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+100&&!e.closest('[aria-hidden="true"]'));
          return {width:innerWidth,height:innerHeight,input:rect(input),bar:rect(input.parentElement),send:rect(${visibleButton('Enviar mensagem')}),list:rect(list),proposal:${proposal ? `rect(${visibleButton('Opções de proposta')})` : 'null'}};
        })())`,
      ),
    );
    for (const control of [bounds.input, bounds.send, bounds.proposal].filter(Boolean)) {
      assert.ok(control.top >= 0 && control.bottom <= bounds.height + 1, JSON.stringify(bounds));
      assert.ok(control.left >= 0 && control.right <= bounds.width + 1, JSON.stringify(bounds));
      assert.ok(control.height >= 44, JSON.stringify(bounds));
    }
    assert.ok(Math.abs(bounds.bar.bottom - bounds.height) <= 1, JSON.stringify(bounds));
    assert.ok(bounds.list.height > 40, JSON.stringify(bounds));
    assert.ok(bounds.list.bottom <= bounds.bar.top + 1, JSON.stringify(bounds));
    return bounds;
  };
  await send('browsingContext.setViewport', {
    context,
    viewport: { width: 390, height: 844 },
    devicePixelRatio: 1,
  });
  await send('browsingContext.navigate', {
    context,
    url: baseUrl + '/',
    wait: 'complete',
  });
  await wait(`document.querySelector('[aria-label="Perfil"]')!==null`);
  assert.equal(
    await run(`matchMedia('(prefers-reduced-motion: reduce)').matches`),
    reduced,
  );
  await delay(400);
  // Pointer stays down while the actual rendered transform is measured.
  const rect = JSON.parse(
    await run(
      `JSON.stringify((()=>{const r=(${visibleButton('Perfil')}).getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})())`,
    ),
  );
  await send('input.performActions', {
    context,
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
          { type: 'pointerMove', origin: 'viewport', ...rect },
          { type: 'pointerDown', button: 0 },
        ],
      },
    ],
  });
  await delay(160);
  const scale = await run(
    `new DOMMatrix(getComputedStyle(${visibleButton('Perfil')}).transform).a`,
  );
  assert.ok(
    reduced ? scale === 1 : scale < 0.99,
    'escala ao pressionar: ' + scale,
  );
  await send('input.performActions', {
    context,
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [{ type: 'pointerUp', button: 0 }],
      },
    ],
  });
  await wait(`document.body.innerText.includes('Meu perfil')`);
  passed.push('toque real e navegação de aba');
  await click('Editar perfil');
  await wait(`document.querySelector('input[aria-label="Nome completo*"]')`);
  await delay(300);
  const beforeFocus = await run(
    `document.querySelector('input[aria-label="Nome completo*"]').getBoundingClientRect().height`,
  );
  // Sem uma janela do sistema, o foco do Firefox também precisa do evento explícito abaixo.
  await send('browsingContext.activate', { context });
  const inputRect = JSON.parse(
    await run(
      `JSON.stringify((()=>{const e=document.querySelector('input[aria-label="Nome completo*"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})())`,
    ),
  );
  await send('input.performActions', {
    context,
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
          { type: 'pointerMove', origin: 'viewport', ...inputRect },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ],
  });
  await run(
    `document.querySelector('input[aria-label="Nome completo*"]').dispatchEvent(new FocusEvent('focusin',{bubbles:true}))`,
  );
  await delay(300);
  const focus = JSON.parse(
    await run(
      `JSON.stringify((()=>{const input=document.querySelector('input[aria-label="Nome completo*"]');return {height:input.getBoundingClientRect().height,outline:getComputedStyle(input.previousElementSibling).opacity,active:document.activeElement===input};})())`,
    ),
  );
  assert.equal(beforeFocus, focus.height);
  assert.equal(Number(focus.outline), 1);
  passed.push('foco sem deslocar o campo');
  const heights = JSON.parse(
    await run(
      `JSON.stringify(await (async()=>{(${visibleButton('Alterar foto de perfil')}).click();const values=[];for(let i=0;i<20;i++){await new Promise(r=>requestAnimationFrame(r));const e=${visibleButton('Tirar foto')};if(e)values.push(e.parentElement.parentElement.getBoundingClientRect().height);}return values;})())`,
    ),
  );
  assert.ok(heights.length > 0);
  assert.ok(
    reduced || new Set(heights.map(Math.round)).size > 3,
    'expansão deve ter quadros intermediários: ' + heights,
  );
  await click('Alterar foto de perfil');
  await delay(300);
  assert.equal(await run(`!!(${visibleButton('Tirar foto')})`), false);
  passed.push('opções de foto expandem e recolhem');
  await click('Cancelar');
  await click('Início');
  await click('Buscar');
  await wait(
    `!!document.querySelector('[role="progressbar"][aria-label="Carregando informações"]')`,
  );
  await wait(
    `!!document.querySelector('[aria-label="Ver detalhes de Maria Cuidadora"]')`,
  );
  await click('Ver detalhes de Maria Cuidadora');
  await wait(`!!document.querySelector('[role="dialog"]')`);
  await screenshot(reduced ? 'laco-motion-reduced-modal' : 'laco-motion-modal');
  await click('Fechar');
  passed.push('skeleton e detalhes do cuidador');
  await click('Início');
  await click('Histórico');
  await wait(`document.body.innerText.includes('Agendar atendimento')`);
  await click('Agendar atendimento');
  await wait(`document.body.innerText.includes('Próximo mês')`);
  await click('Próximo mês');
  await delay(250);
  assert.equal(
    await run(
      `Number(getComputedStyle(${visibleButton('Confirmar agendamento')}).opacity)`,
    ),
    0.5,
  );
  const dateLabel = await run(
    `[...document.querySelectorAll('[aria-label^="Agendar em "]')].find(e=>e.getAttribute('aria-disabled')!=='true').getAttribute('aria-label')`,
  );
  await click(dateLabel);
  await click('09:00 às 10:00');
  failSchedule = true;
  await click('Confirmar agendamento');
  await wait(
    `document.body.innerText.includes('Horário indisponível: conflito simulado.')`,
  );
  assert.equal(
    await run(`document.body.innerText.includes('Atendimento confirmado.')`),
    false,
  );
  await click(dateLabel);
  await click('09:00 às 10:00');
  failSchedule = false;
  await click('Confirmar agendamento');
  await wait(`document.body.innerText.includes('Atendimento confirmado.')`);
  passed.push('mês e seleção de horário, erro e confirmação conforme a API');
  await click('Mensagens');
  await wait(
    `!!document.querySelector('[aria-label="Abrir conversa com Maria Cuidadora"]')`,
  );
  await click('Abrir conversa com Maria Cuidadora');
  await wait(`document.body.innerText.includes('PROPOSTA DE ATENDIMENTO')`);
  await delay(350);
  const fullChat = await chatLayout();
  for (const viewport of [{ width: 390, height: 500 }, { width: 320, height: 400 }]) {
    await send('browsingContext.setViewport', { context, viewport, devicePixelRatio: 1 });
    await delay(250);
    await fill('Mensagem', 'Rascunho com várias linhas\nSegunda linha\nTerceira linha');
    const compactChat = await chatLayout();
    assert.ok(compactChat.list.height < fullChat.list.height);
  }
  await screenshot(reduced ? 'laco-chat-compact-reduced' : 'laco-chat-compact');
  await send('browsingContext.setViewport', {
    context, viewport: { width: 390, height: 844 }, devicePixelRatio: 1,
  });
  await delay(250);
  const restoredChat = await chatLayout();
  assert.ok(Math.abs(restoredChat.bar.bottom - fullChat.bar.bottom) < 1);
  assert.equal(await run(`document.querySelector('textarea[aria-label="Mensagem"]').value`),
    'Rascunho com várias linhas\nSegunda linha\nTerceira linha');
  await fill('Mensagem', '');
  passed.push('chat ajusta lista e mantém digitação e envio em alturas reduzidas');
  // A rejected proposal must retain its real pending status and the user's response.
  await fill('Alterações desejadas ou motivo da resposta', 'Pode confirmar');
  failProposal = true;
  await click('Aceitar proposta');
  await wait(
    `document.body.innerText.includes('Proposta não confirmada: conflito simulado.')`,
  );
  assert.equal(
    await run(`document.body.innerText.includes('Aguardando confirmação')`),
    true,
  );
  assert.equal(
    await run(
      `document.querySelector('textarea[aria-label="Alterações desejadas ou motivo da resposta"]').value`,
    ),
    'Pode confirmar',
  );
  failProposal = false;
  await click('Aceitar proposta');
  await wait(`document.body.innerText.includes('Ver atendimentos na agenda')`);
  passed.push('proposta só altera o status após resposta da API');
  await run(
    `(()=>{const e=[...document.querySelectorAll('div')].find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+400&&!e.closest('[aria-hidden="true"]'));if(!e)throw Error('Lista ausente');window.chatScroll=e;e.scrollTop=550;e.dispatchEvent(new Event('scroll'));return true;})()`,
  );
  await delay(200);
  const anchor = JSON.parse(
    await run(
      `JSON.stringify((()=>{const e=[...document.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent.startsWith('Histórico ')&&e.getBoundingClientRect().top>120&&e.getBoundingClientRect().bottom<650);if(!e)throw Error('Balão de referência ausente');window.anchorText=e.textContent;return {text:e.textContent,top:e.getBoundingClientRect().top,offset:chatScroll.scrollTop,client:chatScroll.clientHeight,content:chatScroll.scrollHeight,css:getComputedStyle(chatScroll).overflowAnchor};})())`,
    ),
  );
  messages.push({
    id: 82,
    remetenteId: 2,
    propostaId: null,
    conteudo: 'Nova mensagem recebida',
    lidaEm: null,
    createdAt: new Date().toISOString(),
  });
  await wait(`document.body.innerText.includes('1 nova mensagem')`);
  await delay(400);
  const after = JSON.parse(
    await run(
      `JSON.stringify((()=>{const e=[...document.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent===anchorText);return {top:e?.getBoundingClientRect().top,offset:chatScroll.scrollTop,client:chatScroll.clientHeight,content:chatScroll.scrollHeight,css:getComputedStyle(chatScroll).overflowAnchor};})())`,
    ),
  );
  assert.ok(
    Math.abs(after.top - anchor.top) < 5,
    'histórico saltou: ' + JSON.stringify({ anchor, after }),
  );
  await click('1 nova mensagem');
  await delay(200);
  assert.ok(await run(`chatScroll.scrollTop<10`));
  passed.push('recebimento mantém ancoragem do histórico');
  await fill('Mensagem', 'Mensagem preservada');
  failSend = true;
  await click('Enviar mensagem');
  await wait(`document.body.innerText.includes('Falha simulada ao enviar.')`);
  assert.equal(
    await run(
      `document.querySelector('textarea[aria-label="Mensagem"]').value`,
    ),
    'Mensagem preservada',
  );
  assert.equal(
    messages.filter((m) => m.conteudo === 'Mensagem preservada').length,
    0,
  );
  failSend = false;
  await click('Enviar mensagem');
  await wait(
    `document.querySelector('[aria-label="Enviar mensagem"]').getAttribute('aria-busy')==='true'`,
  );
  assert.equal(
    messages.filter((m) => m.conteudo === 'Mensagem preservada').length,
    0,
  );
  await wait(
    `document.querySelector('textarea[aria-label="Mensagem"]').value===''`,
  );
  assert.equal(
    messages.filter((m) => m.conteudo === 'Mensagem preservada').length,
    1,
  );
  passed.push(
    'envio com falha preserva texto e envio confirmado sem duplicação',
  );
  await screenshot(reduced ? 'laco-motion-reduced-chat' : 'laco-motion-chat');
  user = {
    ...user,
    tipoUsuario: 'CUIDADOR',
    responsavel: null,
    cuidador: {
      ...responsavel,
      id: 8,
      statusVerificacao: 'PENDENTE',
      cuidadorServicos: [],
      curriculo: null,
    },
  };
  await send('browsingContext.setViewport', {
    context,
    viewport: { width: 1440, height: 900 },
    devicePixelRatio: 1,
  });
  await send('browsingContext.navigate', {
    context,
    url: baseUrl + '/',
    wait: 'complete',
  });
  await wait(`!!document.querySelector('[aria-label="Mensagens"]')`);
  await click('Mensagens');
  await wait(
    `!!document.querySelector('[aria-label="Abrir conversa com Maria Cuidadora"]')`,
  );
  await click('Abrir conversa com Maria Cuidadora');
  await wait(`!!document.querySelector('[aria-label="Opções de proposta"]')`);
  await click('Opções de proposta');
  await wait(
    `document.body.innerText.includes('Criar proposta de atendimento')`,
  );
  await delay(300);
  await click('Opções de proposta');
  await delay(300);
  assert.equal(
    await run(`!!(${visibleButton('Criar proposta de atendimento')})`),
    false,
  );
  passed.push('menu de proposta em desktop');
  // Espaço equivalente ao viewport reduzido, sem simular um teclado nativo.
  await send('browsingContext.setViewport', {
    context, viewport: { width: 320, height: 400 }, devicePixelRatio: 1,
  });
  await delay(250);
  await fill('Mensagem', 'Mensagem durante a proposta');
  const beforeMenu = await chatLayout(true);
  await click('Opções de proposta');
  await delay(350);
  const withMenu = await chatLayout(true);
  assert.ok(withMenu.list.height < beforeMenu.list.height);
  const proposalButton = JSON.parse(await run(
    `JSON.stringify((()=>{const r=(${visibleButton('Criar proposta de atendimento')}).getBoundingClientRect();return {top:r.top,bottom:r.bottom};})())`,
  ));
  assert.ok(proposalButton.top >= 0 && proposalButton.bottom <= withMenu.bar.top);
  await screenshot(reduced ? 'laco-chat-proposal-compact-reduced' : 'laco-chat-proposal-compact');
  await click('Opções de proposta');
  await delay(350);
  const afterMenu = await chatLayout(true);
  assert.ok(Math.abs(afterMenu.list.height - beforeMenu.list.height) < 1);
  assert.equal(await run(`document.querySelector('textarea[aria-label="Mensagem"]').value`),
    'Mensagem durante a proposta');
  passed.push('proposta, campo e envio acessíveis em 320 × 400 sem perder rascunho');
  assert.equal(
    await run('document.documentElement.scrollWidth>innerWidth'),
    false,
  );
  const errors = logs.filter((l) => l.level === 'error');
  assert.deepEqual(
    errors.map((l) => l.text),
    [],
  );
  console.log(
    JSON.stringify({ reduced, passed, errors: [], screenshots }, null, 2),
  );
  await send('session.end');
} finally {
  if (ws) ws.close();
  ff.kill('SIGTERM');
  server.close();
  if (stderr && !ws) console.log(stderr);
}
