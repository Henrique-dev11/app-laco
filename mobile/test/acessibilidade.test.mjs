import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESCALAS_FONTE,
  ESPACO_BOTAO,
  MARGEM_BOTAO,
  TAMANHO_BOTAO,
  PREFERENCIAS_PADRAO,
  ajustarEstiloTexto,
  dividirFala,
  extrairTexto,
  normalizarPreferencias,
  ordenarLeitura,
  passoEscala,
  rotuloEscala,
  textoParaFala,
} from '../src/utils/acessibilidade.ts';
import { aplicarContraste } from '../src/theme/contraste.ts';
import { colors, corDoPerfil, paletas } from '../src/theme/index.ts';

const prefs = (parcial = {}) => ({ ...PREFERENCIAS_PADRAO, ...parcial });

test('preferências inválidas ou antigas caem no padrão', () => {
  assert.deepEqual(normalizarPreferencias(null), PREFERENCIAS_PADRAO);
  assert.deepEqual(normalizarPreferencias('x'), PREFERENCIAS_PADRAO);
  assert.deepEqual(
    normalizarPreferencias({ escalaFonte: 9, contraste: 'neon', negrito: 1 }),
    PREFERENCIAS_PADRAO,
  );
  assert.deepEqual(
    normalizarPreferencias({ escalaFonte: 1.5, contraste: 'escuro', negrito: true }),
    { ...PREFERENCIAS_PADRAO, escalaFonte: 1.5, contraste: 'escuro', negrito: true },
  );
});

test('a escala de fonte anda por degraus e respeita os limites', () => {
  assert.equal(passoEscala(1, 1), 1.15);
  assert.equal(passoEscala(1, -1), 1);
  assert.equal(passoEscala(ESCALAS_FONTE.at(-1), 1), ESCALAS_FONTE.at(-1));
  assert.equal(rotuloEscala(1.15), '115%');
});

test('sem preferências o estilo do texto não muda', () => {
  assert.deepEqual(ajustarEstiloTexto({ fontSize: 18, lineHeight: 24 }, prefs()), {});
});

test('a escala amplia tamanho e entrelinha na mesma proporção', () => {
  assert.deepEqual(
    ajustarEstiloTexto({ fontSize: 20, lineHeight: 30 }, prefs({ escalaFonte: 1.5 })),
    { fontSize: 30, lineHeight: 45 },
  );
});

test('texto sem tamanho cresce a partir do padrão só se não estiver aninhado', () => {
  const p = prefs({ escalaFonte: 1.5 });
  assert.deepEqual(ajustarEstiloTexto({}, p, true), { fontSize: 21 });
  assert.deepEqual(ajustarEstiloTexto({}, p, false), {});
});

test('negrito e entrelinha ampla', () => {
  assert.deepEqual(
    ajustarEstiloTexto({ fontSize: 10, fontWeight: '400' }, prefs({ negrito: true })),
    { fontWeight: '700' },
  );
  assert.deepEqual(
    ajustarEstiloTexto({ fontSize: 10, fontWeight: '800' }, prefs({ negrito: true })),
    {},
  );
  assert.deepEqual(
    ajustarEstiloTexto({ fontSize: 20 }, prefs({ espacamentoLinhas: true })),
    { lineHeight: 32 },
  );
});

test('extrai o texto de strings, números e textos aninhados', () => {
  const aninhado = { props: { children: ['Entre', ' agora'] } };
  assert.equal(extrairTexto(['Olá, ', 3, null, false, aninhado]), 'Olá, 3Entre agora');
});

test('a leitura segue de cima para baixo e da esquerda para a direita', () => {
  const itens = [
    { texto: 'C', x: 10, y: 200 },
    { texto: 'B', x: 150, y: 101 },
    { texto: 'A', x: 10, y: 100 },
  ];
  assert.deepEqual(ordenarLeitura(itens).map((i) => i.texto), ['A', 'B', 'C']);
});

test('o texto falado ganha pausas e não repete trechos seguidos', () => {
  assert.equal(
    textoParaFala(['Olá', '  Olá ', 'Como vai?', '', 'Tudo bem']),
    'Olá. Como vai? Tudo bem.',
  );
});

test('falas longas são divididas em trechos sem perder conteúdo', () => {
  const frase = 'Esta é uma frase de teste. ';
  const texto = frase.repeat(40).trim();
  const trechos = dividirFala(texto, 100);
  assert.ok(trechos.length > 1);
  assert.ok(trechos.every((t) => t.length <= 100));
  assert.equal(trechos.join(' '), texto);
  assert.deepEqual(dividirFala('curto', 100), ['curto']);
});

// ----- Contraste (WCAG 2.1) -----
function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}
function razao(a, b) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

test('o modo padrão mantém a paleta do perfil', () => {
  assert.equal(aplicarContraste(paletas.cuidador, 'padrao'), paletas.cuidador);
  assert.equal(corDoPerfil(colors, 'cuidador'), colors.caregiver);
});

for (const modo of ['claro', 'escuro']) {
  test(`alto contraste ${modo}: pares de cores atendem WCAG AAA (7:1) no texto`, () => {
    const p = aplicarContraste(paletas.responsavel, modo);
    const textos = [
      ['text', 'background'],
      ['text', 'surface'],
      ['muted', 'background'],
      ['primaryDark', 'background'],
      ['primaryDark', 'badge'],
      ['primaryDark', 'chip'],
      ['primaryDark', 'avatarBg'],
      ['error', 'background'],
      // `surface` é o texto de botões, cabeçalho e barra inferior.
      ['surface', 'primary'],
      ['surface', 'header'],
      ['surface', 'headerSoft'],
      ['surface', 'error'],
      ['onHeader', 'header'],
    ];
    for (const [fg, bg] of textos)
      assert.ok(
        razao(p[fg], p[bg]) >= 7,
        `${fg} sobre ${bg}: ${razao(p[fg], p[bg]).toFixed(2)}`,
      );
    // Elementos que não são texto (bordas, ícones) pedem 3:1.
    for (const [fg, bg] of [
      ['border', 'background'],
      ['tabInactive', 'header'],
      ['primary', 'background'],
    ])
      assert.ok(razao(p[fg], p[bg]) >= 3, `${fg} sobre ${bg}`);
  });
}

test('alto contraste: todo botão de perfil usa a cor de destaque do modo', () => {
  const p = aplicarContraste(paletas.idoso, 'escuro');
  for (const perfil of ['cuidador', 'responsavel', 'idoso'])
    assert.equal(corDoPerfil(p, perfil), p.primary);
});

test('o espaço reservado no fim da rolagem cobre o botão fixo e sua margem', () => {
  assert.equal(ESPACO_BOTAO, TAMANHO_BOTAO + MARGEM_BOTAO);
  assert.ok(TAMANHO_BOTAO >= 48, 'alvo de toque de pelo menos 48px');
});
