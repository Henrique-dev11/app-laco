import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Notice } from './Notice';
import { AnimatedCollapse } from '../motion/AnimatedCollapse';
import { MotionView } from '../motion/MotionView';
import {
  escolherFoto,
  tirarFoto,
  type FotoSelecionada,
} from '../services/foto';
import type { UsuarioAtual } from '../types/auth';
import { useAppStyles } from '../theme/appStyles';
import { useTheme } from '../theme/ThemeContext';

/** undefined preserva a foto atual; null prepara sua remoção para o próximo salvamento. */
export type FotoRascunho = FotoSelecionada | null | undefined;

export function FotoPerfilForm({
  usuario,
  value,
  onChange,
  disabled,
  idosoId,
  contaId,
}: {
  usuario: Pick<UsuarioAtual, 'nome' | 'nomeSocial' | 'foto'> & { id?: number };
  idosoId?: number;
  contaId?: number;
  value: FotoRascunho;
  onChange: (foto: FotoRascunho) => void;
  disabled: boolean;
}) {
  const [opcoes, setOpcoes] = useState(false);
  const [erro, setErro] = useState('');
  const appStyles = useAppStyles();
  const colors = useTheme();
  async function selecionar(acao: () => Promise<FotoSelecionada | null>) {
    setErro('');
    try {
      const foto = await acao();
      if (foto) {
        onChange(foto);
        setOpcoes(false);
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível selecionar a foto. Tente novamente.',
      );
    }
  }
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <MotionView
          preset="fade"
          trigger={
            value?.uri ??
            (value === null
              ? 'removida'
              : (usuario.foto?.updatedAt ?? 'padrao'))
          }
        >
          <Avatar
            nome={usuario.nomeSocial || usuario.nome}
            usuarioId={idosoId ? undefined : usuario.id}
            idosoId={idosoId}
            versao={value === undefined ? usuario.foto?.updatedAt : null}
            uri={value?.uri}
            tamanho={112}
          />
        </MotionView>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Alterar foto de perfil"
          accessibilityState={{ expanded: opcoes, disabled }}
          disabled={disabled}
          onPress={() => setOpcoes((abertas) => !abertas)}
          style={[
            styles.camera,
            { backgroundColor: colors.primary, borderColor: colors.surface },
          ]}
        >
          <Ionicons name="camera-outline" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>
      <Text style={[appStyles.helper, styles.texto]}>
        {value === null
          ? 'A foto será removida ao salvar.'
          : value
            ? 'Prévia da nova foto. Salve para confirmar.'
            : 'Toque na câmera para alterar sua foto.'}
      </Text>
      <Text style={appStyles.helper}>JPEG, PNG ou WebP · até 3 MB</Text>
      {!!erro && <Notice>{erro}</Notice>}
      <AnimatedCollapse visible={opcoes} style={styles.opcoes}>
        <Button
          title="Tirar foto"
          variant="outline"
          disabled={disabled}
          onPress={() => {
            void selecionar(() =>
              tirarFoto({ usuarioId: contaId ?? usuario.id!, idosoId }),
            );
          }}
        />
        <Button
          title="Escolher da galeria"
          variant="outline"
          disabled={disabled}
          onPress={() => {
            void selecionar(() =>
              escolherFoto({ usuarioId: contaId ?? usuario.id!, idosoId }),
            );
          }}
        />
        {(value || (value === undefined && usuario.foto)) && (
          <Button
            title="Remover foto"
            variant="outline"
            color={colors.error}
            disabled={disabled}
            onPress={() => {
              onChange(usuario.foto ? null : undefined);
              setOpcoes(false);
            }}
          />
        )}
      </AnimatedCollapse>
      {value !== undefined && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onChange(undefined)}
          style={styles.desfazer}
        >
          <Text style={[appStyles.helper, { color: colors.primaryDark }]}>
            Desfazer alteração da foto
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingTop: 4 },
  avatar: { position: 'relative', marginBottom: 8 },
  camera: {
    position: 'absolute',
    right: -8,
    bottom: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { textAlign: 'center' },
  opcoes: { width: '100%', gap: 8, paddingTop: 8 },
  desfazer: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
