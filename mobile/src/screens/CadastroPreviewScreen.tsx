import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { StepHeader } from '../components/StepHeader';
import { perfis } from '../constants/cadastro';
import { useCadastro } from '../contexts/CadastroContext';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { valoresOferta } from '../utils/ofertas';
import { salvarCadastro } from '../services/cadastro';
import { mensagemErro } from '../services/api';
import { useListaApi } from '../hooks/useListaApi';
import { colors } from '../theme';
import type { Servico } from '../types/servico';
import type { ScreenProps } from '../types/navigation';

export function CadastroPreviewScreen({
  navigation,
}: ScreenProps<'CadastroPreview'>) {
  const { cadastro, limparCadastro } = useCadastro();
  const [config] = useState(() => perfis[cadastro.perfil]);
  const { dados: servicos } = useListaApi<Servico>('/servicos');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  async function salvar() {
    if (enviando || salvo) return;
    setEnviando(true);
    setErro('');
    try {
      await salvarCadastro(cadastro);
      limparCadastro();
      setSalvo(true);
    } catch (error) {
      setErro(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <ScreenLayout
      header={
        !salvo && (
          <StepHeader
            step={config.etapas}
            total={config.etapas}
            color={config.color}
            onBack={() => {
              if (!enviando) navigation.goBack();
            }}
          />
        )
      }
    >
      <Text style={styles.title}>
        {salvo ? 'Cadastro concluído' : 'Dados revisados'}
      </Text>
      {salvo ? (
        <>
          <Notice>
            Seus dados foram salvos. Entre com o e-mail e a senha cadastrados.
          </Notice>
          <Button
            title="Ir para o login"
            color={config.color}
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
            }
          />
        </>
      ) : (
        <>
          <Notice>Confira seus dados antes de concluir o cadastro.</Notice>
          <View style={styles.card}>
            <Text style={styles.name}>
              {cadastro.pessoal.nomeSocial || cadastro.pessoal.nomeCompleto}
            </Text>
            <Text style={styles.text}>{config.titulo}</Text>
            <Text style={styles.text}>{cadastro.pessoal.email}</Text>
            <Text style={styles.text}>
              {cadastro.documentos.rua}, {cadastro.documentos.numeroCasa} ·{' '}
              {cadastro.documentos.cidade}/{cadastro.documentos.estado}
            </Text>
            {cadastro.perfil === 'responsavel' && (
              <Text style={styles.text}>
                Idoso: {cadastro.idoso.nomeCompleto}
              </Text>
            )}
            <Text style={styles.text}>
              Serviços:{' '}
              {cadastro.perfil === 'cuidador'
                ? cadastro.ofertas.map((o) => o.nome).join(', ')
                : cadastro.servicos
                    .map((id) => servicos.find((item) => item.id === id)?.nome)
                    .filter(Boolean)
                    .join(', ') || `${cadastro.servicos.length} selecionado(s)`}
            </Text>
            {cadastro.perfil === 'cuidador' &&
              cadastro.ofertas.map((o) => (
                <Text key={o.servicoId ?? o.nome} style={styles.text}>
                  {o.nome}: R${' '}
                  {valoresOferta(o).preco.toFixed(2).replace('.', ',')} ·{' '}
                  {valoresOferta(o).duracaoMinutos} minutos (referência)
                </Text>
              ))}
            {!!cadastro.curriculo && (
              <Text style={styles.text}>
                Currículo: {cadastro.curriculo.name}
              </Text>
            )}
          </View>
          {!!erro && <Notice>{erro}</Notice>}
          <Button
            loading={enviando}
            title={enviando ? 'Salvando...' : 'Confirmar cadastro'}
            color={config.color}
            disabled={enviando}
            onPress={() => {
              void salvar();
            }}
          />
          <Button
            title="Revisar dados"
            variant="outline"
            disabled={enviando}
            onPress={() => navigation.goBack()}
          />
        </>
      )}
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
