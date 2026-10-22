import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, urlApi } from './api';

/** Abre a galeria, deixa recortar em quadrado e envia a foto de perfil. */
export async function escolherEEnviarFoto(): Promise<boolean> {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (resultado.canceled) return false;
  const imagem = resultado.assets[0];
  const form = new FormData();
  if (Platform.OS === 'web') {
    form.append('foto', await (await fetch(imagem.uri)).blob(), 'foto.jpg');
  } else {
    form.append('foto', {
      uri: imagem.uri,
      name: imagem.fileName ?? 'foto.jpg',
      type: imagem.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  await api.post('/auth/foto', form, {
    timeout: 60000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return true;
}

export async function removerFoto() {
  await api.delete('/auth/foto');
}

/** Endereço da imagem; `versao` (data da última troca) força recarregar ao trocar a foto. */
export function urlFoto(usuarioId: number, versao: string) {
  return `${urlApi}/fotos/${usuarioId}?v=${encodeURIComponent(versao)}`;
}
