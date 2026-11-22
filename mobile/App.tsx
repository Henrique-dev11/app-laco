import { useMemo, useState } from 'react';
import { Animated } from 'react-native';
import {
  AcessibilidadeProvider,
  usePreferenciasAcessibilidade,
} from './src/accessibility/AcessibilidadeContext';
import { BotaoAcessibilidade } from './src/accessibility/BotaoAcessibilidade';
import { MotionProvider } from './src/motion/MotionProvider';
import { useNavigationMotion } from './src/motion/useNavigationMotion';
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

/** Telas de login e cadastro: não têm barra inferior, então o botão fica rente ao canto. */
const TELAS_SEM_BARRA: readonly string[] = [
  'LoginType',
  'Login',
  'ResponsavelStep1',
  'ResponsavelStep2',
  'ResponsavelStep3',
  'CuidadorStep1',
  'CuidadorStep2',
  'CuidadorServicos',
  'ConfigurarServicos',
  'IdosoStep1',
  'IdosoStep2',
  'CadastroPreview',
];

function Shell() {
  const colors = useTheme();
  const { preferencias } = usePreferenciasAcessibilidade();
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
  const motion = useNavigationMotion();
  function updateRoute() {
    setActiveRoute(navigationRef.getCurrentRoute()?.name ?? 'LoginType');
    const state = navigationRef.getRootState();
    if (state) motion.navigate(state);
  }
  // Telas com cabeçalho colorido usam barra de status clara; no alto contraste
  // escuro o cabeçalho é amarelo (e o fundo, preto), então tudo se inverte.
  const comCabecalho = [
    'Home',
    'BuscarCuidador',
    'Historico',
    'Agenda',
    'Disponibilidade',
    'Perfil',
    'EditarPerfil',
    'IdosoDetalhes',
    'EditarIdoso',
    'AdicionarIdoso',
    'Servicos',
    'Mensagens',
    'Notificacoes',
  ].includes(activeRoute);
  const claro = comCabecalho !== (preferencias.contraste === 'escuro');
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme}
      onReady={updateRoute}
      onStateChange={updateRoute}
    >
      <StatusBar style={claro ? 'light' : 'dark'} />
      <Animated.View style={motion.style}>
        <AppRoutes />
      </Animated.View>
      <AvisosMensagens navigationRef={navigationRef} />
      {/* Botão fixo de acessibilidade: fica sobre todas as telas do app. */}
      <BotaoAcessibilidade elevado={!TELAS_SEM_BARRA.includes(activeRoute)} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Acessibilidade fica acima de movimento e tema, que dependem dela. */}
      <AcessibilidadeProvider>
        <MotionProvider>
          <AuthProvider>
            <ThemeProvider>
              <CadastroProvider>
                <Shell />
              </CadastroProvider>
            </ThemeProvider>
          </AuthProvider>
        </MotionProvider>
      </AcessibilidadeProvider>
    </SafeAreaProvider>
  );
}
