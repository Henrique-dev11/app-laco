import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import { Notice } from '../components/Notice';
import { QuickAccessCard } from '../components/QuickAccessCard';
import { colors } from '../theme';
import type { ScreenProps } from '../types/navigation';

export function HomeScreen({ navigation, route }: ScreenProps<'Home'>) {
  const perfil = route.params;
  const nome = (perfil?.nomeSocial || perfil?.nomeCompleto || 'Carlos').split(
    /\s+/,
  )[0];
  const nomeIdoso = perfil?.nomeCompletoIdoso || 'Marta Oliveira';
  const cuidador = perfil?.perfil === 'cuidador';
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.user}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {nome.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.welcome}>Olá,</Text>
              <Text style={styles.name}>{nome}</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            onPress={() => navigation.navigate('Notificacoes')}
            style={styles.notification}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.surface}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>
            <Notice>
              Demonstração do Laço. Agendamentos e cuidadores são exemplos;
              nenhum cadastro foi enviado.
            </Notice>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.alert}
              onPress={() => navigation.navigate('Agenda')}
            >
              <Ionicons
                name="time-outline"
                size={24}
                color={colors.primaryDark}
              />
              <View style={styles.grow}>
                <Text style={styles.overline}>HOJE ÀS 14H · EXEMPLO</Text>
                <Text style={styles.description}>
                  Fernanda cuida de {nomeIdoso.split(/\s+/)[0]}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.section}>
              {cuidador
                ? 'Meu perfil'
                : perfil?.perfil === 'idoso'
                  ? 'Meu cuidado'
                  : 'Meus idosos'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.elder}
              onPress={() =>
                navigation.navigate(
                  'Perfil',
                  cuidador
                    ? perfil
                    : {
                        perfil: 'idoso',
                        nomeCompleto: nomeIdoso,
                        nomeSocial: '',
                        email: perfil?.perfil === 'idoso' ? perfil.email : '',
                      },
                )
              }
            >
              <View style={styles.elderAvatar}>
                <Text style={styles.avatarText}>
                  {(cuidador ? nome : nomeIdoso).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.grow}>
                <Text style={styles.elderName}>
                  {cuidador ? perfil?.nomeCompleto : nomeIdoso}
                </Text>
                <Text style={styles.details}>
                  {cuidador
                    ? 'Conheça seu perfil de cuidador'
                    : 'Cuidadora: Fernanda Santos · Exemplo'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.section}>Acesso rápido</Text>
            <View style={styles.quick}>
              <QuickAccessCard
                title="Buscar cuidador"
                icon="search-outline"
                onPress={() => navigation.navigate('BuscarCuidador')}
              />
              <QuickAccessCard
                title="Histórico"
                icon="list-outline"
                onPress={() => navigation.navigate('Historico')}
              />
              <QuickAccessCard
                title="Ver serviços"
                icon="heart-outline"
                onPress={() => navigation.navigate('Servicos')}
              />
              <QuickAccessCard
                title="Agenda"
                icon="calendar-outline"
                onPress={() => navigation.navigate('Agenda')}
              />
            </View>
          </View>
        </ScrollView>
        <BottomNavigation
          onHome={() => navigation.popToTop()}
          onSearch={() => navigation.navigate('BuscarCuidador')}
          onAgenda={() => navigation.navigate('Agenda')}
          onMessages={() => navigation.navigate('Mensagens')}
          onProfile={() => navigation.navigate('Perfil', perfil)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.text },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.text,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  user: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
  welcome: { color: '#E0D4DC', fontSize: 12 },
  name: { color: colors.surface, fontSize: 18, fontWeight: '700' },
  notification: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5C2D51',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 24, flexGrow: 1 },
  content: { gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    backgroundColor: '#EFEBF0',
    borderRadius: 16,
  },
  overline: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: { color: colors.text, fontWeight: '600', fontSize: 15 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16 },
  elder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
  },
  elderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1 },
  elderName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  details: { color: colors.muted, fontSize: 13, marginTop: 4 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
