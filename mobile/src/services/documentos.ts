import * as DocumentPicker from 'expo-document-picker';
import type { Curriculo } from '../types/cadastro';

export async function selecionarCurriculo(): Promise<Curriculo | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  return result.canceled ? null : (result.assets[0] ?? null);
}
