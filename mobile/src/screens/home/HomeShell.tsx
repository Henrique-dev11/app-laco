import { fs } from '../../theme/tipografia';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { BottomNavigation } from '../../components/BottomNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificacoes } from '../../hooks/useNotificacoes';
import { MotionPressable as TouchableOpacity } from '../../motion/MotionPressable';
import { MotionView } from '../../motion/MotionView';
import type { Paleta } from '../../theme';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import type { ScreenProps } from '../../types/navigation';

export type HomeProps = Pick<ScreenProps<'Home'>, 'navigation'>;

type Props = PropsWithChildren<
  HomeProps & {
    /** Texto pequeno acima do nome ("Olá," / "Bom dia,"). */
    saudacao?: string;
  }
>;

/** Cabeçalho, rolagem e barra inferior comuns a todas as Homes. */
export function HomeShell({ navigation, saudacao = 'Olá,', children }: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario } = useAuth();
  const { pendentes } = useNotificacoes();
  if (!usuario) return null;
  const nome = (usuario.nomeSocial || usuario.nome).split(/\s+/)[0];
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.user}>
            <Avatar
              nome={nome}
              usuarioId={usuario.id}
              versao={usuario.foto?.updatedAt}
              tamanho={52}
              fundo={colors.surface}
            />
            <View style={styles.grow}>
              <Text style={styles.welcome}>{saudacao}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {nome}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              pendentes > 0
                ? `Notificações, ${pendentes} novas`
                : 'Notificações'
            }
            onPress={() => navigation.navigate('Notificacoes')}
            style={styles.notification}
          >
            <Ionicons
              name="notifications-outline"
              size={26}
              color={colors.surface}
            />
            {pendentes > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {pendentes > 9 ? '9+' : pendentes}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <MotionView preset="fade" style={styles.content}>
            {children}
          </MotionView>
        </ScrollView>
        <BottomNavigation
          onHome={() => navigation.popToTop()}
          onSearch={() => navigation.navigate('BuscarCuidador')}
          onAgenda={() => navigation.navigate('Agenda')}
          onMessages={() => navigation.navigate('Mensagens')}
          onProfile={() => navigation.navigate('Perfil')}
        />
      </View>
    </SafeAreaView>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.header },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.header,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      paddingHorizontal: 24,
      paddingVertical: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    user: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
    grow: { flex: 1 },
    welcome: { color: colors.onHeader, fontSize: fs(13) },
    name: { color: colors.surface, fontSize: fs(19), fontWeight: '700' },
    notification: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.headerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 4,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error,
    },
    notificationBadgeText: {
      fontSize: fs(11),
      fontWeight: '700',
      color: colors.surface,
    },
    scroll: { padding: 24, flexGrow: 1 },
    content: { gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
  });
