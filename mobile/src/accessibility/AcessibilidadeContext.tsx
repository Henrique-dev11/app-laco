import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import { Dimensions, Platform, type HostInstance } from 'react-native';
import * as Speech from 'expo-speech';
import { gravarPreferencias, lerPreferencias } from '../services/preferencias';
import {
  PREFERENCIAS_PADRAO,
  TAXA_VOZ,
  dividirFala,
  normalizarPreferencias,
  ordenarLeitura,
  textoParaFala,
  type ItemLeitura,
  type Preferencias,
} from '../utils/acessibilidade';

/* -------------------------------------------------------------------------- */
/* Preferências (tamanho da fonte, contraste, etc.)                           */
/* -------------------------------------------------------------------------- */

type ContextoPreferencias = {
  preferencias: Preferencias;
  atualizar: (parcial: Partial<Preferencias>) => void;
  restaurar: () => void;
};

const PreferenciasContext = createContext<ContextoPreferencias>({
  preferencias: PREFERENCIAS_PADRAO,
  atualizar: () => undefined,
  restaurar: () => undefined,
});

/* -------------------------------------------------------------------------- */
/* Leitura em voz alta                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Cada `Text` do app se registra aqui (veja `Texto.tsx`) para que "Ler a tela"
 * saiba o que está visível. O registro fica fora do estado do React porque
 * muda a cada montagem de texto e não deve provocar renderizações.
 */
export type EntradaTexto = {
  ref: RefObject<HostInstance | null>;
  /** Texto atual (lido só na hora de falar). */
  obter: () => string;
  /** Tela (React Navigation) a que o texto pertence; só a focada é lida. */
  navegacao?: { isFocused: () => boolean };
  /** Camada de sobreposição (modal) do texto, ou null se for da própria tela. */
  escopo: number | null;
};

type Registro = {
  registrar: (entrada: EntradaTexto) => () => void;
  todas: () => EntradaTexto[];
};

const RegistroContext = createContext<Registro>({
  registrar: () => () => undefined,
  todas: () => [],
});

type ContextoLeitura = {
  falando: boolean;
  /** Fala o que está visível na tela atual. */
  lerTela: () => Promise<void>;
  falar: (texto: string) => void;
  parar: () => void;
};

const LeituraContext = createContext<ContextoLeitura>({
  falando: false,
  lerTela: async () => undefined,
  falar: () => undefined,
  parar: () => undefined,
});

export const usePreferenciasAcessibilidade = () =>
  useContext(PreferenciasContext);
export const useRegistroTextos = () => useContext(RegistroContext);
export const useLeitura = () => useContext(LeituraContext);

type Medida = ItemLeitura & { escopo: number | null };

/** Posição do texto na janela; `null` se ele não está desenhado/visível. */
function medir(entrada: EntradaTexto): Promise<Medida | null> {
  return new Promise((resolve) => {
    // Alguns textos nunca respondem (desmontados no meio); não travamos a leitura.
    const limite = setTimeout(() => resolve(null), 400);
    try {
      entrada.ref.current?.measureInWindow((x, y, largura, altura) => {
        clearTimeout(limite);
        const janela = Dimensions.get('window');
        const visivel =
          largura > 0 &&
          altura > 0 &&
          y + altura > 0 &&
          y < janela.height &&
          x + largura > 0 &&
          x < janela.width;
        resolve(
          visivel
            ? { texto: entrada.obter(), x, y, escopo: entrada.escopo }
            : null,
        );
      });
      if (!entrada.ref.current) {
        clearTimeout(limite);
        resolve(null);
      }
    } catch {
      clearTimeout(limite);
      resolve(null);
    }
  });
}

