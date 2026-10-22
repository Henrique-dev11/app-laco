import { useMemo, useState } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CadastroProvider } from './src/contexts/CadastroContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { AvisosMensagens } from './src/components/AvisosMensagens';
import { AppRoutes } from './src/routes/AppRoutes';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { RootStackParamList } from './src/types/navigation';

function Shell() {
  const colors = useTheme();
  const theme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primaryDark,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    }),
    [colors],
  );
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRoute, setActiveRoute] = useState('LoginType');
  function updateRoute() {
    setActiveRoute(navigationRef.getCurrentRoute()?.name ?? 'LoginType');
  }
  return (
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
      <AvisosMensagens navigationRef={navigationRef} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <CadastroProvider>
            <Shell />
          </CadastroProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
