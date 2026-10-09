import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../services/api';
import type { Servico } from '../types/servico';

export function ServicosScreen() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarServicos() {
      try {
        const response =
          await api.get<Servico[]>('/servicos');

        setServicos(response.data);
      } catch (error) {
        console.error(error);

        setErro(
          'Não foi possível carregar os serviços.',
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarServicos();
  }, []);

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text>Carregando serviços...</Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.center}>
        <Text>{erro}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>
        Serviços disponíveis
      </Text>

      <FlatList
        data={servicos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nome}>
              {item.nome}
            </Text>

            {item.descricao && (
              <Text style={styles.descricao}>
                {item.descricao}
              </Text>
            )}

            <Text>
              {item.ativo
                ? 'Disponível'
                : 'Indisponível'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },

  nome: {
    fontSize: 18,
    fontWeight: '600',
  },

  descricao: {
    marginTop: 6,
    marginBottom: 8,
  },
});