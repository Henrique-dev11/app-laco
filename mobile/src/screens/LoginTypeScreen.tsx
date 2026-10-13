import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { perfis } from '../constants/cadastro';
import { useCadastro } from '../contexts/CadastroContext';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { colors } from '../theme';
import type { Perfil } from '../types/cadastro';
import type { ScreenProps } from '../types/navigation';

export function LoginTypeScreen({ navigation }: ScreenProps<'LoginType'>) {
  const { iniciarCadastro } = useCadastro();
  function selecionar(perfil: Perfil) {
    iniciarCadastro(perfil);
    const route = {
      cuidador: 'CuidadorStep1',
      responsavel: 'ResponsavelStep1',
      idoso: 'IdosoStep1',
    } as const;
    navigation.navigate(route[perfil]);
  }
  return (
    <ScreenLayout
      backgroundColor={colors.background}
      contentStyle={styles.content}
    >
      <View style={styles.header}>
        <Image
          source={require('../../assets/laco/logo-profile-selection.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Como você vai usar o Laço?</Text>
        <Text style={styles.subtitle}>Escolha seu perfil de acesso</Text>
      </View>
      <View style={styles.buttons}>
        {(['cuidador', 'responsavel', 'idoso'] as const).map((perfil) => (
          <Button
            key={perfil}
            title={perfis[perfil].titulo}
            color={perfis[perfil].color}
            imageSource={perfis[perfil].icon}
            onPress={() => selecionar(perfil)}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.subtitle}>
          Já tem uma conta?{' '}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            Entrar
          </Text>
        </Text>
        <Text style={styles.terms}>
          Ao continuar, você concorda com nossos Termos de Uso e Política de
          Privacidade.
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between', gap: 32 },
  header: { alignItems: 'center', gap: 8 },
  logo: { width: 180, height: 180, resizeMode: 'contain' },
  title: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  buttons: { gap: 16 },
  footer: { gap: 12 },
  link: { color: colors.primaryDark, fontWeight: '700' },
  terms: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
