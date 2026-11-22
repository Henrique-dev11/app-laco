import type { Contraste } from '../utils/acessibilidade';
import type { Paleta } from './index';

/**
 * Paletas de alto contraste, usadas no lugar da paleta do perfil quando a
 * pessoa liga o contraste na acessibilidade. Mantêm os "papéis" de cada cor
 * do app: `surface` é a cor do texto sobre `primary`/`header` (botões e
 * cabeçalho), então ela sempre contrasta com os dois.
 */
const claro: Omit<Paleta, 'caregiver' | 'responsible' | 'elderly'> = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  input: '#FFFFFF',
  text: '#000000',
  muted: '#2B2B2B',
  border: '#000000',
  primary: '#0033A0',
  primaryDark: '#00195C',
  error: '#9B0000',
  header: '#000000',
  headerSoft: '#2E2E2E',
  onHeader: '#FFFFFF',
  tabInactive: '#D6D6D6',
  badge: '#E3EAFF',
  avatarBg: '#E0E0E0',
  chip: '#EDEDED',
};

const escuro: Omit<Paleta, 'caregiver' | 'responsible' | 'elderly'> = {
  background: '#000000',
  surface: '#000000',
  input: '#000000',
  text: '#FFFFFF',
  muted: '#E6E6E6',
  border: '#9E9E9E',
  primary: '#FFD400',
  primaryDark: '#FFE766',
  error: '#FF8A80',
  header: '#FFD400',
  headerSoft: '#E6BC00',
  onHeader: '#1A1A1A',
  tabInactive: '#3B3200',
  badge: '#262626',
  avatarBg: '#2E2E2E',
  chip: '#1F1F1F',
};

/** Devolve a paleta pedida pelo modo de contraste; `padrao` mantém a do perfil. */
export function aplicarContraste(paleta: Paleta, modo: Contraste): Paleta {
  if (modo === 'padrao') return paleta;
  const base = modo === 'claro' ? claro : escuro;
  return {
    ...base,
    // Todos os botões de perfil assumem a cor de destaque do modo.
    caregiver: base.primary,
    responsible: base.primary,
    elderly: base.primary,
  };
}
