import { fs, lh } from '../theme/tipografia';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../accessibility/Texto';
import type { Paleta } from '../theme';
import { useStyles } from '../theme/ThemeContext';

type Props = { codigo: string; etapa?: 'INICIO' | 'FIM'; expiraEm?: string };

// Mostra o código de conclusão grande, um caractere por caixa, para ficar fácil de ler e ditar.
export function CodigoDestaque({ codigo, etapa = 'FIM', expiraEm }: Props) {
  const styles = useStyles(criarStyles);
  const [agora, setAgora] = useState(Date.now);
  const segundos = expiraEm
    ? Math.max(0, Math.ceil((Date.parse(expiraEm) - agora) / 1000))
    : null;
  const expirado = segundos === 0;
  useEffect(() => {
    if (!expiraEm || expirado) return;
    const atualizar = () => setAgora(Date.now());
    atualizar();
    const intervalo = setInterval(atualizar, 1000);
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') atualizar();
    });
    return () => {
      clearInterval(intervalo);
      assinatura.remove();
    };
  }, [expiraEm, expirado]);
  const titulo =
    etapa === 'INICIO' ? 'Código de início' : 'Código de conclusão';
  return (
    <View
      style={styles.box}
      accessibilityRole="text"
      accessibilityLabel={`${titulo}: ${expirado ? 'expirado' : codigo.split('').join(' ')}`}
    >
      <Text style={styles.titulo}>{titulo}</Text>
      {!expirado && (
        <View style={styles.linha}>
          {codigo.split('').map((caractere, indice) => (
            <View key={indice} style={styles.celula}>
              <Text
                style={styles.caractere}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {caractere}
              </Text>
            </View>
          ))}
        </View>
      )}
      {segundos !== null && (
        <Text style={styles.aviso}>
          {expirado
            ? 'Código expirado. Gere um novo código.'
            : `Expira em ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`}
        </Text>
      )}
      {!expirado && (
        <Text style={styles.aviso}>
          {etapa === 'INICIO'
            ? 'Informe ao cuidador no início do atendimento.'
            : 'Informe ao cuidador quando o atendimento terminar.'}{' '}
          Gerar um novo código invalida este.
        </Text>
      )}
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
      fontSize: fs(12),
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: colors.primaryDark,
    },
    linha: {
      width: '100%',
      flexDirection: 'row',
      gap: 4,
      justifyContent: 'center',
    },
    celula: {
      flex: 1,
      minWidth: 0,
      maxWidth: 44,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    caractere: {
      fontSize: fs(24),
      fontWeight: '800',
      color: colors.primaryDark,
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
    aviso: {
      fontSize: fs(12),
      textAlign: 'center',
      lineHeight: lh(18),
      color: colors.muted,
    },
  });
