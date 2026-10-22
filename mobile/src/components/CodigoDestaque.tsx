import { Platform, StyleSheet, Text, View } from 'react-native';
import type { Paleta } from '../theme';
import { useStyles } from '../theme/ThemeContext';

type Props = { codigo: string };

// Mostra o código de conclusão grande, um caractere por caixa, para ficar fácil de ler e ditar.
export function CodigoDestaque({ codigo }: Props) {
  const styles = useStyles(criarStyles);
  return (
    <View
      style={styles.box}
      accessibilityRole="text"
      accessibilityLabel={`Código de conclusão: ${codigo.split('').join(' ')}`}
    >
      <Text style={styles.titulo}>CÓDIGO DE CONCLUSÃO</Text>
      <View style={styles.linha}>
        {codigo.split('').map((caractere, indice) => (
          <View key={indice} style={styles.celula}>
            <Text style={styles.caractere}>{caractere}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.aviso}>
        Informe ao cuidador somente quando o atendimento terminar. Gerar um novo
        código invalida este.
      </Text>
    </View>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    box: {
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.input,
    },
    titulo: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: colors.primaryDark,
    },
    linha: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    celula: {
      width: 44,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    caractere: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primaryDark,
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
    aviso: {
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      color: colors.muted,
    },
  });
