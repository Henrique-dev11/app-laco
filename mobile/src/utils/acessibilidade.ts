/**
 * Regras puras da acessibilidade (sem React/React Native), testadas em
 * `test/acessibilidade.test.mjs`. O estado e a interface ficam em
 * `src/accessibility/`.
 */
export type Contraste = 'padrao' | 'claro' | 'escuro';
export type VelocidadeVoz = 'lenta' | 'normal' | 'rapida';
export type PosicaoBotao = 'esquerda' | 'direita';

export type Preferencias = {
  /** Multiplicador aplicado sobre a escala de fontes do app (`fs`). */
  escalaFonte: number;
  contraste: Contraste;
  negrito: boolean;
  /** Entrelinhas ampliadas, para leitura mais confortável. */
  espacamentoLinhas: boolean;
  reduzirAnimacoes: boolean;
  velocidadeVoz: VelocidadeVoz;
  posicaoBotao: PosicaoBotao;
  leituraPorToque?: boolean;
  botaoOculto?: boolean;
  pontoBotao?: { x: number; y: number };
};

/** Medidas do botão fixo de acessibilidade (px). */
export const TAMANHO_BOTAO = 56;
export const MARGEM_BOTAO = 16;
/**
 * Espaço que as telas reservam no fim da rolagem, para o último conteúdo poder
 * ser rolado para fora de trás do botão.
 */
export const ESPACO_BOTAO = TAMANHO_BOTAO + MARGEM_BOTAO;

export const ESCALAS_FONTE = [1, 1.15, 1.3, 1.5, 1.75] as const;

export const PREFERENCIAS_PADRAO: Preferencias = {
  escalaFonte: 1,
  contraste: 'padrao',
  negrito: false,
  espacamentoLinhas: false,
  reduzirAnimacoes: false,
  velocidadeVoz: 'normal',
  posicaoBotao: 'direita',
};

/** Velocidade de fala (1 = normal) usada pelo expo-speech. */
export const TAXA_VOZ: Record<VelocidadeVoz, number> = {
  lenta: 0.7,
  normal: 1,
  rapida: 1.3,
};

const contrastes: Contraste[] = ['padrao', 'claro', 'escuro'];
const velocidades: VelocidadeVoz[] = ['lenta', 'normal', 'rapida'];
const posicoes: PosicaoBotao[] = ['esquerda', 'direita'];

/**
 * Valida o que foi lido do armazenamento: qualquer valor inesperado (dado
 * antigo, corrompido ou editado) cai no padrão, sem quebrar o app.
 */
export function normalizarPreferencias(bruto: unknown): Preferencias {
  const dados = (
    bruto && typeof bruto === 'object' ? bruto : {}
  ) as Record<string, unknown>;
  const padrao = PREFERENCIAS_PADRAO;
  const ponto = dados.pontoBotao as { x?: unknown; y?: unknown } | undefined;
  const coordenadaValida = (valor: unknown): valor is number =>
    typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1;
  return {
    escalaFonte: (ESCALAS_FONTE as readonly number[]).includes(
      dados.escalaFonte as number,
    )
      ? (dados.escalaFonte as number)
      : padrao.escalaFonte,
    contraste: contrastes.includes(dados.contraste as Contraste)
      ? (dados.contraste as Contraste)
      : padrao.contraste,
    negrito: typeof dados.negrito === 'boolean' ? dados.negrito : padrao.negrito,
    espacamentoLinhas:
      typeof dados.espacamentoLinhas === 'boolean'
        ? dados.espacamentoLinhas
        : padrao.espacamentoLinhas,
    reduzirAnimacoes:
      typeof dados.reduzirAnimacoes === 'boolean'
        ? dados.reduzirAnimacoes
        : padrao.reduzirAnimacoes,
    velocidadeVoz: velocidades.includes(dados.velocidadeVoz as VelocidadeVoz)
      ? (dados.velocidadeVoz as VelocidadeVoz)
      : padrao.velocidadeVoz,
    ...(dados.leituraPorToque === true ? { leituraPorToque: true } : {}),
    ...(dados.botaoOculto === true ? { botaoOculto: true } : {}),
    ...(coordenadaValida(ponto?.x) && coordenadaValida(ponto?.y)
      ? { pontoBotao: { x: ponto.x, y: ponto.y } }
      : {}),
    posicaoBotao: posicoes.includes(dados.posicaoBotao as PosicaoBotao)
      ? (dados.posicaoBotao as PosicaoBotao)
      : padrao.posicaoBotao,
  };
}

export const rotuloEscala = (escala: number) => `${Math.round(escala * 100)}%`;

