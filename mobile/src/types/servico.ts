export type Servico = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  precoSugerido?: string | null;
  duracaoSugeridaMinutos?: number | null;
  createdAt: string;
  updatedAt: string;
};
