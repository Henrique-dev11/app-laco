import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { isAxiosError } from 'axios';
import { api, definirToken, mensagemErro } from '../services/api';
import { recuperarFotoPendente, type FotoPendente } from '../services/foto';
import { lerToken, gravarToken } from '../services/sessao';
import type { Sessao, UsuarioAtual } from '../types/auth';

type Auth = {
  usuario: UsuarioAtual | null;
  carregando: boolean;
  erroInicial: string;
  avisoSessao: string;
  tentarRestaurar: () => void;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizar: () => Promise<void>;
  fotoPendente: FotoPendente | null;
  limparFotoPendente: () => void;
};
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroInicial, setErroInicial] = useState('');
  const [avisoSessao, setAvisoSessao] = useState('');
  const tokenAtual = useRef<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [fotoPendente, setFotoPendente] = useState<FotoPendente | null>(null);
  const limparFotoPendente = useCallback(() => setFotoPendente(null), []);

  const expirar = useCallback(async () => {
    if (!tokenAtual.current) return;
    tokenAtual.current = null;
    definirToken(null);
    setUsuario(null);
    setFotoPendente(null);
    setAvisoSessao('Sua sessão expirou. Entre novamente para continuar.');
    await gravarToken(null).catch(() => undefined);
  }, []);

  const validade = usuario?.sessaoExpiraEm;
  useEffect(() => {
    if (!validade) return;
    const restante = () => new Date(validade).getTime() - Date.now();
    const verificar = () => {
      if (restante() <= 0) void expirar();
    };
    const timer = setTimeout(verificar, Math.max(0, restante()));
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') verificar();
    });
    return () => {
      clearTimeout(timer);
      assinatura.remove();
    };
  }, [validade, expirar]);

  useEffect(() => {
    let ativo = true;
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (
          isAxiosError(error) &&
          error.response?.status === 401 &&
          ativo &&
          tokenAtual.current &&
          error.config?.headers.get('Authorization') ===
            `Bearer ${tokenAtual.current}`
        ) {
          await expirar();
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
        tokenAtual.current = token;
        definirToken(token);
        if (token) {
          const response = await api.get<UsuarioAtual>('/auth/me');
          if (ativo) setUsuario(response.data);
          try {
            // App reiniciado pelo Android enquanto a câmera estava aberta.
            const foto = await recuperarFotoPendente(response.data.id);
            if (ativo) setFotoPendente(foto);
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
  }, [tentativa, expirar]);

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
    tokenAtual.current = data.token;
    definirToken(data.token);
    setUsuario({ ...data.usuario, sessaoExpiraEm: data.expiraEm });
    setAvisoSessao('');
    setFotoPendente(null);
    setErroInicial('');
  }
  async function sair() {
    await api.post('/auth/logout');
    tokenAtual.current = null;
    definirToken(null);
    setUsuario(null);
    setFotoPendente(null);
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
        avisoSessao,
        tentarRestaurar: () => setTentativa((value) => value + 1),
        entrar,
        sair,
        atualizar,
        fotoPendente,
        limparFotoPendente,
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
