import { StyleSheet, Text } from 'react-native';
import type { StatusCep } from '../hooks/useBuscaCep';
import type { Paleta } from '../theme';
import { useStyles } from '../theme/ThemeContext';
import { fs } from '../theme/tipografia';

const mensagens: Record<Exclude<StatusCep, 'ocioso'>, string> = {
  buscando: 'Buscando o endereço pelo CEP…',
  nao_encontrado:
    'CEP não encontrado. Confira os números ou preencha o endereço abaixo.',
  erro: 'Não foi possível buscar o CEP agora. Preencha o endereço abaixo.',
};

/** Recado sob o campo de CEP enquanto o endereço é buscado. */
export function AvisoCep({ status }: { status: StatusCep }) {
  const styles = useStyles(criarStyles);
  if (status === 'ocioso') return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.texto, status !== 'buscando' && styles.alerta]}
    >
      {mensagens[status]}
    </Text>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    texto: { color: colors.muted, fontSize: fs(13) },
    alerta: { color: colors.primaryDark, fontWeight: '600' },
  });
