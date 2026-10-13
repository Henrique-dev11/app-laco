import { useState } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CadastroProvider } from './src/contexts/CadastroContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppRoutes } from './src/routes/AppRoutes';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/types/navigation';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primaryDark,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRoute, setActiveRoute] = useState('LoginType');
  function updateRoute() {
    setActiveRoute(navigationRef.getCurrentRoute()?.name ?? 'LoginType');
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CadastroProvider>
          <NavigationContainer
            ref={navigationRef}
            theme={theme}
            onReady={updateRoute}
            onStateChange={updateRoute}
          >
            <StatusBar
              style={
                [
                  'Home',
                  'BuscarCuidador',
                  'Historico',
                  'Agenda',
                  'Disponibilidade',
                  'Perfil',
                  'IdosoDetalhes',
                  'Servicos',
                  'Mensagens',
                  'Notificacoes',
                ].includes(activeRoute)
                  ? 'light'
                  : 'dark'
              }
            />
            <AppRoutes />
          </NavigationContainer>
        </CadastroProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
