import type { ScreenProps } from '../types/navigation';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useCadastro } from '../contexts/CadastroContext';
import { mensagemErro } from '../services/api';
import {
  escolherEEnviarFoto,
  removerFoto,
  tirarEEnviarFoto,
} from '../services/foto';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { statusLabels, useAppStyles } from '../theme/appStyles';

export function PerfilScreen({ navigation }: ScreenProps<'Perfil'>) {
  const appStyles = useAppStyles();
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario, atualizar, sair } = useAuth();
  const { limparCadastro } = useCadastro();
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
        <Avatar
          nome={usuario.nomeSocial || usuario.nome}
          usuarioId={usuario.id}
          versao={usuario.foto?.updatedAt}
          tamanho={96}
        />
        <View style={styles.fotoAcoes}>
          <Button
            title="Tirar foto"
            variant="outline"
            disabled={enviando}
            onPress={() => {
              void executar(async () => {
                if (await tirarEEnviarFoto()) await atualizar();
              }, '');
            }}
          />
          <Button
            title="Escolher da galeria"
            variant="outline"
            disabled={enviando}
            onPress={() => {
              void executar(async () => {
                if (await escolherEEnviarFoto()) await atualizar();
              }, '');
            }}
          />
          {!!usuario.foto && (
            <Button
              title="Remover foto"
              variant="outline"
              color={colors.error}
              disabled={enviando}
              onPress={() => {
                void executar(async () => {
                  await removerFoto();
                  await atualizar();
                }, '');
              }}
            />
          )}
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
        <Text style={appStyles.text}>{usuario.nome}</Text>
        {!!usuario.nomeSocial && (
          <Text style={appStyles.text}>Nome social: {usuario.nomeSocial}</Text>
        )}
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
        {!!usuario.cuidador?.biografia && (
          <Text style={appStyles.text}>
            Biografia: {usuario.cuidador.biografia}
          </Text>
        )}
        {!!usuario.cuidador?.experienciaProfissional && (
          <Text style={appStyles.text}>
            Experiência: {usuario.cuidador.experienciaProfissional}
          </Text>
        )}
        {!!usuario.cuidador?.registroProfissional && (
          <Text style={appStyles.text}>
            Registro profissional: {usuario.cuidador.registroProfissional}
          </Text>
        )}
        {!!usuario.cuidador?.curriculo && (
          <Text style={appStyles.text}>
            Currículo salvo: {usuario.cuidador.curriculo.nome}
          </Text>
        )}
      </View>
      {!!usuario.cuidador && (
        <Button
          title="Configurar meus serviços"
          variant="outline"
          onPress={() => navigation.navigate('MeusServicos')}
        />
      )}
      {!!mensagem && <Notice>{mensagem}</Notice>}
      {!!perfil && (
        <Button
          title="Editar meus dados"
          disabled={enviando}
          onPress={() =>
            navigation.navigate(
              usuario.cuidador ? 'EditarCuidador' : 'EditarResponsavel',
            )
          }
        />
      )}
      {!!usuario.responsavel && (
        <Button
          title="Meus idosos"
          variant="outline"
          onPress={() => navigation.navigate('MeusIdosos')}
        />
      )}
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
        color={colors.header}
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
const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    centerBadge: { alignSelf: 'center' },
    identity: { alignItems: 'center', gap: 8, paddingVertical: 12 },
    fotoAcoes: { alignSelf: 'stretch', gap: 8, marginBottom: 8 },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.avatarBg,
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
