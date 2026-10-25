import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useListaApi } from '../hooks/useListaApi';
import { useAppStyles } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';
import type { Idoso } from '../types/auth';
export function MeusIdososScreen({ navigation }: ScreenProps<'MeusIdosos'>) {
  const { usuario } = useAuth();
  const lista = useListaApi<
    Pick<Idoso, 'id' | 'nome' | 'nomeSocial' | 'endereco' | 'foto'>
  >(usuario?.responsavel ? '/idosos' : null);
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
              <View style={styles.row}>
                <Avatar
                  nome={i.nomeSocial || i.nome}
                  idosoId={i.id}
                  versao={i.foto?.updatedAt}
                  tamanho={56}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{i.nomeSocial || i.nome}</Text>
                  <Text style={styles.text}>
                    {i.endereco.cidade}/{i.endereco.estado}
                  </Text>
                </View>
              </View>
              <Button
                title="Consultar informações"
                variant="outline"
                onPress={() =>
                  navigation.navigate('IdosoDetalhes', { idosoId: i.id })
                }
              />
              <Button
                title="Editar perfil"
                variant="outline"
                onPress={() => {
                  const proprio = usuario?.responsavel?.responsavelIdosos.some(
                    (v) => v.parentesco === 'PROPRIO' && v.idoso.id === i.id,
                  );
                  if (proprio) navigation.navigate('EditarPerfil');
                  else navigation.navigate('EditarIdoso', { idosoId: i.id });
                }}
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
