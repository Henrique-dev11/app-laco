import type { PropsWithChildren } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StepHeader } from '../components/StepHeader';
import { perfis } from '../constants/cadastro';
import { colors } from '../theme';
import type { Perfil } from '../types/cadastro';
import type { RootStackParamList } from '../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = PropsWithChildren<{
  perfil: Perfil;
  step: number;
  title: string;
  subtitle: string;
  showLogo?: boolean;
}>;

export function RegistrationLayout({
  perfil,
  step,
  title,
  subtitle,
  showLogo = true,
  children,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const config = perfis[perfil];
  return (
    <ScreenLayout
      header={
        <StepHeader
          step={step}
          total={config.etapas}
          color={config.color}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <View style={styles.header}>
        {showLogo && <Image source={config.logo} style={styles.logo} />}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {children}
      <Text style={styles.footer}>
        Já possui uma conta?{' '}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => navigation.navigate('Login')}
        >
          Entre
        </Text>
      </Text>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 6 },
  logo: { width: 190, height: 190, resizeMode: 'contain' },
  title: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  footer: { textAlign: 'center', fontSize: 13, color: colors.muted },
  link: { color: colors.primaryDark, fontWeight: '700' },
});
