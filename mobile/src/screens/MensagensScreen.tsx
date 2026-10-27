import { MotionView } from '../motion/MotionView';
import { staggerDelay } from '../motion/policy';
import { SkeletonList } from '../motion/SkeletonList';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '../components/Avatar';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { mensagemErro } from '../services/api';
import {
  listarConversas,
  nomeDoContato,
  rotuloData,
  type Conversa,
} from '../services/mensagens';
import { useStyles } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { ScreenProps } from '../types/navigation';

const INTERVALO_MS = 10000;

export function MensagensScreen({ navigation }: ScreenProps<'Mensagens'>) {
  const styles = useStyles(criarStyles);
  const { usuario } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Atualiza ao abrir a tela (inclusive ao voltar de uma conversa) e a cada 10 s.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        try {
          const lista = await listarConversas();
          if (!ativo) return;
          setConversas(lista);
          setErro('');
        } catch (error) {
          if (ativo) setErro(mensagemErro(error));
        } finally {
          if (ativo) setCarregando(false);
        }
      }
      void carregar();
      const timer = setInterval(() => void carregar(), INTERVALO_MS);
      return () => {
        ativo = false;
        clearInterval(timer);
      };
    }, []),
  );

  const outroLado = usuario?.cuidador ? 'responsáveis' : 'cuidadores';

  return (
    <AppScreenLayout
      title="Mensagens"
      subtitle="Converse com quem cuida com você"
      tab="Mensagens"
    >
      {carregando && !conversas.length && <SkeletonList />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !conversas.length && (
        <Notice>
          {`Você ainda não tem conversas. Assim que houver uma contratação, os ${outroLado} aparecem aqui para você conversar.`}
        </Notice>
      )}
      {conversas.map(({ contato, ultimaMensagem, naoLidas }, index) => {
        const minha = ultimaMensagem?.remetenteId === usuario?.id;
        return (
          <TouchableOpacity
            key={contato.id}
            enter
            delay={staggerDelay(index)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Abrir conversa com ${nomeDoContato(contato)}`}
            onPress={() =>
              navigation.navigate('Conversa', {
                usuarioId: contato.id,
                nome: nomeDoContato(contato),
                fotoVersao: contato.foto?.updatedAt ?? null,
              })
            }
            style={styles.item}
          >
            <Avatar
              nome={nomeDoContato(contato)}
              usuarioId={contato.id}
              versao={contato.foto?.updatedAt}
              tamanho={52}
            />
            <View style={styles.info}>
              <View style={styles.linha}>
                <Text style={styles.nome} numberOfLines={1}>
                  {nomeDoContato(contato)}
                </Text>
                {!!ultimaMensagem && (
                  <Text style={styles.data}>
                    {rotuloData(ultimaMensagem.createdAt)}
                  </Text>
                )}
              </View>
              <View style={styles.linha}>
                <Text
                  style={[styles.previa, naoLidas > 0 && styles.previaNova]}
                  numberOfLines={1}
                >
                  {ultimaMensagem
                    ? `${minha ? 'Você: ' : ''}${ultimaMensagem.conteudo}`
                    : 'Toque para começar a conversar'}
                </Text>
                {naoLidas > 0 && (
                  <MotionView
                    trigger={naoLidas}
                    preset="pop"
                    style={styles.contador}
                  >
                    <Text style={styles.contadorTexto}>
                      {naoLidas > 99 ? '99+' : naoLidas}
                    </Text>
                  </MotionView>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </AppScreenLayout>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
    },
    info: { flex: 1, gap: 4 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nome: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    data: { fontSize: 12, color: colors.muted },
    previa: { flex: 1, fontSize: 14, color: colors.muted },
    previaNova: { color: colors.text, fontWeight: '600' },
    contador: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    contadorTexto: { fontSize: 12, fontWeight: '700', color: colors.surface },
  });
