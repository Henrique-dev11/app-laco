import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { useAuth } from '../contexts/AuthContext';
import { mensagemErro } from '../services/api';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { colors } from '../theme';
import type { ScreenProps } from '../types/navigation';
import { emailValido } from '../utils/validation';

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errors, setErrors] = useState<{ email?: string; senha?: string }>({});
  const [notice, setNotice] = useState('');
  const { entrar: autenticar } = useAuth();
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    if (enviando) return;
    const nextErrors = {
      email: emailValido(email) ? undefined : 'Digite um e-mail válido',
      senha: senha ? undefined : 'Preencha a senha',
    };
    setErrors(nextErrors);
    setNotice('');
    if (nextErrors.email || nextErrors.senha) return;
    setEnviando(true);
    try {
      await autenticar(email, senha);
      setSenha('');
    } catch (error) {
      setNotice(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <Image
          source={require('../../assets/laco/logo-login.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Login</Text>
      </View>
      <FormField
        label="Digite seu e-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <FormField
        label="Digite sua senha"
        password
        value={senha}
        onChangeText={setSenha}
        error={errors.senha}
      />
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.forgot}
        onPress={() =>
          setNotice(
            'A recuperação de senha ainda não está disponível. Procure a equipe do Laço se precisar de ajuda.',
          )
        }
      >
        <Text style={styles.link}>Esqueci minha senha</Text>
      </TouchableOpacity>
      <Button
        title={enviando ? 'Entrando...' : 'Entrar'}
        color={colors.elderly}
        disabled={enviando}
        onPress={() => {
          void entrar();
        }}
      />
      {!!notice && <Notice>{notice}</Notice>}
      <View style={styles.social}>
        <Text style={styles.muted}>Outras formas de acesso · em breve</Text>
        <View style={styles.row}>
          {[
            {
              name: 'Google',
              icon: require('../../assets/laco/social-google.png'),
            },
            {
              name: 'Facebook',
              icon: require('../../assets/laco/social-facebook.png'),
            },
          ].map((provider) => (
            <TouchableOpacity
              key={provider.name}
              accessibilityRole="button"
              accessibilityLabel={`Entrar com ${provider.name}`}
              style={styles.socialButton}
              onPress={() =>
                setNotice(
                  `O login com ${provider.name} ainda não está disponível.`,
                )
              }
            >
              <Image source={provider.icon} style={styles.socialIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={styles.footer}>
        Não tem uma conta?{' '}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => navigation.navigate('LoginType')}
        >
          Cadastre-se
        </Text>
      </Text>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 8 },
  logo: { width: 220, height: 220, resizeMode: 'contain' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  link: { color: colors.primaryDark, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13 },
  forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  social: { alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', gap: 20 },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: { width: 24, height: 24, resizeMode: 'contain' },
  footer: { textAlign: 'center', fontSize: 13, color: colors.muted },
});
