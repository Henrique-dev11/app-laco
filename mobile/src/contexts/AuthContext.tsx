import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { isAxiosError } from 'axios';
import { api, definirToken, mensagemErro } from '../services/api';
import { recuperarFotoPendente } from '../services/foto';
import { lerToken, gravarToken } from '../services/sessao';
import type { Sessao, UsuarioAtual } from '../types/auth';

type Auth = {
  usuario: UsuarioAtual | null;
  carregando: boolean;
  erroInicial: string;
  tentarRestaurar: () => void;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizar: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroInicial, setErroInicial] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (
          isAxiosError(error) &&
          error.response?.status === 401 &&
          error.config?.url !== '/auth/login'
        ) {
          definirToken(null);
          if (ativo) setUsuario(null);
          try {
            await gravarToken(null);
          } catch {
            /* A API continua rejeitando a sessão expirada. */
          }
        }
        return Promise.reject(error);
      },
    );
    async function restaurar() {
      setCarregando(true);
      setErroInicial('');
      try {
        const token = await lerToken();
        if (!ativo) return;
        definirToken(token);
        if (token) {
          const response = await api.get<UsuarioAtual>('/auth/me');
          if (ativo) setUsuario(response.data);
          try {
            // App reiniciado pelo Android enquanto a câmera estava aberta.
            if (await recuperarFotoPendente()) {
              const atual = await api.get<UsuarioAtual>('/auth/me');
              if (ativo) setUsuario(atual.data);
            }
          } catch {
            /* A foto pendente não deve impedir o login. */
          }
        }
      } catch (error) {
        if (ativo && !(isAxiosError(error) && error.response?.status === 401))
          setErroInicial(mensagemErro(error));
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void restaurar();
    return () => {
      ativo = false;
      api.interceptors.response.eject(interceptor);
    };
  }, [tentativa]);

  async function entrar(email: string, senha: string) {
    const { data } = await api.post<Sessao>('/auth/login', {
      email: email.trim().toLowerCase(),
      senha,
    });
    try {
      await gravarToken(data.token);
    } catch (error) {
      await api
        .post('/auth/logout', undefined, {
          headers: { Authorization: `Bearer ${data.token}` },
        })
        .catch(() => undefined);
      throw error;
    }
    definirToken(data.token);
    setUsuario(data.usuario);
    setErroInicial('');
  }
  async function sair() {
    await api.post('/auth/logout');
    definirToken(null);
    setUsuario(null);
    try {
      await gravarToken(null);
    } catch {
      /* Token já revogado no servidor. */
    }
  }
  async function atualizar() {
    setUsuario((await api.get<UsuarioAtual>('/auth/me')).data);
  }
  return (
    <Context.Provider
      value={{
        usuario,
        carregando,
        erroInicial,
        tentarRestaurar: () => setTentativa((value) => value + 1),
        entrar,
        sair,
        atualizar,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('useAuth requer AuthProvider.');
  return auth;
}
