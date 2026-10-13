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
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  dataNascimento: string;
  senha: string;
};

export type DadosIdoso = {
  nomeCompleto: string;
  nomeSocial: string;
  cpf: string;
  dataNascimento: string;
  parentesco: 'FILHO' | 'FILHA' | 'CONJUGE' | 'NETO' | 'NETA' | 'OUTRO';
  mesmoEndereco: boolean;
  endereco: import('./auth').Endereco;
};

export type Curriculo = {
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
  file?: File;
};

// Os campos são mapeados ao DTO da API antes do envio.
export type CadastroRascunho = {
  perfil: Perfil;
  pessoal: DadosPessoais;
  documentos: Documentos;
  idoso: DadosIdoso;
  servicos: number[];
  ofertas: { servicoId: number; preco: string; duracaoMinutos: string }[];
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
