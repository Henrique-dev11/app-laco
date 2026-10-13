import { StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { perfis } from '../constants/cadastro';
import { useCadastro } from '../contexts/CadastroContext';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { colors } from '../theme';
import type { ScreenProps } from '../types/navigation';

export function PerfilScreen({ navigation, route }: ScreenProps<'Perfil'>) {
  const perfil = route.params;
  const { limparCadastro } = useCadastro();
  return (
    <ScreenLayout topInset={false}>
      <Text style={styles.title}>
        {perfil?.nomeSocial || perfil?.nomeCompleto || 'Perfil de demonstração'}
      </Text>
      {perfil && (
        <Text style={styles.text}>{perfis[perfil.perfil].titulo}</Text>
      )}
      {!!perfil?.email && <Text style={styles.text}>{perfil.email}</Text>}
      <Notice>
        Os dados deste perfil são temporários e ainda não foram salvos.
      </Notice>
      <Button
        title="Voltar"
        variant="outline"
        onPress={() => navigation.goBack()}
      />
      <Button
        title="Sair da demonstração"
        color={colors.elderly}
        onPress={() => {
          limparCadastro();
          navigation.reset({ index: 0, routes: [{ name: 'LoginType' }] });
        }}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 16 },
});
