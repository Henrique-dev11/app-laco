import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

const opcoes: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Sem a tela de recorte do sistema: no Android ela é o ponto onde o app
  // costuma ser reiniciado. O Avatar já recorta em círculo (resizeMode cover).
  allowsEditing: false,
  quality: 0.5,
  exif: false,
};

async function enviarImagem(imagem: ImagePicker.ImagePickerAsset) {
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
}

/** Abre a galeria e envia a foto de perfil. */
export async function escolherEEnviarFoto(): Promise<boolean> {
  const resultado = await ImagePicker.launchImageLibraryAsync(opcoes);
  if (resultado.canceled) return false;
  await enviarImagem(resultado.assets[0]);
  return true;
}

/** Abre a câmera e envia a foto de perfil. */
export async function tirarEEnviarFoto(): Promise<boolean> {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissao.granted) {
    Alert.alert(
      'Câmera bloqueada',
      'Permita o acesso à câmera nas configurações do celular para tirar a foto.',
    );
    return false;
  }
  const resultado = await ImagePicker.launchCameraAsync(opcoes);
  if (resultado.canceled) return false;
  await enviarImagem(resultado.assets[0]);
  return true;
}

/**
 * No Android, ao abrir a câmera/galeria o sistema pode matar o app para liberar
 * memória: ele reinicia e o resultado da foto se perde. Aqui recuperamos esse
 * resultado pendente e enviamos a foto. Devolve true se enviou alguma.
 */
export async function recuperarFotoPendente(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const pendente = await ImagePicker.getPendingResultAsync();
  if (pendente && 'assets' in pendente && !pendente.canceled) {
    const imagem = pendente.assets?.[0];
    if (imagem) {
      await enviarImagem(imagem);
      return true;
    }
  }
  return false;
}

export async function removerFoto() {
  await api.delete('/auth/foto');
}

const cacheFotos = new Map<string, string>();

/**
 * Baixa a foto pela mesma conexão (axios) que já funciona nas outras chamadas
 * e devolve uma data URI. `versao` (data da última troca) separa o cache.
 */
export async function carregarFoto(usuarioId: number, versao: string) {
  const chave = `${usuarioId}:${versao}`;
  const guardada = cacheFotos.get(chave);
  if (guardada) return guardada;
  const { data } = await api.get<Blob>(`/fotos/${usuarioId}`, {
    params: { v: versao },
    responseType: 'blob',
  });
  const uri = await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = () => reject(new Error('Falha ao ler a foto.'));
    leitor.readAsDataURL(data);
  });
  cacheFotos.set(chave, uri);
  return uri;
}
