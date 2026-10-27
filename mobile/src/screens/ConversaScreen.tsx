import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../components/Button';
import { AnimatedCollapse } from '../motion/AnimatedCollapse';
import { MotionView } from '../motion/MotionView';
import { SkeletonList } from '../motion/SkeletonList';
import { juntarMensagens as juntar, idsNovasMensagens } from '../utils/chat';
import { PropostaCard } from '../components/PropostaCard';
import { listarPropostas, type Proposta } from '../services/propostas';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Notice } from '../components/Notice';
import { useAuth } from '../contexts/AuthContext';
import { mensagemErro } from '../services/api';
import {
  enviarMensagem,
  listarMensagens,
  rotuloHora,
  type Mensagem,
} from '../services/mensagens';
import { definirConversaAberta } from '../services/notificacoes';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { ScreenProps } from '../types/navigation';

const INTERVALO_MS = 4000;
const LIMITE = 1000;

export function ConversaScreen(props: ScreenProps<'Conversa'>) {
  return <ConversaConteudo key={props.route.params.usuarioId} {...props} />;
}
function ConversaConteudo({ navigation, route }: ScreenProps<'Conversa'>) {
  const { usuarioId, nome, fotoVersao } = route.params;
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [menuProposta, setMenuProposta] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ultimoId = useRef<number | undefined>(undefined);
  const lista = useRef<FlatList<Mensagem>>(null);
  const conhecidos = useRef(new Set<number>());
  const inicializada = useRef(false);
  const pertoDoFim = useRef(true);
  const tamanhoAnterior = useRef(0);
  const offsetAnterior = useRef(0);
  const [animadas, setAnimadas] = useState<number[]>([]);
  const [novasNaoVistas, setNovasNaoVistas] = useState(0);
  const insets = useSafeAreaInsets();
  const [tecladoVisivel, setTecladoVisivel] = useState(() =>
    Keyboard.isVisible(),
  );

  useEffect(() => {
    if (!animadas.length) return;
    const timer = setTimeout(() => setAnimadas([]), 500);
    return () => clearTimeout(timer);
  }, [animadas]);

  // Não avisa por notificação da conversa que já está aberta.
  useEffect(() => {
    definirConversaAberta(usuarioId);
    return () => definirConversaAberta(null);
  }, [usuarioId]);

  // O KeyboardAvoidingView controla o espaço do teclado. Estes eventos apenas
  // retiram a área do indicador inferior enquanto a barra está acima dele.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const mostrar = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setTecladoVisivel(event.endCoordinates.height > 0),
    );
    const esconder = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setTecladoVisivel(false),
    );
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);

  const atualizar = useCallback(
    async (ativo: () => boolean = () => true) => {
      try {
        const [novas, propostasAtuais] = await Promise.all([
          listarMensagens(usuarioId, ultimoId.current),
          listarPropostas(usuarioId),
        ]);
        if (!ativo()) return;
        setPropostas(propostasAtuais);
        const novosIds = idsNovasMensagens(
          conhecidos.current,
          novas,
          inicializada.current,
        );
        inicializada.current = true;
        for (const m of novas) conhecidos.current.add(m.id);
        if (novosIds.length) {
          setAnimadas((ids) => [...ids, ...novosIds].slice(-30));
          if (!pertoDoFim.current)
            setNovasNaoVistas((n) => n + novosIds.length);
        }
        if (novas.length) {
          ultimoId.current = novas[novas.length - 1].id;
          setMensagens((atuais) => juntar(atuais, novas));
        }
        setErro('');
      } catch (error) {
        if (ativo()) setErro(mensagemErro(error));
      } finally {
        if (ativo()) setCarregando(false);
      }
    },
    [usuarioId],
  );

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      let timer: ReturnType<typeof setTimeout>;
      async function consultar() {
        await atualizar(() => ativo);
        if (ativo)
          timer = setTimeout(() => {
            void consultar();
          }, INTERVALO_MS);
      }
      void consultar();
      return () => {
        ativo = false;
        clearTimeout(timer);
      };
    }, [atualizar]),
  );

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    try {
      const enviada = await enviarMensagem(usuarioId, conteudo);
      if (!conhecidos.current.has(enviada.id)) {
        conhecidos.current.add(enviada.id);
        setAnimadas((ids) => [...ids, enviada.id].slice(-30));
      }
      pertoDoFim.current = true;
      setNovasNaoVistas(0);
      setMensagens((atuais) => juntar(atuais, [enviada]));
      setTexto('');
      setErro('');
    } catch (error) {
      setErro(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }

  const podeEnviar = !!texto.trim() && !enviando;

  return (
    // Abrange também o cabeçalho e o topo seguro: o frame começa na origem da
    // tela, como as coordenadas do teclado, sem offset fixo ou altura estimada.
    <KeyboardAvoidingView
      style={styles.safe}
      enabled={Platform.OS !== 'web'}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.voltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Mensagens')
            }
          >
            <Ionicons name="chevron-back" size={23} color={colors.surface} />
          </TouchableOpacity>
          <Avatar
            nome={nome}
            usuarioId={usuarioId}
            versao={fotoVersao}
            tamanho={40}
          />
          <Text style={styles.titulo} numberOfLines={1}>
            {nome}
          </Text>
        </View>

        <View style={styles.corpo}>
          <View style={styles.listaArea}>
            {carregando ? (
              <View style={[styles.centro, styles.aviso]}>
                <SkeletonList count={3} />
              </View>
            ) : (
              <FlatList
                ref={lista}
                style={styles.listaArea}
                // Lista invertida: a mensagem mais nova fica embaixo e a tela
                // já abre no fim da conversa.
                inverted
                data={[...mensagens].reverse()}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.lista}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                automaticallyAdjustKeyboardInsets={false}
                contentInsetAdjustmentBehavior="never"
                maintainVisibleContentPosition={
                  Platform.OS === 'web'
                    ? undefined
                    : { minIndexForVisible: 0, autoscrollToTopThreshold: 80 }
                }
                scrollEventThrottle={32}
                onLayout={() => {
                  // A abertura do teclado muda o viewport, não o conteúdo.
                  // Mantém o fim visível sem interromper a leitura do histórico.
                  if (pertoDoFim.current)
                    lista.current?.scrollToOffset({
                      offset: 0,
                      animated: false,
                    });
                }}
                onScroll={(event) => {
                  const offset = Math.max(0, event.nativeEvent.contentOffset.y);
                  offsetAnterior.current = offset;
                  pertoDoFim.current = offset < 80;
                  if (pertoDoFim.current) setNovasNaoVistas(0);
                }}
                onContentSizeChange={(_, height) => {
                  const anterior = tamanhoAnterior.current;
                  tamanhoAnterior.current = height;
                  if (pertoDoFim.current)
                    lista.current?.scrollToOffset({
                      offset: 0,
                      animated: false,
                    });
                  else if (
                    Platform.OS === 'web' &&
                    anterior > 0 &&
                    height !== anterior
                  ) {
                    // Compensa também a correção negativa das alturas estimadas
                    // da FlatList, para não acumular deslocamentos na web.
                    const offset = Math.max(
                      0,
                      offsetAnterior.current + height - anterior,
                    );
                    offsetAnterior.current = offset;
                    lista.current?.scrollToOffset({ offset, animated: false });
                  }
                }}
                ListEmptyComponent={
                  <Text style={[styles.vazio, styles.invertido]}>
                    Nenhuma mensagem ainda. Diga olá!
                  </Text>
                }
                renderItem={({ item }) => {
                  const minha = item.remetenteId === usuario?.id;
                  const proposta = propostas.find(
                    (p) => p.id === item.propostaId,
                  );
                  if (proposta) {
                    const ultima = !propostas.some(
                      (p) =>
                        p.negociacaoId === proposta.negociacaoId &&
                        p.versao > proposta.versao,
                    );
                    return (
                      <MotionView
                        animate={animadas.includes(item.id)}
                        preset="fade"
                        style={{ gap: 4 }}
                      >
                        <PropostaCard
                          proposta={proposta}
                          contatoId={usuarioId}
                          podeRevisar={
                            ultima &&
                            [
                              'PENDENTE',
                              'RECUSADA',
                              'ALTERACOES_SOLICITADAS',
                            ].includes(proposta.status)
                          }
                          atualizar={() => atualizar()}
                          novaVersao={() =>
                            navigation.navigate('CriarProposta', {
                              usuarioId,
                              anterior: proposta,
                            })
                          }
                          verAgenda={() => navigation.navigate('Agenda')}
                        />
                        <Text style={styles.horaDele}>
                          {rotuloHora(item.createdAt)}
                        </Text>
                      </MotionView>
                    );
                  }
                  return (
                    <MotionView
                      animate={animadas.includes(item.id)}
                      preset="fade"
                      style={[
                        styles.balao,
                        minha ? styles.balaoMeu : styles.balaoDele,
                      ]}
                    >
                      <Text style={minha ? styles.textoMeu : styles.textoDele}>
                        {item.conteudo}
                      </Text>
                      <Text style={minha ? styles.horaMeu : styles.horaDele}>
                        {rotuloHora(item.createdAt)}
                      </Text>
                    </MotionView>
                  );
                }}
              />
            )}
            {novasNaoVistas > 0 && (
              <MotionView
                preset="fade"
                style={styles.novas}
                accessibilityLiveRegion="polite"
              >
                <Button
                  title={`${novasNaoVistas} ${novasNaoVistas === 1 ? 'nova mensagem' : 'novas mensagens'}`}
                  variant="outline"
                  onPress={() => {
                    pertoDoFim.current = true;
                    setNovasNaoVistas(0);
                    lista.current?.scrollToOffset({
                      offset: 0,
                      animated: false,
                    });
                  }}
                />
              </MotionView>
            )}
          </View>
          {!!erro && (
            <View style={styles.aviso}>
              <Notice>{erro}</Notice>
            </View>
          )}
          <AnimatedCollapse
            visible={!!usuario?.cuidador && menuProposta}
            style={styles.aviso}
          >
            <Button
              title="Criar proposta de atendimento"
              onPress={() => {
                setMenuProposta(false);
                navigation.navigate('CriarProposta', { usuarioId });
              }}
            />
          </AnimatedCollapse>
          <View
            style={[
              styles.barra,
              { paddingBottom: 12 + (tecladoVisivel ? 0 : insets.bottom) },
            ]}
          >
            {!!usuario?.cuidador && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Opções de proposta"
                accessibilityState={{ expanded: menuProposta }}
                onPress={() => setMenuProposta((v) => !v)}
                style={styles.enviar}
              >
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={colors.surface}
                />
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.campo}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreva uma mensagem"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              maxLength={LIMITE}
              accessibilityLabel="Mensagem"
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              accessibilityState={{ busy: enviando, disabled: !podeEnviar }}
              disabled={!podeEnviar}
              onPress={() => void enviar()}
              style={[styles.enviar, !podeEnviar && styles.enviarOff]}
            >
              <MotionView
                preset="pop"
                trigger={enviando ? 'enviando' : 'pronto'}
              >
                {enviando ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Ionicons name="send" size={20} color={colors.surface} />
                )}
              </MotionView>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.header },
    header: {
      backgroundColor: colors.header,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    voltar: {
      width: 40,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: colors.headerSoft,
    },
    titulo: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.surface },
    corpo: { flex: 1, minHeight: 0, backgroundColor: colors.background },
    centro: { flex: 1 },
    listaArea: {
      flex: 1,
      minHeight: 0,
      ...(Platform.OS === 'web' ? { overflowAnchor: 'none' } : {}),
    },
    novas: { position: 'absolute', bottom: 12, left: 16, right: 16 },
    lista: { padding: 16, gap: 8 },
    vazio: { textAlign: 'center', color: colors.muted, padding: 24 },
    invertido: { transform: [{ scaleY: -1 }] },
    balao: {
      maxWidth: '80%',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      gap: 2,
    },
    balaoMeu: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    balaoDele: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    textoMeu: { fontSize: 15, lineHeight: 21, color: colors.surface },
    textoDele: { fontSize: 15, lineHeight: 21, color: colors.text },
    horaMeu: {
      alignSelf: 'flex-end',
      fontSize: 11,
      color: colors.surface,
      opacity: 0.8,
    },
    horaDele: { alignSelf: 'flex-end', fontSize: 11, color: colors.muted },
    aviso: { paddingHorizontal: 16, paddingBottom: 8 },
    barra: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      padding: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    campo: {
      flex: 1,
      minWidth: 0,
      maxHeight: 120,
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
    },
    enviar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    enviarOff: { opacity: 0.5 },
  });
