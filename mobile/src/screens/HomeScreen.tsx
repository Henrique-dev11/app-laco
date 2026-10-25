import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { BottomNavigation } from '../components/BottomNavigation';
import { Notice } from '../components/Notice';
import { QuickAccessCard } from '../components/QuickAccessCard';
import { MeuCuidadoCard } from '../components/MeuCuidadoCard';
import { useAuth } from '../contexts/AuthContext';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { api, mensagemErro } from '../services/api';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { statusLabels } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';

type Atendimento = {
  id: number;
  inicio: string;
  ativo: boolean;
  contratacao: {
    status: string;
    idoso: { nome: string };
    cuidadorServico: {
      servico: { nome: string };
      cuidador: { usuario: { nome: string } };
    };
  };
};
const FUSO = 'America/Sao_Paulo';
const JANELA_FRENTE_MS = 2 * 24 * 60 * 60 * 1000;
const JANELA_ATRAS_MS = 24 * 60 * 60 * 1000;
const formatarHora = (valor: string) =>
  new Date(valor).toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  });
const formatarDia = (valor: string) =>
  new Date(valor).toLocaleDateString('pt-BR', {
    timeZone: FUSO,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario, atualizar } = useAuth();
  const { pendentes } = useNotificacoes();
  const [proximo, setProximo] = useState<Atendimento | null>(null);
  const [agendados, setAgendados] = useState<Atendimento[]>([]);
  const [erroAgenda, setErroAgenda] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      api
        .get<Atendimento[]>('/agendamentos', { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setErroAgenda(false);
            // Contratos aceitos que já têm horário marcado, do mais próximo ao mais distante.
            const aceitos = data
              .filter(
                (item) => item.ativo && item.contratacao.status === 'ACEITA',
              )
              .sort(
                (a, b) =>
                  new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
              );
            // Na Home, só o que está perto: próximos 2 dias e o que começou nas
            // últimas 24 h e ainda não foi concluído. O restante fica na Agenda.
            const agora = Date.now();
            setAgendados(
              aceitos.filter((item) => {
                const inicio = new Date(item.inicio).getTime();
                return (
                  inicio >= agora - JANELA_ATRAS_MS &&
                  inicio <= agora + JANELA_FRENTE_MS
                );
              }),
            );
            setProximo(
              aceitos.find((item) => new Date(item.inicio) > new Date()) ??
                null,
            );
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setErroAgenda(true);
        });
      return () => controller.abort();
    }, []),
  );
  if (!usuario) return null;
  const nome = (usuario.nomeSocial || usuario.nome).split(/\s+/)[0];
  const cuidador = !!usuario.cuidador;
  const idosos = usuario.responsavel?.responsavelIdosos ?? [];
  const proprio = idosos.find((item) => item.parentesco === 'PROPRIO')?.idoso;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.user}>
            <Avatar
              nome={nome}
              usuarioId={usuario.id}
              versao={usuario.foto?.updatedAt}
              tamanho={48}
              fundo={colors.surface}
            />
            <View>
              <Text style={styles.welcome}>Olá,</Text>
              <Text style={styles.name}>{nome}</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            onPress={() => navigation.navigate('Notificacoes')}
            style={styles.notification}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.surface}
            />
            {pendentes > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {pendentes > 9 ? '9+' : pendentes}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>
            {usuario.cuidador &&
              usuario.cuidador.statusVerificacao !== 'APROVADO' && (
                <Notice>
                  {usuario.cuidador.statusVerificacao === 'PENDENTE'
                    ? 'Recebemos seu cadastro. Seu perfil aguarda a análise da equipe do Laço.'
                    : 'Seu perfil ainda não foi aprovado. Entre em contato com a equipe do Laço para revisar o cadastro.'}
                </Notice>
              )}
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.alert}
              onPress={() => navigation.navigate('Agenda')}
            >
              <Ionicons
                name="time-outline"
                size={24}
                color={colors.primaryDark}
              />
              <View style={styles.grow}>
                <Text style={styles.overline}>
                  {proximo
                    ? new Date(proximo.inicio).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'SUA AGENDA'}
                </Text>
                <Text style={styles.description}>
                  {erroAgenda
                    ? 'Consulte sua agenda para atualizar os atendimentos'
                    : proximo
                      ? `${proximo.contratacao.cuidadorServico.cuidador.usuario.nome} cuida de ${proximo.contratacao.idoso.nome}`
                      : 'Nenhum atendimento agendado por enquanto'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
            <Text style={styles.section}>
              {cuidador
                ? 'Meu perfil'
                : proprio
                  ? 'Meu cuidado'
                  : 'Meus idosos'}
            </Text>
            {cuidador ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.elder}
                onPress={() => navigation.navigate('Perfil')}
              >
                <Avatar
                  nome={nome}
                  usuarioId={usuario.id}
                  versao={usuario.foto?.updatedAt}
                  tamanho={44}
                />
                <View style={styles.grow}>
                  <Text style={styles.elderName}>
                    {usuario.nomeSocial || usuario.nome}
                  </Text>
                  <Text style={styles.details}>
                    {statusLabels[usuario.cuidador!.statusVerificacao]} ·{' '}
                    {usuario.cuidador!.cuidadorServicos.length} serviço(s)
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            ) : proprio ? (
              <MeuCuidadoCard idosoId={proprio.id} navigation={navigation} />
            ) : (
              idosos.map(({ idoso }) => (
                <TouchableOpacity
                  key={idoso.id}
                  accessibilityRole="button"
                  style={styles.elder}
                  onPress={() =>
                    navigation.navigate('IdosoDetalhes', { idosoId: idoso.id })
                  }
                >
                  <Avatar
                    nome={idoso.nomeSocial || idoso.nome}
                    idosoId={idoso.id}
                    versao={idoso.foto?.updatedAt}
                    tamanho={44}
                  />
                  <View style={styles.grow}>
                    <Text style={styles.elderName}>
                      {idoso.nomeSocial || idoso.nome}
                    </Text>
                    <Text style={styles.details}>
                      {idoso.endereco.cidade}/{idoso.endereco.estado}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              ))
            )}
            {!cuidador && !proprio && !idosos.length && (
              <Notice>Nenhum idoso vinculado à sua conta.</Notice>
            )}
            <Text style={styles.section}>Acesso rápido</Text>
            <View style={styles.quick}>
              {!cuidador && (
                <QuickAccessCard
                  title={proprio ? 'Meu perfil' : 'Meus idosos'}
                  icon={proprio ? 'person-outline' : 'people-outline'}
                  onPress={() =>
                    navigation.navigate(proprio ? 'Perfil' : 'MeusIdosos')
                  }
                />
              )}
              <QuickAccessCard
                title={cuidador ? 'Disponibilidade' : 'Buscar cuidador'}
                icon={cuidador ? 'time-outline' : 'search-outline'}
                onPress={() =>
                  navigation.navigate(
                    cuidador ? 'Disponibilidade' : 'BuscarCuidador',
                  )
                }
              />
              <QuickAccessCard
                title="Histórico"
                icon="list-outline"
                onPress={() => navigation.navigate('Historico')}
              />
              <QuickAccessCard
                title="Ver serviços"
                icon="heart-outline"
                onPress={() => navigation.navigate('Servicos')}
              />
              <QuickAccessCard
                title="Agenda"
                icon="calendar-outline"
                onPress={() => navigation.navigate('Agenda')}
              />
            </View>
            {cuidador && (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.alert}
                onPress={() => {
                  setErroCadastro('');
                  void atualizar().catch((error) =>
                    setErroCadastro(mensagemErro(error)),
                  );
                }}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={colors.primaryDark}
                />
                <Text style={styles.details}>
                  Atualizar situação do meu cadastro
                </Text>
              </TouchableOpacity>
            )}
            {!!erroCadastro && <Notice>{erroCadastro}</Notice>}
            {!!agendados.length && (
              <>
                <Text style={styles.section}>Próximos atendimentos</Text>
                {agendados.slice(0, 5).map((item) => {
                  const iniciado = new Date(item.inicio) <= new Date();
                  const { servico, cuidador: prestador } =
                    item.contratacao.cuidadorServico;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      accessibilityRole="button"
                      style={styles.elder}
                      onPress={() => navigation.navigate('Agenda')}
                    >
                      <View style={styles.when}>
                        <Text style={styles.whenTime}>
                          {formatarHora(item.inicio)}
                        </Text>
                        <Text style={styles.whenDate}>
                          {formatarDia(item.inicio)}
                        </Text>
                      </View>
                      <View style={styles.grow}>
                        <Text style={styles.elderName}>{servico.nome}</Text>
                        <Text style={styles.details}>
                          {cuidador
                            ? `Idoso: ${item.contratacao.idoso.nome}`
                            : `Cuidador: ${prestador.usuario.nome}`}
                        </Text>
                        {iniciado && (
                          <Text style={styles.pending}>
                            Em andamento ou aguardando conclusão
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        </ScrollView>
        <BottomNavigation
          onHome={() => navigation.popToTop()}
          onSearch={() => navigation.navigate('BuscarCuidador')}
          onAgenda={() => navigation.navigate('Agenda')}
          onMessages={() => navigation.navigate('Mensagens')}
          onProfile={() => navigation.navigate('Perfil')}
        />
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
      paddingHorizontal: 24,
      paddingVertical: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    user: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
    welcome: { color: colors.onHeader, fontSize: 12 },
    name: { color: colors.surface, fontSize: 18, fontWeight: '700' },
    notification: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.headerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error,
    },
    notificationBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.surface,
    },
    scroll: { padding: 24, flexGrow: 1 },
    content: { gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
    alert: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 14,
      backgroundColor: colors.chip,
      borderRadius: 16,
    },
    overline: {
      color: colors.primaryDark,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    description: { color: colors.text, fontWeight: '600', fontSize: 15 },
    section: { color: colors.text, fontWeight: '700', fontSize: 16 },
    elder: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.surface,
    },
    elderAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grow: { flex: 1 },
    elderName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    details: { color: colors.muted, fontSize: 13, marginTop: 4 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    when: {
      minWidth: 76,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    whenTime: { color: colors.primaryDark, fontSize: 22, fontWeight: '800' },
    whenDate: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    pending: {
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },
  });
