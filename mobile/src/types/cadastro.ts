export type Perfil = 'responsavel' | 'cuidador' | 'idoso';

export type DadosPessoais = {
  nomeCompleto: string;
  nomeSocial: string;
  email: string;
  telefone: string;
  telefone2: string;
};

export type Documentos = {
  cpf: string;
  cep: string;
  numeroCasa: string;
  complemento: string;
  dataNascimento: string;
  senha: string;
};

export type DadosIdoso = {
  nomeCompleto: string;
  nomeSocial: string;
  cpf: string;
  dataNascimento: string;
};

export type Curriculo = {
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
};

// Rascunho da interface. O contrato de envio será definido na integração com a API.
export type CadastroRascunho = {
  perfil: Perfil;
  pessoal: DadosPessoais;
  documentos: Documentos;
  idoso: DadosIdoso;
  servicos: string[];
  curriculo: Curriculo | null;
  aceitoTermos: boolean;
};

export type ErrosFormulario<T> = Partial<Record<keyof T, string>>;

export type ResumoPerfil = Pick<
  DadosPessoais,
  'nomeCompleto' | 'nomeSocial' | 'email'
> & {
  perfil: Perfil;
  nomeCompletoIdoso?: string;
};
