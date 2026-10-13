import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { perfis } from '../constants/cadastro';
import { useCadastro } from '../contexts/CadastroContext';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { StepHeader } from '../components/StepHeader';
import { colors } from '../theme';
import type { ResumoPerfil } from '../types/cadastro';
import type { ScreenProps } from '../types/navigation';

export function CadastroPreviewScreen({
  navigation,
}: ScreenProps<'CadastroPreview'>) {
  const { cadastro, limparCadastro } = useCadastro();
  const config = perfis[cadastro.perfil];
  function explorar() {
    const resumo: ResumoPerfil = {
      perfil: cadastro.perfil,
      nomeCompleto: cadastro.pessoal.nomeCompleto.trim(),
      nomeSocial: cadastro.pessoal.nomeSocial.trim(),
      email: cadastro.pessoal.email.trim(),
      nomeCompletoIdoso:
        cadastro.perfil === 'responsavel'
          ? cadastro.idoso.nomeCompleto.trim()
          : cadastro.perfil === 'idoso'
            ? cadastro.pessoal.nomeCompleto.trim()
            : undefined,
    };
    limparCadastro();
    navigation.reset({ index: 0, routes: [{ name: 'Home', params: resumo }] });
  }
  return (
    <ScreenLayout
      header={
        <StepHeader
          step={config.etapas}
          total={config.etapas}
          color={config.color}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <Text style={styles.title}>Dados revisados</Text>
      <Notice>
        Este é um rascunho para demonstração. O cadastro ainda não foi enviado
        nem salvo. O login ficará disponível após a integração.
      </Notice>
      <View style={styles.card}>
        <Text style={styles.name}>
          {cadastro.pessoal.nomeSocial || cadastro.pessoal.nomeCompleto}
        </Text>
        <Text style={styles.text}>{config.titulo}</Text>
        <Text style={styles.text}>{cadastro.pessoal.email}</Text>
        {cadastro.perfil === 'responsavel' && (
          <Text style={styles.text}>Idoso: {cadastro.idoso.nomeCompleto}</Text>
        )}
        <Text style={styles.text}>
          Serviços: {cadastro.servicos.join(', ')}
        </Text>
        {cadastro.curriculo && (
          <Text style={styles.text}>
            Currículo selecionado: {cadastro.curriculo.name}
          </Text>
        )}
      </View>
      <Button
        title="Explorar demonstração"
        color={config.color}
        onPress={explorar}
      />
      <Button
        title="Revisar dados"
        variant="outline"
        onPress={() => navigation.goBack()}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  name: { color: colors.text, fontSize: 20, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
