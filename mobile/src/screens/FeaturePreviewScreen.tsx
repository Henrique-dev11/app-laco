import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import type { Paleta } from '../theme';
import { useStyles } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

const descriptions = {
  Mensagens:
    'As conversas com cuidadores aparecerão aqui quando o recurso estiver disponível.',
  Notificacoes:
    'Os avisos sobre seus cuidados aparecerão aqui quando as notificações estiverem disponíveis.',
};
type FeatureRoute = keyof typeof descriptions;

export function FeaturePreviewScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, FeatureRoute>) {
  const styles = useStyles(criarStyles);
  return (
    <AppScreenLayout
      title={route.name === 'Mensagens' ? 'Mensagens' : 'Notificações'}
      tab={route.name === 'Mensagens' ? 'Mensagens' : 'Início'}
    >
      <Text style={styles.title}>
        {
          {
            Mensagens: 'Mensagens',
            Notificacoes: 'Notificações',
          }[route.name]
        }
      </Text>
      <Notice>{descriptions[route.name]}</Notice>
      <Button
        title="Voltar"
        variant="outline"
        onPress={() => navigation.goBack()}
      />
    </AppScreenLayout>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    title: { fontSize: 26, fontWeight: '700', color: colors.text },
  });
