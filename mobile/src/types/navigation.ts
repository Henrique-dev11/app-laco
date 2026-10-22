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
  CuidadorServicos: undefined;
  ConfigurarServicos: undefined;
  MeusServicos: undefined;
  IdosoStep1: undefined;
  IdosoStep2: undefined;
  CadastroPreview: undefined;
  Home: ResumoPerfil | undefined;
  Servicos: undefined;
  BuscarCuidador: { idosoId?: number } | undefined;
  Historico: undefined;
  Agenda: undefined;
  AgendarAtendimento: { contratacaoId: number };
  EditarCuidador: undefined;
  EditarResponsavel: undefined;
  MeusIdosos: undefined;
  AdicionarIdoso: undefined;
  EditarIdoso: { idosoId: number };
  Disponibilidade: undefined;
  IdosoDetalhes: { idosoId: number };
  Mensagens: undefined;
  Conversa: { usuarioId: number; nome: string; fotoVersao: string | null };
  Perfil: ResumoPerfil | undefined;
  Notificacoes: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
