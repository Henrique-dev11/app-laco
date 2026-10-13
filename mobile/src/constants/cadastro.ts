import { colors } from '../theme';
import type { Perfil } from '../types/cadastro';

// Opções visuais do projeto original, independentes do catálogo da API.
export const servicosCadastro = [
  'Rotina diária',
  'Fisioterapia',
  'Acompanhamento a exames',
  'Cuidados noturnos',
];

export const perfis = {
  responsavel: {
    titulo: 'Responsável',
    color: colors.responsible,
    logo: require('../../assets/laco/logo-register-responsible.png'),
    icon: require('../../assets/laco/profile-responsible.png'),
    etapas: 3,
  },
  cuidador: {
    titulo: 'Cuidador',
    color: colors.caregiver,
    logo: require('../../assets/laco/logo-register.png'),
    icon: require('../../assets/laco/profile-caregiver.png'),
    etapas: 2,
  },
  idoso: {
    titulo: 'Idoso',
    color: colors.elderly,
    logo: require('../../assets/laco/logo-register.png'),
    icon: require('../../assets/laco/profile-elderly.png'),
    etapas: 2,
  },
} satisfies Record<
  Perfil,
  { titulo: string; color: string; logo: number; icon: number; etapas: number }
>;
