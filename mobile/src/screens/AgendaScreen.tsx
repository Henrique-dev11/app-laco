import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { appStyles, statusLabels } from '../theme/appStyles';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';
import type { ScreenProps } from '../types/navigation';

type Agendamento = {
  id: number;
  inicio: string;
  fim: string;
  ativo: boolean;
  contratacao: {
    status: string;
    idoso: { nome: string };
    cuidadorServico: {
      servico: { nome: string };
      cuidador: { usuario: { nome: string } };
    };
  };
};
export function AgendaScreen({ navigation }: ScreenProps<'Agenda'>) {
  const { usuario } = useAuth();
  const { dados, carregando, erro, atualizar } =
    useListaApi<Agendamento>('/agendamentos');
  const formato = (value: string) =>
    new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return (
    <AppScreenLayout
      title="Agenda"
      subtitle="Seus próximos cuidados"
      tab="Agenda"
    >
      <Text style={appStyles.text}>Atendimentos · horário de São Paulo</Text>
      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !dados.length && (
        <Notice>
          Nenhum atendimento agendado. Após a aceitação do cuidador, o
          responsável pode escolher o horário no histórico de contratações.
        </Notice>
      )}
      {dados.map((item) => (
        <View key={item.id} style={appStyles.card}>
          <Text style={appStyles.text}>
            {item.contratacao.cuidadorServico.servico.nome} ·{' '}
            {item.ativo ? statusLabels[item.contratacao.status] : 'Cancelado'}
          </Text>
          <Text style={appStyles.text}>
            {item.contratacao.idoso.nome} ·{' '}
            {item.contratacao.cuidadorServico.cuidador.usuario.nome}
          </Text>
          <Text style={appStyles.text}>Início: {formato(item.inicio)}</Text>
          <Text style={appStyles.text}>Fim: {formato(item.fim)}</Text>
        </View>
      ))}
      <Button
        title="Atualizar agenda"
        variant="outline"
        disabled={carregando}
        onPress={atualizar}
      />
      {!!usuario?.cuidador && (
        <Button
          title="Definir minha disponibilidade"
          onPress={() => navigation.navigate('Disponibilidade')}
        />
      )}
    </AppScreenLayout>
  );
}
