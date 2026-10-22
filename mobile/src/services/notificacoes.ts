import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const CANAL = 'mensagens';

type Notificacoes = typeof import('expo-notifications');

/**
 * Carrega o expo-notifications só quando preciso. No Expo Go o módulo falha ao
 * carregar (falta um módulo nativo dele); se importássemos no topo, o app
 * inteiro não abriria. Aqui a falha vira `null` e o app usa o aviso interno.
 */
let modulo: Notificacoes | null | undefined;
function carregar(): Notificacoes | null {
  if (modulo !== undefined) return modulo;
  // No Expo Go nem tentamos: o carregamento falha e o Expo mostra erro na tela.
  if (
    Platform.OS === 'web' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  )
    return (modulo = null);
  try {
    const carregado = require('expo-notifications') as Notificacoes;
    // Mostra o aviso mesmo com o app aberto (aparece na área de notificação).
    carregado.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    modulo = carregado;
  } catch {
    modulo = null;
  }
  return modulo;
}

/** Conversa aberta na tela agora: dela não chega aviso. */
let conversaAberta: number | null = null;
export function definirConversaAberta(usuarioId: number | null) {
  conversaAberta = usuarioId;
}
export const conversaEstaAberta = (usuarioId: number) =>
  conversaAberta === usuarioId;

/** Cria o canal (Android) e pede permissão. true = notificações do sistema disponíveis. */
export async function prepararNotificacoes() {
  const n = carregar();
  if (!n) return false;
  try {
    if (Platform.OS === 'android')
      await n.setNotificationChannelAsync(CANAL, {
        name: 'Mensagens',
        importance: n.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    const atual = await n.getPermissionsAsync();
    if (atual.granted) return true;
    if (!atual.canAskAgain) return false;
    return (await n.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export type DadosAviso = {
  usuarioId: number;
  nome: string;
  fotoVersao: string | null;
};

export const resumir = (texto: string) =>
  texto.length > 120 ? `${texto.slice(0, 117)}...` : texto;

/** Dispara a notificação do sistema. Devolve false se não foi possível. */
export async function avisarMensagem(dados: DadosAviso, texto: string) {
  const n = carregar();
  if (!n) return false;
  try {
    await n.scheduleNotificationAsync({
      content: { title: dados.nome, body: resumir(texto), data: dados },
      trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
    });
    return true;
  } catch {
    return false;
  }
}

export function aoToqueNoAviso(abrir: (dados: DadosAviso) => void) {
  const n = carregar();
  if (!n) return () => undefined;
  const assinatura = n.addNotificationResponseReceivedListener((resposta) => {
    const dados = resposta.notification.request.content
      .data as Partial<DadosAviso>;
    if (typeof dados.usuarioId === 'number' && dados.nome)
      abrir({
        usuarioId: dados.usuarioId,
        nome: dados.nome,
        fotoVersao: dados.fotoVersao ?? null,
      });
  });
  return () => assinatura.remove();
}
