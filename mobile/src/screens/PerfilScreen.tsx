import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScreenProps } from '../types/navigation';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { DadoPerfil, SecaoPerfil } from '../components/SecaoPerfil';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useCadastro } from '../contexts/CadastroContext';
import { mensagemErro } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { statusLabels, useAppStyles } from '../theme/appStyles';
import { dataParaFormulario, resumoEndereco } from '../utils/perfis';
import { formatarCpf, formatarTelefone } from '../utils/validation';

export function PerfilScreen({ navigation, route }: ScreenProps<'Perfil'>) {
  const appStyles = useAppStyles();
  const colors = useTheme();
  const { usuario, fotoPendente, sair } = useAuth();
  const { limparCadastro } = useCadastro();
  const [erro, setErro] = useState('');
  const [saindo, setSaindo] = useState(false);
  if (!usuario) return null;
  const perfil = usuario.cuidador ?? usuario.responsavel;
  const proprio = usuario.responsavel?.responsavelIdosos.find(
    (item) => item.parentesco === 'PROPRIO',
  )?.idoso;
  const tipo = usuario.cuidador
    ? 'Cuidador'
    : usuario.responsavel?.responsavelIdosos.some(
          (item) => item.parentesco === 'PROPRIO',
        )
      ? 'Idoso independente'
      : 'Responsável';
  async function encerrarSessao() {
    setSaindo(true);
    setErro('');
    try {
      await sair();
      limparCadastro();
    } catch (error) {
      setErro(mensagemErro(error));
      setSaindo(false);
    }
  }
  return (
    <AppScreenLayout
      title="Meu perfil"
      subtitle="Suas informações em um só lugar"
      tab="Perfil"
    >
      {!!route.params?.mensagem && <Notice>{route.params.mensagem}</Notice>}
      <View style={[appStyles.card, styles.identity]}>
        <Avatar
          nome={usuario.nomeSocial || usuario.nome}
          usuarioId={usuario.id}
          versao={usuario.foto?.updatedAt}
          tamanho={104}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          {usuario.nomeSocial || usuario.nome}
        </Text>
        <View style={[appStyles.badge, styles.centerBadge]}>
          <Text style={appStyles.badgeText}>{tipo}</Text>
        </View>
        <Text selectable style={[appStyles.text, styles.center]}>
          {usuario.email}
        </Text>
        {!!usuario.cuidador && (
          <Text style={appStyles.helper}>
            Verificação: {statusLabels[usuario.cuidador.statusVerificacao]}
          </Text>
        )}
      </View>
      <SecaoPerfil titulo="Dados pessoais" icone="person-outline">
        <DadoPerfil label="Nome completo" value={usuario.nome} />
        {!!usuario.nomeSocial && (
          <DadoPerfil label="Nome social" value={usuario.nomeSocial} />
        )}
        {!!perfil && (
          <>
            <DadoPerfil
              label="Data de nascimento"
              value={dataParaFormulario(perfil.dataNascimento)}
            />
            <DadoPerfil label="CPF" value={formatarCpf(perfil.cpf)} />
            <View style={appStyles.separator} />
            <DadoPerfil
              label="Telefone principal"
              value={formatarTelefone(perfil.telefone)}
            />
            {!!usuario.telefone2 && (
              <DadoPerfil
                label="Telefone secundário"
                value={formatarTelefone(usuario.telefone2)}
              />
            )}
            <DadoPerfil
              label="Endereço"
              value={resumoEndereco(perfil.endereco)}
            />
          </>
        )}
      </SecaoPerfil>
      {!!proprio &&
        (proprio.sexo ||
          proprio.necessidadesEspeciais ||
          proprio.observacoes) && (
          <SecaoPerfil titulo="Informações de cuidado" icone="heart-outline">
            {!!proprio.sexo && <DadoPerfil label="Sexo" value={proprio.sexo} />}
            {!!proprio.necessidadesEspeciais && (
              <DadoPerfil
                label="Necessidades especiais"
                value={proprio.necessidadesEspeciais}
              />
            )}
            {!!proprio.observacoes && (
              <DadoPerfil label="Observações" value={proprio.observacoes} />
            )}
          </SecaoPerfil>
        )}
      {!!usuario.cuidador && (
        <SecaoPerfil titulo="Dados profissionais" icone="briefcase-outline">
          {!!usuario.cuidador.biografia && (
            <DadoPerfil label="Biografia" value={usuario.cuidador.biografia} />
          )}
          {!!usuario.cuidador.experienciaProfissional && (
            <DadoPerfil
              label="Experiência profissional"
              value={usuario.cuidador.experienciaProfissional}
            />
          )}
          {!!usuario.cuidador.registroProfissional && (
            <DadoPerfil
              label="Registro profissional"
              value={usuario.cuidador.registroProfissional}
            />
          )}
          {!!usuario.cuidador.curriculo && (
            <DadoPerfil
              label="Currículo salvo"
              value={usuario.cuidador.curriculo.nome}
            />
          )}
          <Button
            title="Configurar meus serviços"
            variant="outline"
            onPress={() => navigation.navigate('MeusServicos')}
          />
        </SecaoPerfil>
      )}
      {!!fotoPendente && (
        <Notice>
          {fotoPendente.idosoId && fotoPendente.idosoId !== proprio?.id
            ? 'Há uma foto recuperada para um idoso. Abra o perfil dele em “Meus idosos” para revisar e salvar.'
            : 'Há uma foto recuperada da câmera ou galeria. Acesse “Editar perfil” para revisar e salvar.'}
        </Notice>
      )}
      {!!erro && <Notice>{erro}</Notice>}
      <View style={styles.actions}>
        {!!perfil && (
          <Button
            title="Editar perfil"
            disabled={saindo}
            onPress={() => {
              navigation.setParams({ mensagem: undefined });
              navigation.navigate('EditarPerfil');
            }}
          />
        )}
        {!!usuario.responsavel && !proprio && (
          <Button
            title="Meus idosos"
            variant="outline"
            disabled={saindo}
            onPress={() => navigation.navigate('MeusIdosos')}
          />
        )}
        <Button
          title={saindo ? 'Saindo...' : 'Sair da conta'}
          variant="outline"
          color={colors.header}
          disabled={saindo}
          onPress={() => {
            void encerrarSessao();
          }}
        />
      </View>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  title: { fontSize: 25, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  center: { textAlign: 'center' },
  centerBadge: { alignSelf: 'center' },
  actions: { gap: 12 },
});
