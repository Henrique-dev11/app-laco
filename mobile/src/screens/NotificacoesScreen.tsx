import { fs, lh } from '../theme/tipografia';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useState } from 'react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useConsultaApi } from '../hooks/useConsultaApi';
import { api, mensagemErro } from '../services/api';
import {
  lerAvisoPagamento,
  urlDispositivoPagamento,
} from '../services/avisosPagamento';
import { obterTokenPushPagamento } from '../services/notificacoes';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '../accessibility/Texto';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { rotuloData } from '../services/mensagens';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { ScreenProps } from '../types/navigation';

export function NotificacoesScreen({
  navigation,
}: ScreenProps<'Notificacoes'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { itens, carregando, erro } = useNotificacoes();
  const { usuario } = useAuth();
  const dispositivo = useConsultaApi<{ ativo: boolean }>(
    usuario?.cuidador ? urlDispositivoPagamento : null,
  );
  const [erroAcao, setErroAcao] = useState('');
  const [alterando, setAlterando] = useState(false);

  async function alterarPermissao() {
    if (alterando) return;
    setErroAcao('');
    setAlterando(true);
    try {
      if (dispositivo.dados?.ativo) await api.delete(urlDispositivoPagamento);
      else
        await api.put(urlDispositivoPagamento, {
          token: await obterTokenPushPagamento(),
        });
      await dispositivo.atualizar();
    } catch (error) {
      setErroAcao(
        error instanceof Error && !('isAxiosError' in error)
          ? error.message
          : mensagemErro(error),
      );
    } finally {
      setAlterando(false);
    }
  }

  async function abrirPagamento(id: number) {
    setErroAcao('');
    try {
      const destino = await lerAvisoPagamento(id);
      navigation.navigate('VisitaFinanceira', destino);
    } catch (error) {
      setErroAcao(mensagemErro(error));
    }
  }

  return (
    <AppScreenLayout title="Notificações" subtitle="Avisos sobre seus cuidados">
      {usuario?.cuidador && (
        <Button
          title={
            dispositivo.dados?.ativo
              ? 'Desativar notificações no aparelho'
              : 'Ativar notificações no aparelho'
          }
          variant="outline"
          loading={alterando}
          disabled={dispositivo.carregando}
          onPress={() => void alterarPermissao()}
        />
      )}
      {!!(erroAcao || dispositivo.erro) && (
        <Notice>{erroAcao || dispositivo.erro}</Notice>
      )}
      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !itens.length && (
        <Notice>Você não tem notificações no momento.</Notice>
      )}
      {itens.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={() => {
            if (item.pagamento) void abrirPagamento(item.pagamento.id);
            else if (item.conversa)
              navigation.navigate('Conversa', item.conversa);
            else navigation.navigate('Historico');
          }}
          style={[styles.item, item.pendente && styles.itemNovo]}
        >
          <View style={styles.icone}>
            <Ionicons
              name={
                item.tipo === 'pagamento'
                  ? 'wallet'
                  : item.tipo === 'mensagem'
                    ? 'chatbubble'
                    : 'clipboard'
              }
              size={20}
              color={colors.primaryDark}
            />
          </View>
          <View style={styles.info}>
            <View style={styles.linha}>
              <Text style={styles.titulo} numberOfLines={1}>
                {item.tipo === 'mensagem'
                  ? `Nova mensagem de ${item.titulo}`
                  : item.titulo}
              </Text>
              <Text style={styles.data}>{rotuloData(item.data)}</Text>
            </View>
            <Text style={styles.texto} numberOfLines={2}>
              {item.texto}
            </Text>
          </View>
          {!!item.quantidade && item.quantidade > 1 && (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{item.quantidade}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </AppScreenLayout>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
    },
    itemNovo: { borderColor: colors.primary },
    icone: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.badge,
    },
    info: { flex: 1, gap: 3 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titulo: {
      flex: 1,
      fontSize: fs(15),
      fontWeight: '700',
      color: colors.text,
    },
    data: { fontSize: fs(12), color: colors.muted },
    texto: { fontSize: fs(14), color: colors.muted, lineHeight: lh(20) },
    contador: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    contadorTexto: {
      fontSize: fs(12),
      fontWeight: '700',
      color: colors.surface,
    },
  });
