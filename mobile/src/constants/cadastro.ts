import type { Perfil } from '../types/cadastro';

export const perfis = {
  responsavel: {
    titulo: 'Responsável',
    logo: require('../../assets/laco/logo-register-responsible.png'),
    icon: require('../../assets/laco/profile-responsible.png'),
    etapas: 3,
  },
  cuidador: {
    titulo: 'Cuidador',
    logo: require('../../assets/laco/logo-register.png'),
    icon: require('../../assets/laco/profile-caregiver.png'),
    etapas: 4,
  },
  idoso: {
    titulo: 'Idoso Independente',
    logo: require('../../assets/laco/logo-register.png'),
    icon: require('../../assets/laco/profile-elderly.png'),
    etapas: 2,
  },
} satisfies Record<
  Perfil,
  { titulo: string; logo: number; icon: number; etapas: number }
>;
