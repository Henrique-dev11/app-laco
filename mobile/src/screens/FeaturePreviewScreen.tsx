import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const descriptions = {
  BuscarCuidador:
    'A busca por cuidadores ficará disponível após a integração. Você já pode consultar o catálogo de serviços.',
  Historico:
    'As contratações realizadas aparecerão aqui. Ainda não há histórico nesta demonstração.',
  Agenda:
    'Os próximos cuidados aparecerão aqui. O agendamento exibido na home é um exemplo visual.',
  Mensagens:
    'As conversas com cuidadores aparecerão aqui quando o recurso estiver disponível.',
  Notificacoes:
    'Os avisos sobre seus cuidados aparecerão aqui. Ainda não há notificações nesta demonstração.',
};
type FeatureRoute = keyof typeof descriptions;

export function FeaturePreviewScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, FeatureRoute>) {
  return (
    <ScreenLayout topInset={false}>
      <Text style={styles.title}>
        {
          {
            BuscarCuidador: 'Buscar cuidador',
            Historico: 'Histórico',
            Agenda: 'Agenda',
            Mensagens: 'Mensagens',
            Notificacoes: 'Notificações',
          }[route.name]
        }
      </Text>
      <Notice>{descriptions[route.name]}</Notice>
      {route.name === 'BuscarCuidador' && (
        <Button
          title="Ver serviços"
          onPress={() => navigation.navigate('Servicos')}
        />
      )}
      <Button
        title="Voltar"
        variant="outline"
        onPress={() => navigation.goBack()}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
});
