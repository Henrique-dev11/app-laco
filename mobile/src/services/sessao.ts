import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const chave = 'laco.sessao';
const chaveDestinoFoto = 'laco.foto.destino';
export type DestinoFoto = { usuarioId: number; idosoId?: number };

export async function gravarDestinoFoto(destino: DestinoFoto) {
  await SecureStore.setItemAsync(chaveDestinoFoto, JSON.stringify(destino));
}

export async function consumirDestinoFoto(): Promise<DestinoFoto | null> {
  const valor = await SecureStore.getItemAsync(chaveDestinoFoto);
  await SecureStore.deleteItemAsync(chaveDestinoFoto);
  try {
    const destino: DestinoFoto = JSON.parse(valor ?? 'null');
    return destino &&
      Number.isInteger(destino.usuarioId) &&
      (destino.idosoId === undefined || Number.isInteger(destino.idosoId))
      ? destino
      : null;
  } catch {
    return null;
  }
}
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
