export type Endereco = {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
};
export type UsuarioAtual = {
  id: number;
  nome: string;
  nomeSocial: string | null;
  email: string;
  telefone2: string | null;
  foto?: { updatedAt: string } | null;
  tipoUsuario: 'RESPONSAVEL' | 'CUIDADOR' | 'ADMIN' | 'SUPER_ADMIN';
  responsavel: null | {
    id: number;
    telefone: string;
    cpf: string;
    dataNascimento: string;
    endereco: Endereco;
    responsavelIdosos: {
      parentesco: string;
      idoso: {
        id: number;
        nome: string;
        nomeSocial: string | null;
        endereco: Endereco;
      };
    }[];
  };
  cuidador: null | {
    id: number;
    telefone: string;
    cpf: string;
    dataNascimento: string;
    statusVerificacao: string;
    biografia: string | null;
    experienciaProfissional: string | null;
    registroProfissional: string | null;
    endereco: Endereco;
    curriculo: { id: number; nome: string } | null;
    cuidadorServicos: {
      id: number;
      preco: string;
      duracaoMinutos: number;
      ativo: boolean;
      servico: { id: number; nome: string };
    }[];
  };
};
export type Sessao = { token: string; expiraEm: string; usuario: UsuarioAtual };
