import { MotionView } from '../motion/MotionView';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { listarConversas } from '../services/mensagens';
import {
  aoToqueNoAviso,
  avisarMensagem,
  conversaEstaAberta,
  prepararNotificacoes,
  resumir,
  type DadosAviso,
} from '../services/notificacoes';
import { useStyles } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const INTERVALO_MS = 8000;
const BANNER_MS = 6000;

type Aviso = { dados: DadosAviso; texto: string };

/**
 * Enquanto o usuário está logado, confere as conversas e avisa de cada mensagem
 * nova recebida: notificação do sistema quando disponível; no Expo Go (que não
 * suporta) mostra um aviso no topo do app. Só funciona com o app aberto — com o
 * app fechado é preciso push de verdade, que exige um build próprio.
 */
export function AvisosMensagens({
  navigationRef,
}: {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
}) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id;
  const styles = useStyles(criarStyles);
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    if (!usuarioId) return;
    let ativo = true;
    // Última mensagem já vista por contato; a primeira leitura só marca o ponto
    // de partida, para não avisar de mensagens antigas.
    const vistas = new Map<number, number>();
    let primeira = true;
    let notificacaoDoSistema = false;

    async function conferir() {
      try {
        const conversas = await listarConversas();
        if (!ativo) return;
        for (const { contato, ultimaMensagem, naoLidas } of conversas) {
          if (!ultimaMensagem) continue;
          const anterior = vistas.get(contato.id) ?? 0;
          vistas.set(contato.id, Math.max(anterior, ultimaMensagem.id));
          if (
            primeira ||
            ultimaMensagem.id <= anterior ||
            ultimaMensagem.remetenteId === usuarioId ||
            naoLidas === 0 ||
            conversaEstaAberta(contato.id)
          )
            continue;
          const dados: DadosAviso = {
            usuarioId: contato.id,
            nome: contato.nomeSocial || contato.nome,
            fotoVersao: contato.foto?.updatedAt ?? null,
          };
          const enviada =
            notificacaoDoSistema &&
            (await avisarMensagem(dados, ultimaMensagem.conteudo));
          if (!enviada && ativo)
            setAviso({ dados, texto: ultimaMensagem.conteudo });
        }
        primeira = false;
      } catch {
        /* Sem rede ou sessão expirada: tenta de novo no próximo ciclo. */
      }
    }

    void prepararNotificacoes()
      .then((ok) => {
        notificacaoDoSistema = ok;
      })
      .catch(() => {
        notificacaoDoSistema = false;
      })
      .finally(() => void conferir());
    const timer = setInterval(() => void conferir(), INTERVALO_MS);
    const removerToque = aoToqueNoAviso((dados) => {
      if (navigationRef.isReady()) navigationRef.navigate('Conversa', dados);
    });
    return () => {
      ativo = false;
      clearInterval(timer);
      removerToque();
    };
  }, [usuarioId, navigationRef]);

  // O aviso interno some sozinho.
  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(null), BANNER_MS);
    return () => clearTimeout(timer);
  }, [aviso]);

  if (!usuarioId || !aviso) return null;
  return (
    <MotionView
      trigger={`${aviso.dados.usuarioId}:${aviso.texto}`}
      pointerEvents="box-none"
      style={[styles.area, { top: insets.top + 8 }]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Nova mensagem de ${aviso.dados.nome}`}
        activeOpacity={0.9}
        style={styles.banner}
        onPress={() => {
          setAviso(null);
          if (navigationRef.isReady())
            navigationRef.navigate('Conversa', aviso.dados);
        }}
      >
        <Text style={styles.nome} numberOfLines={1}>
          {aviso.dados.nome}
        </Text>
        <Text style={styles.texto} numberOfLines={2}>
          {resumir(aviso.texto)}
        </Text>
      </TouchableOpacity>
    </MotionView>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    area: { position: 'absolute', left: 12, right: 12, zIndex: 100 },
    banner: {
      padding: 14,
      gap: 2,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    nome: { fontSize: 15, fontWeight: '700', color: colors.text },
    texto: { fontSize: 14, color: colors.muted },
  });