/** Próximo/anterior degrau da escala, sem sair dos limites. */
export function passoEscala(escala: number, delta: 1 | -1) {
  const atual = Math.max(
    0,
    (ESCALAS_FONTE as readonly number[]).indexOf(escala),
  );
  const proximo = Math.min(ESCALAS_FONTE.length - 1, Math.max(0, atual + delta));
  return ESCALAS_FONTE[proximo];
}

type EstiloTexto = {
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: string | number;
};

const TAMANHO_PADRAO_RN = 14;
const ENTRELINHA_AMPLA = 1.6;

const pesoNumerico = (peso: EstiloTexto['fontWeight']) =>
  peso === 'bold' ? 700 : peso === 'normal' || peso === undefined ? 400 : Number(peso) || 400;

/**
 * Calcula só os campos de estilo que as preferências alteram (tamanho, entrelinha
 * e peso), a partir do estilo já achatado do texto. `raiz` indica que o texto
 * não está dentro de outro `Text`; só nesse caso o tamanho padrão do RN precisa
 * ser ampliado, pois um texto aninhado herda o tamanho do pai.
 */
export function ajustarEstiloTexto(
  estilo: EstiloTexto,
  prefs: Pick<Preferencias, 'escalaFonte' | 'negrito' | 'espacamentoLinhas'>,
  raiz = true,
): EstiloTexto {
  const resultado: EstiloTexto = {};
  const tamanhoBase =
    estilo.fontSize ?? (raiz ? TAMANHO_PADRAO_RN : undefined);
  const tamanho =
    tamanhoBase === undefined
      ? undefined
      : Math.round(tamanhoBase * prefs.escalaFonte);
  if (tamanho !== undefined && prefs.escalaFonte !== 1)
    resultado.fontSize = tamanho;
  let entrelinha =
    estilo.lineHeight !== undefined
      ? Math.round(estilo.lineHeight * prefs.escalaFonte)
      : undefined;
  if (prefs.espacamentoLinhas) {
    const referencia = tamanho ?? estilo.fontSize;
    if (referencia !== undefined)
      entrelinha = Math.max(
        entrelinha ?? 0,
        Math.round(referencia * ENTRELINHA_AMPLA),
      );
  }
  if (entrelinha !== undefined && entrelinha !== estilo.lineHeight)
    resultado.lineHeight = entrelinha;
  if (prefs.negrito && pesoNumerico(estilo.fontWeight) < 700)
    resultado.fontWeight = '700';
  return resultado;
}

/** Junta o texto de `children` (strings, números, textos aninhados). */
export function extrairTexto(no: unknown): string {
  if (no === null || no === undefined || typeof no === 'boolean') return '';
  if (typeof no === 'string' || typeof no === 'number') return String(no);
  if (Array.isArray(no)) return no.map(extrairTexto).join('');
  if (typeof no === 'object' && 'props' in no)
    return extrairTexto((no as { props?: { children?: unknown } }).props?.children);
  return '';
}

export type ItemLeitura = { texto: string; x: number; y: number };

/** Ordem natural de leitura: de cima para baixo e, na mesma linha, da esquerda para a direita. */
export function ordenarLeitura<T extends ItemLeitura>(itens: T[]): T[] {
  const linha = (item: T) => Math.round(item.y / 12);
  return [...itens].sort((a, b) => linha(a) - linha(b) || a.x - b.x);
}

/**
 * Prepara a lista de textos para a voz: limpa espaços, remove repetições
 * seguidas e garante uma pausa (pontuação) entre trechos.
 */
export function textoParaFala(textos: string[]) {
  const partes: string[] = [];
  for (const bruto of textos) {
    const texto = bruto.replace(/\s+/g, ' ').trim();
    if (!texto || texto === partes[partes.length - 1]) continue;
    partes.push(texto);
  }
  return partes.map((p) => (/[.!?…:;]$/.test(p) ? p : `${p}.`)).join(' ');
}

/**
 * Divide o texto em trechos de até `maximo` caracteres, cortando em final de
 * frase (ou de palavra), porque os motores de voz têm limite por fala e
 * alguns navegadores interrompem falas longas.
 */
export function dividirFala(texto: string, maximo: number) {
  const trechos: string[] = [];
  let resto = texto.trim();
  while (resto.length > maximo) {
    const janela = resto.slice(0, maximo);
    let corte = Math.max(
      janela.lastIndexOf('. '),
      janela.lastIndexOf('! '),
      janela.lastIndexOf('? '),
    );
    if (corte < maximo * 0.4) corte = janela.lastIndexOf(' ');
    if (corte <= 0) corte = maximo - 1;
    trechos.push(resto.slice(0, corte + 1).trim());
    resto = resto.slice(corte + 1).trim();
  }
  if (resto) trechos.push(resto);
  return trechos;
}
