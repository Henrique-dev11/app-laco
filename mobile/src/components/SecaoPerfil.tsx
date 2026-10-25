import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStyles } from '../theme/appStyles';
import { useTheme } from '../theme/ThemeContext';

export function SecaoPerfil({
  titulo,
  descricao,
  icone,
  children,
}: PropsWithChildren<{
  titulo: string;
  descricao?: string;
  icone: React.ComponentProps<typeof Ionicons>['name'];
}>) {
  const appStyles = useAppStyles();
  const colors = useTheme();
  return (
    <View style={appStyles.card}>
      <View style={styles.cabecalho}>
        <Ionicons name={icone} size={21} color={colors.primary} />
        <Text
          accessibilityRole="header"
          style={[appStyles.section, styles.titulo]}
        >
          {titulo}
        </Text>
      </View>
      {!!descricao && <Text style={appStyles.helper}>{descricao}</Text>}
      {children}
    </View>
  );
}

export function DadoPerfil({ label, value }: { label: string; value: string }) {
  const appStyles = useAppStyles();
  const colors = useTheme();
  return (
    <View style={styles.dado}>
      <Text style={appStyles.helper}>{label}</Text>
      <Text selectable style={[appStyles.text, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  titulo: { flex: 1 },
  dado: { gap: 2 },
});
