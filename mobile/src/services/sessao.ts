import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const chave = 'laco.sessao';
// No navegador a sessão dura somente nesta aba; não gravamos o token em localStorage.
export async function lerToken() {
  return Platform.OS === 'web'
    ? (globalThis.sessionStorage?.getItem(chave) ?? null)
    : SecureStore.getItemAsync(chave);
}
export async function gravarToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) globalThis.sessionStorage?.setItem(chave, token);
    else globalThis.sessionStorage?.removeItem(chave);
  } else if (token) await SecureStore.setItemAsync(chave, token);
  else await SecureStore.deleteItemAsync(chave);
}
