import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  tab?: 'Início' | 'Buscar' | 'Agenda' | 'Mensagens' | 'Perfil';
  headerRight?: ReactNode;
}>;
export function AppScreenLayout({
  children,
  title,
  subtitle,
  tab = 'Início',
  headerRight,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Home')
            }
          >
            <Ionicons name="chevron-back" size={23} color={colors.surface} />
          </TouchableOpacity>
          <View style={styles.grow}>
            <Text style={styles.overline}>LAÇO</Text>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight}
        </View>
        <KeyboardAvoidingView
          style={styles.grow}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
        <BottomNavigation
          activeTab={tab}
          onHome={() => navigation.navigate('Home')}
          onSearch={() => navigation.navigate('BuscarCuidador')}
          onAgenda={() => navigation.navigate('Agenda')}
          onMessages={() => navigation.navigate('Mensagens')}
          onProfile={() => navigation.navigate('Perfil')}
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 40,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#5C2D51',
  },
  grow: { flex: 1 },
  overline: {
    color: '#E0D4DC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.surface,
    fontSize: 21,
    fontWeight: '700',
    marginTop: 3,
  },
  subtitle: { color: '#E0D4DC', fontSize: 12, marginTop: 5 },
  scroll: { flexGrow: 1, padding: 24 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 20 },
});
