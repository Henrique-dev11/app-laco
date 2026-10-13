import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginTypeScreen } from '../screens/LoginTypeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import {
  ResponsavelStep1Screen,
  ResponsavelStep2Screen,
  ResponsavelStep3Screen,
} from '../screens/ResponsavelScreens';
import {
  CuidadorStep1Screen,
  CuidadorStep2Screen,
} from '../screens/CuidadorScreens';
import { IdosoStep1Screen, IdosoStep2Screen } from '../screens/IdosoScreens';
import { CadastroPreviewScreen } from '../screens/CadastroPreviewScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ServicosScreen } from '../screens/ServicosScreen';
import { FeaturePreviewScreen } from '../screens/FeaturePreviewScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, Text } from 'react-native';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Button } from '../components/Button';
import { BuscarCuidadorScreen } from '../screens/BuscarCuidadorScreen';
import { HistoricoScreen } from '../screens/HistoricoScreen';
import { DisponibilidadeScreen } from '../screens/DisponibilidadeScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { IdosoDetalhesScreen } from '../screens/IdosoDetalhesScreen';

export type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// React Navigation mantido por escolha explícita do usuário nesta migração.
export function AppRoutes() {
  const { usuario, carregando, erroInicial, tentarRestaurar } = useAuth();
  if (carregando)
    return (
      <ScreenLayout>
        <ActivityIndicator color={colors.primary} />
        <Text>Verificando sessão...</Text>
      </ScreenLayout>
    );
  if (erroInicial)
    return (
      <ScreenLayout>
        <Text>{erroInicial}</Text>
        <Button title="Tentar novamente" onPress={tentarRestaurar} />
      </ScreenLayout>
    );
  return (
    <Stack.Navigator
      key={usuario ? `usuario-${usuario.id}` : 'visitante'}
      initialRouteName={usuario ? 'Home' : 'LoginType'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primaryDark,
      }}
    >
      {!usuario ? (
        <>
          <Stack.Screen name="LoginType" component={LoginTypeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="ResponsavelStep1"
            component={ResponsavelStep1Screen}
          />
          <Stack.Screen
            name="ResponsavelStep2"
            component={ResponsavelStep2Screen}
          />
          <Stack.Screen
            name="ResponsavelStep3"
            component={ResponsavelStep3Screen}
          />
          <Stack.Screen name="CuidadorStep1" component={CuidadorStep1Screen} />
          <Stack.Screen name="CuidadorStep2" component={CuidadorStep2Screen} />
          <Stack.Screen name="IdosoStep1" component={IdosoStep1Screen} />
          <Stack.Screen name="IdosoStep2" component={IdosoStep2Screen} />
          <Stack.Screen
            name="CadastroPreview"
            component={CadastroPreviewScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Servicos"
              component={ServicosScreen}
              options={{ title: 'Serviços' }}
            />
            <Stack.Screen
              name="BuscarCuidador"
              component={BuscarCuidadorScreen}
              options={{ title: 'Buscar cuidador' }}
            />
            <Stack.Screen
              name="Historico"
              component={HistoricoScreen}
              options={{ title: 'Histórico' }}
            />
            <Stack.Screen
              name="Agenda"
              component={AgendaScreen}
              options={{ title: 'Agenda' }}
            />
            <Stack.Screen
              name="Disponibilidade"
              component={DisponibilidadeScreen}
              options={{ title: 'Disponibilidade' }}
            />
            <Stack.Screen
              name="Mensagens"
              component={FeaturePreviewScreen}
              options={{ title: 'Mensagens' }}
            />
            <Stack.Screen
              name="Perfil"
              component={PerfilScreen}
              options={{ title: 'Perfil' }}
            />
            <Stack.Screen
              name="IdosoDetalhes"
              component={IdosoDetalhesScreen}
            />
            <Stack.Screen
              name="Notificacoes"
              component={FeaturePreviewScreen}
              options={{ title: 'Notificações' }}
            />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}
