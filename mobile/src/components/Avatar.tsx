import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { carregarFoto } from '../services/foto';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  nome: string;
  usuarioId?: number;
  /** Data da última troca da foto (`foto.updatedAt`); sem ela mostra a inicial. */
  versao?: string | null;
  tamanho?: number;
  /** Cor de fundo da inicial (padrão: paleta do perfil). */
  fundo?: string;
  corInicial?: string;
};

/** Foto de perfil redonda; se não houver foto (ou falhar), mostra a inicial do nome. */
export function Avatar({
  nome,
  usuarioId,
  versao,
  tamanho = 48,
  fundo,
  corInicial,
}: Props) {
  const colors = useTheme();
  const [carregada, setCarregada] = useState<{
    chave: string;
    uri: string;
  } | null>(null);
  const chave = `${usuarioId}:${versao}`;
  useEffect(() => {
    if (!usuarioId || !versao) return;
    let ativo = true;
    carregarFoto(usuarioId, versao)
      .then((uri) => ativo && setCarregada({ chave, uri }))
      .catch(() => {
        /* Sem foto (ou falhou): fica a inicial do nome. */
      });
    return () => {
      ativo = false;
    };
  }, [usuarioId, versao, chave]);
  const forma = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
  };
  if (usuarioId && versao && carregada?.chave === chave) {
    return (
      <Image
        accessibilityLabel={`Foto de ${nome}`}
        source={{ uri: carregada.uri }}
        style={[forma, { backgroundColor: colors.avatarBg }]}
      />
    );
  }
  return (
    <View
      style={[
        styles.inicial,
        forma,
        { backgroundColor: fundo ?? colors.avatarBg },
      ]}
    >
      <Text
        style={{
          fontSize: tamanho * 0.42,
          fontWeight: '700',
          color: corInicial ?? colors.primaryDark,
        }}
      >
        {nome.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inicial: { alignItems: 'center', justifyContent: 'center' },
});
