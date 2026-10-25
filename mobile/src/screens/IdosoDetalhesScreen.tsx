import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { DadoPerfil, SecaoPerfil } from '../components/SecaoPerfil';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { useAppStyles } from '../theme/appStyles';
import { useTheme } from '../theme/ThemeContext';
import { dataParaFormulario, resumoEndereco } from '../utils/perfis';
import { formatarCpf, formatarTelefone } from '../utils/validation';
import type { Idoso } from '../types/auth';
import type { ScreenProps } from '../types/navigation';

export function IdosoDetalhesScreen({
  route,
  navigation,
}: ScreenProps<'IdosoDetalhes'>) {
  const appStyles = useAppStyles();
  const colors = useTheme();
  const { usuario, fotoPendente } = useAuth();
  const [idoso, setIdoso] = useState<Idoso | null>(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const proprio = usuario?.responsavel?.responsavelIdosos.some(
    (vinculo) =>
      vinculo.parentesco === 'PROPRIO' &&
      vinculo.idoso.id === route.params.idosoId,
  );
  useFocusEffect(
    useCallback(() => {
      setIdoso(null);
      setErro('');
      const controller = new AbortController();
      api
        .get<Idoso>(`/idosos/${route.params.idosoId}`, {
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (!controller.signal.aborted) setIdoso(data);
        })
        .catch((error) => {
          if (!controller.signal.aborted) setErro(mensagemErro(error));
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- tentativa permite repetir a consulta após erro.
    }, [route.params.idosoId, tentativa]),
  );
  return (
    <AppScreenLayout
      title="Perfil do idoso"
      subtitle="Informações pessoais e de cuidado"
      tab="Perfil"
    >
      {!!route.params.mensagem && <Notice>{route.params.mensagem}</Notice>}
      {!idoso && !erro && <ActivityIndicator color={colors.primary} />}
      {!!erro && (
        <>
          <Notice>{erro}</Notice>
          <Button
            title="Tentar novamente"
            onPress={() => setTentativa((n) => n + 1)}
          />
        </>
      )}
      {!!idoso && (
        <>
          <View
            style={[
              appStyles.card,
              { alignItems: 'center', paddingVertical: 24, gap: 10 },
            ]}
          >
            <Avatar
              nome={idoso.nomeSocial || idoso.nome}
              idosoId={idoso.id}
              versao={idoso.foto?.updatedAt}
              tamanho={104}
            />
            <Text
              style={[appStyles.name, { textAlign: 'center', fontSize: 25 }]}
            >
              {idoso.nomeSocial || idoso.nome}
            </Text>
            <View style={[appStyles.badge, { alignSelf: 'center' }]}>
              <Text style={appStyles.badgeText}>
                {proprio ? 'Idoso independente' : 'Idoso'}
              </Text>
            </View>
            {!!proprio && <Text style={appStyles.text}>{usuario?.email}</Text>}
          </View>
          <SecaoPerfil titulo="Dados pessoais" icone="person-outline">
            <DadoPerfil label="Nome completo" value={idoso.nome} />
            {!!idoso.nomeSocial && (
              <DadoPerfil label="Nome social" value={idoso.nomeSocial} />
            )}
            <DadoPerfil
              label="Data de nascimento"
              value={dataParaFormulario(idoso.dataNascimento)}
            />
            {!!idoso.cpf && (
              <DadoPerfil label="CPF" value={formatarCpf(idoso.cpf)} />
            )}
            {!!idoso.sexo && <DadoPerfil label="Sexo" value={idoso.sexo} />}
          </SecaoPerfil>
          <SecaoPerfil titulo="Contato e endereço" icone="location-outline">
            {!!idoso.telefone && (
              <DadoPerfil
                label="Telefone"
                value={formatarTelefone(idoso.telefone)}
              />
            )}
            <DadoPerfil
              label="Endereço"
              value={resumoEndereco(idoso.endereco)}
            />
            {!!idoso.endereco.complemento && (
              <DadoPerfil
                label="Complemento"
                value={idoso.endereco.complemento}
              />
            )}
          </SecaoPerfil>
          <SecaoPerfil titulo="Informações de cuidado" icone="heart-outline">
            {idoso.necessidadesEspeciais || idoso.observacoes ? (
              <>
                {!!idoso.necessidadesEspeciais && (
                  <DadoPerfil
                    label="Necessidades especiais"
                    value={idoso.necessidadesEspeciais}
                  />
                )}
                {!!idoso.observacoes && (
                  <DadoPerfil label="Observações" value={idoso.observacoes} />
                )}
              </>
            ) : (
              <Text style={appStyles.helper}>
                Nenhuma informação de cuidado adicionada.
              </Text>
            )}
          </SecaoPerfil>
          {fotoPendente?.idosoId === idoso.id && (
            <Notice>
              Há uma foto recuperada para este idoso. Acesse “Editar perfil”
              para revisar e salvar.
            </Notice>
          )}
          <Button
            title="Editar perfil"
            onPress={() => {
              navigation.setParams({ mensagem: undefined });
              if (proprio) navigation.navigate('EditarPerfil');
              else navigation.navigate('EditarIdoso', { idosoId: idoso.id });
            }}
          />
        </>
      )}
    </AppScreenLayout>
  );
}
