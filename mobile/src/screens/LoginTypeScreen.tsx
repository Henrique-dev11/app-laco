import { AtalhoAcessibilidade } from '../accessibility/AtalhoAcessibilidade';
import { fs, lh } from '../theme/tipografia';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { Button } from '../components/Button';
import { perfis } from '../constants/cadastro';
import { useCadastro } from '../contexts/CadastroContext';
import { useLoginEntryMotion } from '../motion/useLoginEntryMotion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { corDoPerfil, type Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { Perfil } from '../types/cadastro';
import type { ScreenProps } from '../types/navigation';

export function LoginTypeScreen({ navigation }: ScreenProps<'LoginType'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const motion = useLoginEntryMotion();
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
      animateEntry={false}
      backgroundColor={colors.background}
      contentStyle={styles.content}
    >
      <View style={styles.header}>
        <Animated.Image
          source={require('../../assets/laco/logo-profile-selection.png')}
          style={[styles.logo, motion.logo]}
        />
        <Animated.View style={[styles.heading, motion.heading]}>
          <Text style={styles.title}>Como você vai usar o Laço?</Text>
          <Text style={styles.subtitle}>Escolha seu perfil de acesso</Text>
        </Animated.View>
      </View>
      <View style={styles.buttons}>
        {(['cuidador', 'responsavel', 'idoso'] as const).map(
          (perfil, index) => (
            <Animated.View key={perfil} style={motion.buttons[index]}>
              <Button
                title={perfis[perfil].titulo}
                color={corDoPerfil(colors, perfil)}
                imageSource={perfis[perfil].icon}
                onPress={() => selecionar(perfil)}
              />
            </Animated.View>
          ),
        )}
      </View>
      <Animated.View style={[styles.footer, motion.footer]}>
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
      </Animated.View>
      <AtalhoAcessibilidade />
    </ScreenLayout>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    content: { justifyContent: 'space-between', gap: 32 },
    header: { alignItems: 'center', gap: 8 },
    heading: { alignItems: 'center', gap: 8 },
    logo: { width: 180, height: 180, resizeMode: 'contain' },
    title: {
      fontSize: fs(22),
      color: colors.text,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: { color: colors.muted, fontSize: fs(14), textAlign: 'center' },
    buttons: { gap: 16 },
    footer: { gap: 12 },
    link: { color: colors.primaryDark, fontWeight: '700' },
    terms: {
      color: colors.muted,
      fontSize: fs(12),
      textAlign: 'center',
      lineHeight: lh(18),
    },
  });
