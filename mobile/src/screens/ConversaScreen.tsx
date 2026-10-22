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
  TouchableOpacity,
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

/** Junta mensagens novas às atuais sem duplicar (por id), em ordem. */
function juntar(atuais: Mensagem[], novas: Mensagem[]) {
  if (!novas.length) return atuais;
  const porId = new Map(atuais.map((m) => [m.id, m]));
  for (const nova of novas) porId.set(nova.id, nova);
  return [...porId.values()].sort((a, b) => a.id - b.id);
}

export function ConversaScreen({
  navigation,
  route,
}: ScreenProps<'Conversa'>) {
  const { usuarioId, nome, fotoVersao } = route.params;
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ultimoId = useRef<number | undefined>(undefined);
  const insets = useSafeAreaInsets();
  const [tecladoAltura, setTecladoAltura] = useState(0);

  // Não avisa por notificação da conversa que já está aberta.
  useEffect(() => {
    definirConversaAberta(usuarioId);
    return () => definirConversaAberta(null);
  }, [usuarioId]);

  // No Android (tela de borda a borda) o sistema não encolhe a tela com o
  // teclado: levantamos a barra de envio na mão.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const mostrar = Keyboard.addListener('keyboardDidShow', (e) =>
      setTecladoAltura(e.endCoordinates.height),
    );
    const esconder = Keyboard.addListener('keyboardDidHide', () =>
      setTecladoAltura(0),
    );
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);

  const atualizar = useCallback(
    async (ativo: () => boolean) => {
      try {
        const novas = await listarMensagens(usuarioId, ultimoId.current);
        if (!ativo()) return;
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

  useEffect(() => {
    let ativo = true;
    const estaAtivo = () => ativo;
    void atualizar(estaAtivo);
    const timer = setInterval(() => void atualizar(estaAtivo), INTERVALO_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [atualizar]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    try {
      const enviada = await enviarMensagem(usuarioId, conteudo);
      ultimoId.current = Math.max(ultimoId.current ?? 0, enviada.id);
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
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

        <KeyboardAvoidingView
          style={[
            styles.corpo,
            Platform.OS === 'android' && {
              paddingBottom: Math.max(0, tecladoAltura - insets.bottom),
            },
          ]}
          enabled={Platform.OS === 'ios'}
          behavior="padding"
        >
          {carregando ? (
            <ActivityIndicator style={styles.centro} color={colors.primary} />
          ) : (
            <FlatList
              // Lista invertida: a mensagem mais nova fica embaixo e a tela
              // já abre no fim da conversa.
              inverted
              data={[...mensagens].reverse()}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.lista}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.vazio, styles.invertido]}>
                  Nenhuma mensagem ainda. Diga olá!
                </Text>
              }
              renderItem={({ item }) => {
                const minha = item.remetenteId === usuario?.id;
                return (
                  <View
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
                  </View>
                );
              }}
            />
          )}
          {!!erro && (
            <View style={styles.aviso}>
              <Notice>{erro}</Notice>
            </View>
          )}
          <View style={styles.barra}>
            <TextInput
              style={styles.campo}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreva uma mensagem"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={LIMITE}
              accessibilityLabel="Mensagem"
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              disabled={!podeEnviar}
              onPress={() => void enviar()}
              style={[styles.enviar, !podeEnviar && styles.enviarOff]}
            >
              {enviando ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Ionicons name="send" size={20} color={colors.surface} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.header },
    container: { flex: 1, backgroundColor: colors.background },
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
    corpo: { flex: 1 },
    centro: { flex: 1 },
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
    horaMeu: { alignSelf: 'flex-end', fontSize: 11, color: colors.surface, opacity: 0.8 },
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
