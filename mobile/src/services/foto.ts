import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';
import {
  consumirDestinoFoto,
  gravarDestinoFoto,
  type DestinoFoto,
} from './sessao';

const opcoes: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Sem a tela de recorte do sistema: no Android ela é o ponto onde o app
  // costuma ser reiniciado. O Avatar já recorta em círculo (resizeMode cover).
  allowsEditing: false,
  quality: 0.5,
  exif: false,
};

export type FotoSelecionada = ImagePicker.ImagePickerAsset;
export type FotoPendente = { imagem: FotoSelecionada; idosoId?: number };

export function validarFoto(imagem: FotoSelecionada) {
  if (imagem.fileSize && imagem.fileSize > 3 * 1024 * 1024)
    throw new Error('Escolha uma foto de até 3 MB.');
}

export async function enviarImagem(imagem: FotoSelecionada, idosoId?: number) {
  validarFoto(imagem);
  const form = new FormData();
  if (Platform.OS === 'web') {
    const arquivo = imagem.file ?? (await (await fetch(imagem.uri)).blob());
    if (arquivo.size > 3 * 1024 * 1024)
      throw new Error('Escolha uma foto de até 3 MB.');
    form.append('foto', arquivo, imagem.fileName ?? 'foto.jpg');
  } else {
    form.append('foto', {
      uri: imagem.uri,
      name: imagem.fileName ?? 'foto.jpg',
      type: imagem.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  await api.post(idosoId ? `/idosos/${idosoId}/foto` : '/auth/foto', form, {
    timeout: 60000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** Seleciona para prévia; a persistência ocorre somente ao salvar o perfil. */
export async function escolherFoto(
  destino: DestinoFoto,
): Promise<FotoSelecionada | null> {
  if (Platform.OS !== 'web') await gravarDestinoFoto(destino);
  const resultado = await ImagePicker.launchImageLibraryAsync(opcoes);
  if (Platform.OS !== 'web') await consumirDestinoFoto();
  if (resultado.canceled) return null;
  validarFoto(resultado.assets[0]);
  return resultado.assets[0];
}

export async function tirarFoto(
  destino: DestinoFoto,
): Promise<FotoSelecionada | null> {
  // Na web o seletor precisa abrir durante o clique, sem aguardar permissões.
  if (Platform.OS !== 'web') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      throw new Error(
        'Permita o acesso à câmera nas configurações do celular para tirar a foto.',
      );
    }
    await gravarDestinoFoto(destino);
  }
  const resultado = await ImagePicker.launchCameraAsync(opcoes);
  if (Platform.OS !== 'web') await consumirDestinoFoto();
  if (resultado.canceled) return null;
  validarFoto(resultado.assets[0]);
  return resultado.assets[0];
}

/**
 * No Android, ao abrir a câmera/galeria o sistema pode matar o app para liberar
 * memória: ele reinicia e o resultado da foto se perde. Aqui recuperamos esse
 * resultado pendente para revisão na edição, sem enviar automaticamente.
 */
export async function recuperarFotoPendente(
  usuarioId: number,
): Promise<FotoPendente | null> {
  if (Platform.OS !== 'android') return null;
  const pendente = await ImagePicker.getPendingResultAsync();
  const destino = await consumirDestinoFoto();
  if (!destino || destino.usuarioId !== usuarioId) return null;
  if (pendente && 'assets' in pendente && !pendente.canceled) {
    const imagem = pendente.assets?.[0];
    if (imagem) return { imagem, idosoId: destino.idosoId };
  }
  return null;
}

export async function removerFoto(idosoId?: number) {
  await api.delete(idosoId ? `/idosos/${idosoId}/foto` : '/auth/foto');
}

const cacheFotos = new Map<string, string>();

/**
 * Baixa a foto pela mesma conexão (axios) que já funciona nas outras chamadas
 * e devolve uma data URI. `versao` (data da última troca) separa o cache.
 */
export async function carregarFoto(
  usuarioId: number | undefined,
  versao: string,
  idosoId?: number,
) {
  const caminho = idosoId ? `/idosos/${idosoId}/foto` : `/fotos/${usuarioId}`;
  const chave = `${caminho}:${versao}`;
  const guardada = cacheFotos.get(chave);
  if (guardada) return guardada;
  const { data } = await api.get<Blob>(caminho, {
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
