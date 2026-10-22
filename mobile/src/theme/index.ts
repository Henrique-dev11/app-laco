/**
 * Paleta do Laço.
 *
 * `colors` é a paleta neutra (telas de login e cadastro). Depois do login o app
 * usa uma paleta derivada da cor do botão de cadastro de cada perfil
 * (`criarPaleta`), servida pelo ThemeProvider — veja `theme/ThemeContext.tsx`.
 */
export type Paleta = {
  background: string;
  surface: string;
  input: string;
  /** Texto principal (escuro). */
  text: string;
  muted: string;
  border: string;
  /** Cor de destaque: botões, links, seleção. */
  primary: string;
  primaryDark: string;
  error: string;
  /** Fundo do cabeçalho e da barra inferior. */
  header: string;
  /** Elementos sobre o cabeçalho (botão voltar, sino). */
  headerSoft: string;
  /** Texto secundário sobre o cabeçalho. */
  onHeader: string;
  /** Ícone/rótulo inativo da barra inferior. */
  tabInactive: string;
  badge: string;
  avatarBg: string;
  chip: string;
  // Cores dos botões de cadastro de cada perfil (base das paletas por perfil).
  caregiver: string;
  responsible: string;
  elderly: string;
};

const cadastro = {
  caregiver: '#B26398',
  responsible: '#7E5896',
  elderly: '#3E2139',
};

export const colors: Paleta = {
  background: '#F9F4F7',
  surface: '#FFFFFF',
  input: '#FBF7FC',
  text: '#3E2139',
  muted: '#7D6C77',
  border: '#E5D9EC',
  primary: '#8B5CA6',
  primaryDark: '#5C2D6B',
  error: '#B3261E',
  header: '#3E2139',
  headerSoft: '#5C2D51',
  onHeader: '#E0D4DC',
  tabInactive: '#CFBECD',
  badge: '#F0E7F4',
  avatarBg: '#EADDEC',
  chip: '#EFEBF0',
  ...cadastro,
};

function hexParaHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

function hsl(h: number, s: number, l: number) {
  const sat = Math.min(Math.max(s, 0), 100) / 100;
  const lig = Math.min(Math.max(l, 0), 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) =>
    lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    '#' +
    [f(0), f(8), f(4)]
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  ).toUpperCase();
}

/** Deriva uma paleta completa a partir da cor do botão de cadastro do perfil. */
export function criarPaleta(base: string): Paleta {
  const [h, s, l] = hexParaHsl(base);
  const headerL = Math.max(Math.min(l * 0.6, 30), 16);
  const headerS = Math.min(s * 0.9, 55);
  return {
    ...colors,
    primary: base,
    primaryDark: hsl(h, s, Math.max(l * 0.65, 12)),
    header: hsl(h, headerS, headerL),
    headerSoft: hsl(h, headerS, headerL + 9),
    onHeader: hsl(h, 30, 88),
    tabInactive: hsl(h, 22, 76),
    text: hsl(h, 35, 15),
    muted: hsl(h, 12, 42),
    background: hsl(h, 35, 96),
    input: hsl(h, 45, 97.5),
    border: hsl(h, 30, 88),
    badge: hsl(h, 38, 93),
    avatarBg: hsl(h, 32, 88),
    chip: hsl(h, 18, 94),
  };
}

export const paletas = {
  responsavel: criarPaleta(cadastro.responsible),
  cuidador: criarPaleta(cadastro.caregiver),
  idoso: criarPaleta(cadastro.elderly),
} as const;
