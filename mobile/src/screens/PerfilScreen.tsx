import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useCadastro } from '../contexts/CadastroContext';
import { api, mensagemErro } from '../services/api';
import { colors } from '../theme';
import { appStyles, statusLabels } from '../theme/appStyles';

export function PerfilScreen() {
  const { usuario, atualizar, sair } = useAuth();
  const { limparCadastro } = useCadastro();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [nomeSocial, setNomeSocial] = useState(usuario?.nomeSocial ?? '');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  if (!usuario) return null;
  const perfil = usuario.cuidador ?? usuario.responsavel;
  async function executar(acao: () => Promise<void>, sucesso: string) {
    setEnviando(true);
    setMensagem('');
    try {
      await acao();
      setMensagem(sucesso);
    } catch (error) {
      setMensagem(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <AppScreenLayout
      title="Meu perfil"
      subtitle="Seus dados e seu acesso ao Laço"
      tab="Perfil"
    >
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>
            {(usuario.nomeSocial || usuario.nome).charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title}>{usuario.nomeSocial || usuario.nome}</Text>
        <Text style={appStyles.text}>
          {usuario.cuidador
            ? 'Cuidador'
            : usuario.responsavel?.responsavelIdosos.some(
                  (item) => item.parentesco === 'PROPRIO',
                )
              ? 'Idoso'
              : 'Responsável'}
        </Text>
        <Text style={appStyles.text}>{usuario.email}</Text>
        {!!usuario.cuidador && (
          <View style={[appStyles.badge, styles.centerBadge]}>
            <Text style={appStyles.badgeText}>
              {statusLabels[usuario.cuidador.statusVerificacao]}
            </Text>
          </View>
        )}
      </View>
      <View style={appStyles.card}>
        <Text style={appStyles.section}>Dados pessoais</Text>
        <FormField label="Nome completo" value={nome} onChangeText={setNome} />
        <FormField
          label="Nome social"
          value={nomeSocial}
          onChangeText={setNomeSocial}
        />
        {!!perfil && (
          <>
            <View style={appStyles.separator} />
            <Text style={appStyles.text}>Telefone: {perfil.telefone}</Text>
            <Text style={appStyles.text}>CPF: {perfil.cpf}</Text>
            <Text style={appStyles.text}>
              {perfil.endereco.rua}, {perfil.endereco.numero} ·{' '}
              {perfil.endereco.cidade}/{perfil.endereco.estado}
            </Text>
          </>
        )}
        {!!usuario.cuidador?.curriculo && (
          <Text style={appStyles.text}>
            Currículo salvo: {usuario.cuidador.curriculo.nome}
          </Text>
        )}
      </View>
      {!!mensagem && <Notice>{mensagem}</Notice>}
      <Button
        title={enviando ? 'Aguarde...' : 'Salvar alterações'}
        color={usuario.cuidador ? colors.caregiver : colors.responsible}
        disabled={enviando || !nome.trim()}
        onPress={() => {
          void executar(async () => {
            await api.patch(`/usuarios/${usuario.id}`, {
              nome: nome.trim(),
              nomeSocial: nomeSocial.trim(),
            });
            await atualizar();
          }, 'Perfil atualizado.');
        }}
      />
      <Button
        title="Atualizar dados"
        variant="outline"
        disabled={enviando}
        onPress={() => {
          void executar(atualizar, 'Dados atualizados.');
        }}
      />
      <Button
        title="Sair da conta"
        color={colors.elderly}
        disabled={enviando}
        onPress={() => {
          void executar(async () => {
            await sair();
            limparCadastro();
          }, '');
        }}
      />
    </AppScreenLayout>
  );
}
const styles = StyleSheet.create({
  centerBadge: { alignSelf: 'center' },
  identity: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EADDEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  initial: { fontSize: 30, fontWeight: '700', color: colors.primaryDark },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
});
