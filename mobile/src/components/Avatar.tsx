import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api';
import { urlFoto } from '../services/foto';
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
  // Guarda qual foto falhou: ao trocar a foto, tenta carregar de novo.
  const chave = `${usuarioId}:${versao}`;
  const [falhouEm, setFalhouEm] = useState<string | null>(null);
  const falhou = falhouEm === chave;
  const forma = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
  };
  if (usuarioId && versao && !falhou) {
    const token = api.defaults.headers.common.Authorization;
    return (
      <Image
        accessibilityLabel={`Foto de ${nome}`}
        source={{
          uri: urlFoto(usuarioId, versao),
          ...(typeof token === 'string'
            ? { headers: { Authorization: token } }
            : {}),
        }}
        onError={() => setFalhouEm(chave)}
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
