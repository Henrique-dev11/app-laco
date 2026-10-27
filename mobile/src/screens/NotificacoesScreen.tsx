import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { rotuloData } from '../services/mensagens';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { ScreenProps } from '../types/navigation';

export function NotificacoesScreen({
  navigation,
}: ScreenProps<'Notificacoes'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { itens, carregando, erro } = useNotificacoes();

  return (
    <AppScreenLayout title="Notificações" subtitle="Avisos sobre seus cuidados">
      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !itens.length && (
        <Notice>Você não tem notificações no momento.</Notice>
      )}
      {itens.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={() =>
            item.conversa
              ? navigation.navigate('Conversa', item.conversa)
              : navigation.navigate('Historico')
          }
          style={[styles.item, item.pendente && styles.itemNovo]}
        >
          <View style={styles.icone}>
            <Ionicons
              name={item.tipo === 'mensagem' ? 'chatbubble' : 'clipboard'}
              size={20}
              color={colors.primaryDark}
            />
          </View>
          <View style={styles.info}>
            <View style={styles.linha}>
              <Text style={styles.titulo} numberOfLines={1}>
                {item.tipo === 'mensagem'
                  ? `Nova mensagem de ${item.titulo}`
                  : item.titulo}
              </Text>
              <Text style={styles.data}>{rotuloData(item.data)}</Text>
            </View>
            <Text style={styles.texto} numberOfLines={2}>
              {item.texto}
            </Text>
          </View>
          {!!item.quantidade && item.quantidade > 1 && (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{item.quantidade}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </AppScreenLayout>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
    },
    itemNovo: { borderColor: colors.primary },
    icone: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.badge,
    },
    info: { flex: 1, gap: 3 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titulo: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    data: { fontSize: 12, color: colors.muted },
    texto: { fontSize: 14, color: colors.muted, lineHeight: 20 },
    contador: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    contadorTexto: { fontSize: 12, fontWeight: '700', color: colors.surface },
  });
