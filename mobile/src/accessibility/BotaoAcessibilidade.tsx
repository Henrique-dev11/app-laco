import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
 * Botão fixo de acessibilidade, num canto de todas as telas. Fica sobre o
 * conteúdo (posição absoluta) e abre o painel de ajustes. Some enquanto o
 * teclado está aberto, para não cobrir o campo que a pessoa está digitando.
 * `elevado` (padrão) o mantém acima da barra inferior; nas telas sem barra
 * (login e cadastro) ele fica rente ao canto.
 */
export function BotaoAcessibilidade({ elevado = true }: { elevado?: boolean }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const teclado = useAlturaTeclado();
  const { preferencias } = usePreferenciasAcessibilidade();
  const [aberto, setAberto] = useState(false);
  const lado = preferencias.posicaoBotao === 'esquerda' ? 'left' : 'right';
  return (
    <>
      {teclado === 0 && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Abrir opções de acessibilidade"
            accessibilityHint="Tamanho do texto, contraste e leitura em voz alta"
            activeOpacity={0.85}
            onPress={() => setAberto(true)}
            style={[
              styles.botao,
              {
                [lado]: MARGEM,
                bottom:
                  insets.bottom + (elevado ? ESPACO_BARRA_INFERIOR : MARGEM),
                backgroundColor: colors.primaryDark,
                borderColor: colors.surface,
              },
            ]}
          >
            <Ionicons name="accessibility" size={30} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}
      <PainelAcessibilidade visivel={aberto} onClose={() => setAberto(false)} />
    </>
  );
}

const styles = StyleSheet.create({
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
