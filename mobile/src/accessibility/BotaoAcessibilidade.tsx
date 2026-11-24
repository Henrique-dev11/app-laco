import { useMemo, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlturaTeclado } from '../hooks/useAlturaTeclado';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useTheme } from '../theme/ThemeContext';
import { usePreferenciasAcessibilidade } from './AcessibilidadeContext';
import { MARGEM_BOTAO, TAMANHO_BOTAO } from '../utils/acessibilidade';
import { PainelAcessibilidade } from './PainelAcessibilidade';

const TAMANHO = TAMANHO_BOTAO;
const MARGEM = MARGEM_BOTAO;
/** Altura da barra inferior (navegação ou campo de mensagem), para o botão não cobri-la. */
const ESPACO_BARRA_INFERIOR = 96;

/**
 * Botão flutuante de acessibilidade dentro da área segura. Fica sobre o
 * conteúdo e abre o painel de ajustes. Com o teclado aberto, fica acima dos campos inferiores.
 * `elevado` (padrão) o mantém acima da barra inferior; nas telas sem barra
 * (login e cadastro) ele fica rente ao canto.
 */
export function BotaoAcessibilidade({ elevado = true }: { elevado?: boolean }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const teclado = useAlturaTeclado();
  const { preferencias, atualizar } = usePreferenciasAcessibilidade();
  const { width, height } = useWindowDimensions();
  const [aberto, setAberto] = useState(false);
  const [arrastando, setArrastando] = useState<{ x: number; y: number }>();
  const esquerda = insets.left + MARGEM;
  const topo = insets.top + MARGEM;
  const direita = Math.max(esquerda, width - insets.right - TAMANHO - MARGEM);
  const base = Math.max(
    topo,
    height -
      TAMANHO -
      Math.max(insets.bottom, teclado) -
      (elevado ? ESPACO_BARRA_INFERIOR : MARGEM),
  );
  const posicao = preferencias.pontoBotao ?? {
    x: preferencias.posicaoBotao === 'esquerda' ? 0 : 1,
    y: 1,
  };
  const atual = {
    x: esquerda + (direita - esquerda) * posicao.x,
    y: topo + (base - topo) * posicao.y,
  };
  const gestos = useMemo(() => {
    const limitar = (valor: number, min: number, max: number) =>
      Math.max(min, Math.min(max, valor));
    const mover = (dx: number, dy: number) => ({
      x: limitar(atual.x + dx, esquerda, direita),
      y: limitar(atual.y + dy, topo, base),
    });
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, evento) =>
        Math.hypot(evento.dx, evento.dy) > 7,
      onPanResponderGrant: () => setArrastando({ x: atual.x, y: atual.y }),
      onPanResponderMove: (_, evento) =>
        setArrastando(mover(evento.dx, evento.dy)),
      onPanResponderRelease: (_, evento) => {
        const ponto = mover(evento.dx, evento.dy);
        atualizar({
          pontoBotao: {
            x: (ponto.x - esquerda) / Math.max(1, direita - esquerda),
            y: (ponto.y - topo) / Math.max(1, base - topo),
          },
        });
        setArrastando(undefined);
      },
      onPanResponderTerminate: () => {
        setArrastando(undefined);
      },
    });
  }, [atual.x, atual.y, atualizar, esquerda, topo, direita, base]);
  const ponto = arrastando ?? atual;
  if (preferencias.botaoOculto && !aberto) return null;
  return (
    <>
      {!preferencias.botaoOculto && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            {...gestos.panHandlers}
            style={[styles.area, { left: ponto.x, top: ponto.y }]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Abrir opções de acessibilidade"
              accessibilityHint="Tamanho do texto, contraste e leitura em voz alta"
              activeOpacity={0.85}
              onPress={() => setAberto(true)}
              style={[
                styles.botao,
                {
                  backgroundColor: colors.primaryDark,
                  borderColor: colors.surface,
                },
              ]}
            >
              <Ionicons name="accessibility" size={30} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <PainelAcessibilidade visivel={aberto} onClose={() => setAberto(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  area: { position: 'absolute', zIndex: 1000, width: TAMANHO, height: TAMANHO },
  botao: {
    position: 'absolute',
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 10,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
});
