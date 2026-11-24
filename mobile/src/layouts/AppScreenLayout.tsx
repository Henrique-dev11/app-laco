import {
  AtualizarWeb,
  gesto,
  type Atualizacao,
} from '../components/Atualizacao';
import { fs } from '../theme/tipografia';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import type { PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../accessibility/Texto';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import { MotionView } from '../motion/MotionView';
import { ESPACO_BOTAO } from '../utils/acessibilidade';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  tab?: 'Início' | 'Buscar' | 'Agenda' | 'Mensagens' | 'Perfil';
  headerRight?: ReactNode;
  formulario?: boolean;
  bloqueado?: boolean;
  atualizacao?: Atualizacao;
}>;
export function AppScreenLayout({
  children,
  title,
  subtitle,
  tab = 'Início',
  headerRight,
  formulario = false,
  bloqueado = false,
  atualizacao,
}: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [alturaCabecalho, setAlturaCabecalho] = useState(0);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View
          style={styles.header}
          onLayout={(event) =>
            setAlturaCabecalho(event.nativeEvent.layout.height)
          }
        >
          <TouchableOpacity
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            disabled={bloqueado}
            accessibilityState={{ disabled: bloqueado }}
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
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : formulario && Platform.OS === 'android'
                ? 'height'
                : undefined
          }
          keyboardVerticalOffset={
            Platform.OS === 'ios' ? insets.top + alturaCabecalho : 0
          }
        >
          <ScrollView
            refreshControl={gesto(atualizacao)}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <MotionView preset="fade" style={styles.content}>
              {children}
              <AtualizarWeb atualizacao={atualizacao} />
            </MotionView>
          </ScrollView>
        </KeyboardAvoidingView>
        {!formulario && (
          <BottomNavigation
            activeTab={tab}
            onHome={() => navigation.navigate('Home')}
            onSearch={() => navigation.navigate('BuscarCuidador')}
            onAgenda={() => navigation.navigate('Agenda')}
            onMessages={() => navigation.navigate('Mensagens')}
            onProfile={() => navigation.navigate('Perfil')}
          />
        )}
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
      backgroundColor: colors.headerSoft,
    },
    grow: { flex: 1 },
    overline: {
      color: colors.onHeader,
      fontSize: fs(10),
      fontWeight: '700',
      letterSpacing: 1.5,
    },
    title: {
      color: colors.surface,
      fontSize: fs(21),
      fontWeight: '700',
      marginTop: 3,
    },
    subtitle: { color: colors.onHeader, fontSize: fs(12), marginTop: 5 },
    // O espaço extra no fim deixa o conteúdo rolar para fora de trás do botão de acessibilidade.
    scroll: { flexGrow: 1, padding: 24, paddingBottom: 24 + ESPACO_BOTAO },
    content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 20 },
  });
