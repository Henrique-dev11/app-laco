import { MotionView } from '../motion/MotionView';
import { staggerDelay } from '../motion/policy';
import { SkeletonList } from '../motion/SkeletonList';
import { Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useListaApi } from '../hooks/useListaApi';
import { useAppStyles } from '../theme/appStyles';
import type { Servico } from '../types/servico';

export function ServicosScreen() {
  const appStyles = useAppStyles();
  const { dados, carregando, erro, atualizar } =
    useListaApi<Servico>('/servicos');
  return (
    <AppScreenLayout title="Serviços" subtitle="Cuidados para cada necessidade">
      {carregando && !dados.length && <SkeletonList />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !dados.length && (
        <Notice>Nenhum serviço disponível no momento.</Notice>
      )}
      {dados.map((servico, index) => (
        <MotionView
          delay={staggerDelay(index)}
          key={servico.id}
          style={appStyles.card}
        >
          <Text style={appStyles.name}>{servico.nome}</Text>
          {!!servico.descricao && (
            <Text style={appStyles.text}>{servico.descricao}</Text>
          )}
          <View style={appStyles.badge}>
            <Text style={appStyles.badgeText}>
              {servico.ativo ? 'Disponível' : 'Indisponível'}
            </Text>
          </View>
        </MotionView>
      ))}
      <Button
        loading={carregando}
        title="Atualizar serviços"
        variant="outline"
        disabled={carregando}
        onPress={atualizar}
      />
    </AppScreenLayout>
  );
}
