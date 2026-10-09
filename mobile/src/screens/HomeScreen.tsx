import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import type { RootStackParamList } from '../routes/AppRoutes';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Home'
>;

export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Laço</Text>

      <Text style={styles.subtitulo}>
        Cuidado que aproxima pessoas.
      </Text>

      <TouchableOpacity
        style={styles.botao}
        onPress={() => navigation.navigate('Servicos')}
      >
        <Text style={styles.textoBotao}>
          Ver serviços
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  subtitulo: {
    fontSize: 18,
    marginBottom: 32,
  },

  botao: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },

  textoBotao: {
    fontSize: 16,
    fontWeight: '600',
  },
});