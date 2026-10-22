import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useListaApi } from '../hooks/useListaApi';
import { useAppStyles } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';
export function MeusIdososScreen({ navigation }: ScreenProps<'MeusIdosos'>) {
  const { usuario } = useAuth();
  const lista = useListaApi<{
    id: number;
    nome: string;
    nomeSocial: string | null;
    endereco: { cidade: string; estado: string };
  }>(usuario?.responsavel ? '/idosos' : null);
  const styles = useAppStyles();
  return (
    <AppScreenLayout
      title="Meus idosos"
      subtitle="Gerencie as pessoas sob sua responsabilidade"
      tab="Perfil"
    >
      {!usuario?.responsavel ? (
        <Notice>Disponível para responsáveis.</Notice>
      ) : (
        <>
          <Button
            title="Adicionar idoso"
            onPress={() => navigation.navigate('AdicionarIdoso')}
          />
          {lista.carregando && <ActivityIndicator />}
          {!!lista.erro && <Notice>{lista.erro}</Notice>}
          {!lista.carregando && !lista.erro && !lista.dados.length && (
            <Notice>Nenhum idoso vinculado. Adicione o primeiro.</Notice>
          )}
          {lista.dados.map((i) => (
            <View key={i.id} style={styles.card}>
              <Text style={styles.name}>{i.nomeSocial || i.nome}</Text>
              <Text style={styles.text}>
                {i.endereco.cidade}/{i.endereco.estado}
              </Text>
              <Button
                title="Consultar informações"
                variant="outline"
                onPress={() =>
                  navigation.navigate('IdosoDetalhes', { idosoId: i.id })
                }
              />
              <Button
                title="Editar idoso"
                variant="outline"
                onPress={() =>
                  navigation.navigate('EditarIdoso', { idosoId: i.id })
                }
              />
              <Button
                title="Buscar cuidador para este idoso"
                onPress={() =>
                  navigation.push('BuscarCuidador', { idosoId: i.id })
                }
              />
            </View>
          ))}
          <Button
            title="Atualizar lista"
            variant="outline"
            disabled={lista.carregando}
            onPress={lista.atualizar}
          />
        </>
      )}
    </AppScreenLayout>
  );
}
