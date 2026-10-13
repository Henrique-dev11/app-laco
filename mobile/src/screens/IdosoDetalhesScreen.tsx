import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { api, mensagemErro } from '../services/api';
import { appStyles } from '../theme/appStyles';
import { colors } from '../theme';
import type { Endereco } from '../types/auth';
import type { ScreenProps } from '../types/navigation';

type Idoso = {
  nome: string;
  nomeSocial?: string | null;
  dataNascimento: string;
  cpf: string | null;
  telefone: string | null;
  endereco: Endereco;
  necessidadesEspeciais: string | null;
  observacoes: string | null;
};
export function IdosoDetalhesScreen({ route }: ScreenProps<'IdosoDetalhes'>) {
  const [idoso, setIdoso] = useState<Idoso | null>(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get<Idoso>(`/idosos/${route.params.idosoId}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (!controller.signal.aborted) setIdoso(response.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErro(mensagemErro(error));
      });
    return () => controller.abort();
  }, [route.params.idosoId, tentativa]);
  return (
    <AppScreenLayout
      title="Perfil do idoso"
      subtitle="Conheça os dados de quem você cuida"
      tab="Perfil"
    >
      {!idoso && !erro && <ActivityIndicator color={colors.primary} />}
      {!!erro && (
        <>
          <Notice>{erro}</Notice>
          <Button
            title="Tentar novamente"
            onPress={() => {
              setErro('');
              setTentativa((value) => value + 1);
            }}
          />
        </>
      )}
      {!!idoso && (
        <View style={appStyles.card}>
          <Text style={appStyles.name}>{idoso.nomeSocial || idoso.nome}</Text>
          <Text style={appStyles.text}>
            Nascimento:{' '}
            {new Date(idoso.dataNascimento).toLocaleDateString('pt-BR', {
              timeZone: 'UTC',
            })}
          </Text>
          {!!idoso.cpf && <Text style={appStyles.text}>CPF: {idoso.cpf}</Text>}
          <Text style={appStyles.text}>
            {idoso.endereco.rua}, {idoso.endereco.numero} ·{' '}
            {idoso.endereco.cidade}/{idoso.endereco.estado}
          </Text>
          {!!idoso.necessidadesEspeciais && (
            <Text style={appStyles.text}>
              Cuidados: {idoso.necessidadesEspeciais}
            </Text>
          )}
          {!!idoso.observacoes && (
            <Text style={appStyles.text}>{idoso.observacoes}</Text>
          )}
        </View>
      )}
    </AppScreenLayout>
  );
}
