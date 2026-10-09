import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { ServicosScreen } from '../screens/ServicosScreen';

export type RootStackParamList = {
  Home: undefined;
  Servicos: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export function AppRoutes() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Laço',
        }}
      />

      <Stack.Screen
        name="Servicos"
        component={ServicosScreen}
        options={{
          title: 'Serviços',
        }}
      />
    </Stack.Navigator>
  );
}