import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ResumoPerfil } from './cadastro';

export type RootStackParamList = {
  LoginType: undefined;
  Login: undefined;
  ResponsavelStep1: undefined;
  ResponsavelStep2: undefined;
  ResponsavelStep3: undefined;
  CuidadorStep1: undefined;
  CuidadorStep2: undefined;
  IdosoStep1: undefined;
  IdosoStep2: undefined;
  CadastroPreview: undefined;
  Home: ResumoPerfil | undefined;
  Servicos: undefined;
  BuscarCuidador: undefined;
  Historico: undefined;
  Agenda: undefined;
  Disponibilidade: undefined;
  IdosoDetalhes: { idosoId: number };
  Mensagens: undefined;
  Perfil: ResumoPerfil | undefined;
  Notificacoes: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
