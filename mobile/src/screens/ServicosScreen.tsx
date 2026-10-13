import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { listarServicos } from '../services/servicos';
import { colors } from '../theme';
import type { Servico } from '../types/servico';

export function ServicosScreen() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      try {
        const data = await listarServicos(controller.signal);
        if (!controller.signal.aborted) setServicos(data);
      } catch {
        if (!controller.signal.aborted)
          setErro(
            'Não foi possível carregar os serviços. Verifique sua conexão e a configuração da API.',
          );
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }
    void carregar();
    return () => controller.abort();
  }, [tentativa]);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Carregando serviços...</Text>
        </View>
      ) : erro ? (
        <View style={styles.center}>
          <Text style={styles.text}>{erro}</Text>
          <Button
            title="Tentar novamente"
            onPress={() => {
              setCarregando(true);
              setErro('');
              setTentativa((value) => value + 1);
            }}
          />
        </View>
      ) : (
        <FlatList
          data={servicos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.title}>Serviços disponíveis</Text>
          }
          ListEmptyComponent={
            <Text style={styles.text}>
              Nenhum serviço disponível no momento.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.nome}</Text>
              {!!item.descricao && (
                <Text style={styles.text}>{item.descricao}</Text>
              )}
              <Text style={styles.status}>
                {item.ativo ? 'Disponível' : 'Indisponível'}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  list: {
    padding: 24,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    gap: 8,
  },
  name: { fontSize: 18, fontWeight: '600', color: colors.text },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  status: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' },
});
