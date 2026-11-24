import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type PropsWithChildren,
  type Ref,
} from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type HostInstance,
  type TextStyle,
} from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { ajustarEstiloTexto, extrairTexto } from '../utils/acessibilidade';
import {
  useLeitura,
  usePreferenciasAcessibilidade,
  useRegistroTextos,
} from './AcessibilidadeContext';

/**
 * `Text` e `TextInput` do app. São os mesmos componentes do React Native, mas
 * aplicam as preferências de acessibilidade (tamanho da fonte, negrito e
 * entrelinha) em tempo de renderização — assim os estilos já existentes, que
 * usam `fs()`/`lh()`, continuam intactos — e registram o texto para a leitura
 * em voz alta. Use-os no lugar dos de `react-native`.
 */

/** Texto dentro de outro texto herda o tamanho do pai e não é lido em duplicidade. */
const DentroDeTexto = createContext(false);

/** Marca uma sobreposição (modal): "Ler a tela" lê só a camada mais alta. */
const EscopoLeitura = createContext<number | null>(null);
let proximoEscopo = 1;

/** Envolve o conteúdo de um modal para que a leitura considere só ele. */
export function CamadaLeitura({ children }: PropsWithChildren) {
  // Cada abertura de modal recebe um número maior que o das anteriores.
  const [identificador] = useState(() => proximoEscopo++);
  return (
    <EscopoLeitura.Provider value={identificador}>
      {children}
    </EscopoLeitura.Provider>
  );
}

/** Conteúdo que não deve ser lido por "Ler a tela" (o próprio painel). */
const SemLeitura = createContext(false);
export const DentroDeControle = createContext(false);

export function useLeituraPorToque() {
  const { preferencias } = usePreferenciasAcessibilidade();
  const { falar } = useLeitura();
  const excluido = useContext(SemLeitura);
  return preferencias.leituraPorToque && !excluido ? falar : undefined;
}
export function ForaDaLeitura({ children }: PropsWithChildren) {
  return <SemLeitura.Provider value>{children}</SemLeitura.Provider>;
}

export function Text({
  style,
  children,
  ref,
  ...props
}: ComponentProps<typeof RNText> & { ref?: Ref<HostInstance> }) {
  const { preferencias } = usePreferenciasAcessibilidade();
  const colors = useTheme();
  const registro = useRegistroTextos();
  const aninhado = useContext(DentroDeTexto);
  const escopo = useContext(EscopoLeitura);
  const semLeitura = useContext(SemLeitura);
  const controle = useContext(DentroDeControle);
  const ler = useLeituraPorToque();
  // Pode ser nulo fora de uma tela (ex.: avisos no topo do app).
  const navegacao = useContext(NavigationContext) ?? undefined;
  const interna = useRef<HostInstance | null>(null);
  // Texto atual para a leitura (a ref é atualizada após cada renderização).
  const atual = useRef('');
  const texto = extrairTexto(children);
  useEffect(() => {
    atual.current = texto;
  });
  const identificador = useId();

  useEffect(() => {
    if (aninhado || semLeitura) return;
    return registro.registrar({
      ref: interna,
      obter: () => atual.current,
      navegacao,
      escopo,
    });
    // `identificador` só garante um efeito por instância.
  }, [registro, aninhado, semLeitura, navegacao, escopo, identificador]);

  const { escalaFonte, negrito, espacamentoLinhas, contraste } = preferencias;
  const alterado = escalaFonte !== 1 || negrito || espacamentoLinhas;
  const achatado = StyleSheet.flatten(style) ?? {};
  const ajuste = alterado
    ? ajustarEstiloTexto(
        achatado as Parameters<typeof ajustarEstiloTexto>[0],
        preferencias,
        !aninhado,
      )
    : null;
  // Em alto contraste, texto sem cor própria (preto por padrão no RN) usa a
  // cor de texto da paleta, senão ficaria invisível no fundo escuro. Texto
  // aninhado herda a cor do pai.
  const corPadrao =
    contraste !== 'padrao' && !aninhado && achatado.color === undefined
      ? { color: colors.text }
      : null;

  const elemento = (
    <RNText
      {...props}
      onPress={
        ler && !aninhado && !controle && texto.trim()
          ? (event) => {
              ler(props.accessibilityLabel ?? texto);
              props.onPress?.(event);
            }
          : props.onPress
      }
      ref={(no) => {
        interna.current = no;
        if (typeof ref === 'function') ref(no);
        else if (ref) ref.current = no;
      }}
      style={[style, corPadrao, ajuste as TextStyle | null]}
    >
      {children}
    </RNText>
  );
  return aninhado ? (
    elemento
  ) : (
    <DentroDeTexto.Provider value>{elemento}</DentroDeTexto.Provider>
  );
}

export function TextInput({
  style,
  ...props
}: ComponentProps<typeof RNTextInput>) {
  const { preferencias } = usePreferenciasAcessibilidade();
  const colors = useTheme();
  const ler = useLeituraPorToque();
  const { escalaFonte, negrito, contraste } = preferencias;
  // Campo sem cor própria usa a cor de texto da paleta em alto contraste.
  const corPadrao =
    contraste !== 'padrao' &&
    (StyleSheet.flatten(style) ?? {}).color === undefined
      ? { color: colors.text }
      : null;
  const ajuste =
    escalaFonte !== 1 || negrito
      ? ajustarEstiloTexto(
          (StyleSheet.flatten(style) ?? {}) as Parameters<
            typeof ajustarEstiloTexto
          >[0],
          // Campo de texto é sempre "raiz" (o tamanho padrão também cresce) e
          // não recebe entrelinha ampliada, que cortaria o texto digitado.
          { ...preferencias, espacamentoLinhas: false },
          true,
        )
      : null;
  return (
    <RNTextInput
      {...props}
      onFocus={
        ler
          ? (event) => {
              const nome = props.accessibilityLabel ?? props.placeholder;
              if (nome) ler(nome);
              props.onFocus?.(event);
            }
          : props.onFocus
      }
      style={[style, corPadrao, ajuste as TextStyle | null]}
    />
  );
}
