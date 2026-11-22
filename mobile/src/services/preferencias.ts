import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Armazenamento das preferências de acessibilidade, que pertencem ao aparelho
 * (não à conta): continuam valendo antes do login e depois de sair. Não há
 * dado sensível aqui, então no navegador usamos o localStorage.
 */
const chave = 'laco.acessibilidade';

export async function lerPreferencias(): Promise<unknown> {
  const texto =
    Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(chave) ?? null)
      : await SecureStore.getItemAsync(chave);
  try {
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

export async function gravarPreferencias(valor: unknown) {
  const texto = JSON.stringify(valor);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(chave, texto);
  else await SecureStore.setItemAsync(chave, texto);
}
