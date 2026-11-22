import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { usePreferenciasAcessibilidade } from '../accessibility/AcessibilidadeContext';
import { useAuth } from '../contexts/AuthContext';
import { aplicarContraste } from './contraste';
import { colors, paletas, type Paleta } from './index';

const Context = createContext<Paleta>(colors);

/**
 * Cuidador → rosa; responsável → roxo; idoso (acesso próprio) → ameixa; sem
 * login → neutra. Se a pessoa escolheu alto contraste na acessibilidade, a
 * paleta do perfil é trocada pela de alto contraste (inclusive antes do login).
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { usuario } = useAuth();
  const { preferencias } = usePreferenciasAcessibilidade();
  const paleta = useMemo(() => {
    const doPerfil = (() => {
      if (usuario?.cuidador) return paletas.cuidador;
      if (usuario?.responsavel)
        return usuario.responsavel.responsavelIdosos.some(
          (item) => item.parentesco === 'PROPRIO',
        )
          ? paletas.idoso
          : paletas.responsavel;
      return colors;
    })();
    return aplicarContraste(doPerfil, preferencias.contraste);
  }, [usuario, preferencias.contraste]);
  return <Context.Provider value={paleta}>{children}</Context.Provider>;
}

export const useTheme = () => useContext(Context);

/** Cria estilos a partir da paleta atual (recalcula só quando o perfil muda). */
export function useStyles<T>(criar: (paleta: Paleta) => T): T {
  const paleta = useTheme();
  return useMemo(() => criar(paleta), [criar, paleta]);
}