export function AcessibilidadeProvider({ children }: PropsWithChildren) {
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_PADRAO);
  const [carregado, setCarregado] = useState(false);
  const [falando, setFalando] = useState(false);
  // Velocidade atual da voz, lida na hora de falar (sem recriar `falar`).
  const prefsRef = useRef(preferencias);
  useEffect(() => {
    prefsRef.current = preferencias;
  }, [preferencias]);
  // Identifica a fala em andamento para ignorar callbacks de falas já trocadas.
  const falaAtual = useRef(0);

  // Restaura as preferências salvas no aparelho.
  useEffect(() => {
    let ativo = true;
    lerPreferencias()
      .then((salvas) => {
        if (ativo && salvas) setPreferencias(normalizarPreferencias(salvas));
      })
      .catch(() => {
        /* Sem acesso ao armazenamento: segue com o padrão. */
      })
      .finally(() => ativo && setCarregado(true));
    return () => {
      ativo = false;
    };
  }, []);

  // Grava a cada mudança (só depois de restaurar, para não sobrescrever com o padrão).
  useEffect(() => {
    if (carregado) void gravarPreferencias(preferencias).catch(() => undefined);
  }, [preferencias, carregado]);

  const atualizar = useCallback(
    (parcial: Partial<Preferencias>) =>
      setPreferencias((atual) => normalizarPreferencias({ ...atual, ...parcial })),
    [],
  );
  const restaurar = useCallback(() => setPreferencias(PREFERENCIAS_PADRAO), []);

  const parar = useCallback(() => {
    falaAtual.current += 1;
    setFalando(false);
    void Speech.stop();
  }, []);

  const falar = useCallback(
    (texto: string) => {
      const conteudo = textoParaFala([texto]);
      if (!conteudo) return;
      void Speech.stop();
      const id = ++falaAtual.current;
      // Na web as vozes cortam falas longas; no celular o limite é maior.
      const trechos = dividirFala(conteudo, Platform.OS === 'web' ? 300 : 3000);
      const terminou = () => {
        if (falaAtual.current === id) setFalando(false);
      };
      setFalando(true);
      trechos.forEach((trecho, indice) =>
        Speech.speak(trecho, {
          language: 'pt-BR',
          rate: TAXA_VOZ[prefsRef.current.velocidadeVoz],
          onDone: indice === trechos.length - 1 ? terminou : undefined,
          onStopped: terminou,
          onError: terminou,
        }),
      );
    },
    [],
  );

  // Registro de textos: Map mutável e estável.
  const [registro] = useState<Registro>(() => {
    const entradas = new Set<EntradaTexto>();
    return {
      registrar: (entrada) => {
        entradas.add(entrada);
        return () => {
          entradas.delete(entrada);
        };
      },
      todas: () => [...entradas],
    };
  });

  const lerTela = useCallback(async () => {
    // Só a tela em foco; se houver um modal aberto, só a camada mais alta.
    const daTela = registro
      .todas()
      .filter((entrada) => entrada.navegacao?.isFocused() !== false);
    const medidas = (await Promise.all(daTela.map(medir))).filter(
      (m): m is Medida => m !== null,
    );
    const camadaTopo = medidas.reduce<number | null>(
      (maior, m) =>
        m.escopo !== null && (maior === null || m.escopo > maior)
          ? m.escopo
          : maior,
      null,
    );
    const visiveis = medidas.filter((m) => m.escopo === camadaTopo);
    const texto = textoParaFala(ordenarLeitura(visiveis).map((m) => m.texto));
    falar(texto || 'Não há texto para ler nesta tela.');
  }, [registro, falar]);

  // Ao fechar o app/desmontar, silencia a voz.
  useEffect(() => () => void Speech.stop(), []);

  const valorPreferencias = useMemo(
    () => ({ preferencias, atualizar, restaurar }),
    [preferencias, atualizar, restaurar],
  );
  const valorLeitura = useMemo(
    () => ({ falando, lerTela, falar, parar }),
    [falando, lerTela, falar, parar],
  );

  return (
    <PreferenciasContext.Provider value={valorPreferencias}>
      <RegistroContext.Provider value={registro}>
        <LeituraContext.Provider value={valorLeitura}>
          {children}
        </LeituraContext.Provider>
      </RegistroContext.Provider>
    </PreferenciasContext.Provider>
  );
}
