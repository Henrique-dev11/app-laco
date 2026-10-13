import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';
import type { CadastroRascunho, Perfil } from '../types/cadastro';

function criarRascunho(perfil: Perfil): CadastroRascunho {
  return {
    perfil,
    pessoal: {
      nomeCompleto: '',
      nomeSocial: '',
      email: '',
      telefone: '',
      telefone2: '',
    },
    documentos: {
      cpf: '',
      cep: '',
      numeroCasa: '',
      complemento: '',
      dataNascimento: '',
      senha: '',
    },
    idoso: { nomeCompleto: '', nomeSocial: '', cpf: '', dataNascimento: '' },
    servicos: [],
    curriculo: null,
    aceitoTermos: false,
  };
}

type CadastroContextValue = {
  cadastro: CadastroRascunho;
  iniciarCadastro: (perfil: Perfil) => void;
  atualizarCadastro: (dados: Partial<CadastroRascunho>) => void;
  limparCadastro: () => void;
};

const CadastroContext = createContext<CadastroContextValue | null>(null);

export function CadastroProvider({ children }: PropsWithChildren) {
  const [cadastro, setCadastro] = useState(() => criarRascunho('responsavel'));

  return (
    <CadastroContext.Provider
      value={{
        cadastro,
        iniciarCadastro: (perfil) => setCadastro(criarRascunho(perfil)),
        atualizarCadastro: (dados) =>
          setCadastro((atual) => ({ ...atual, ...dados })),
        limparCadastro: () => setCadastro(criarRascunho('responsavel')),
      }}
    >
      {children}
    </CadastroContext.Provider>
  );
}

export function useCadastro() {
  const context = useContext(CadastroContext);
  if (!context)
    throw new Error('useCadastro deve ser usado dentro de CadastroProvider.');
  return context;
}
