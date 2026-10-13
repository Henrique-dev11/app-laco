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
import { BottomNavigation } from '../components/BottomNavigation';
import { Notice } from '../components/Notice';
import { QuickAccessCard } from '../components/QuickAccessCard';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { colors } from '../theme';
import { statusLabels } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';

type Atendimento = {
  id: number;
  inicio: string;
  ativo: boolean;
  contratacao: {
    status: string;
    idoso: { nome: string };
    cuidadorServico: { cuidador: { usuario: { nome: string } } };
  };
};
export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { usuario, atualizar } = useAuth();
  const [proximo, setProximo] = useState<Atendimento | null>(null);
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
            setProximo(
              data
                .filter(
                  (item) =>
                    item.ativo &&
                    item.contratacao.status === 'ACEITA' &&
                    new Date(item.inicio) > new Date(),
                )
                .sort(
                  (a, b) =>
                    new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
                )[0] ?? null,
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
  const proprio = idosos.some((item) => item.parentesco === 'PROPRIO');
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.user}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {nome.charAt(0).toUpperCase()}
              </Text>
            </View>
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
                <View style={styles.elderAvatar}>
                  <Text style={styles.avatarText}>
                    {nome.charAt(0).toUpperCase()}
                  </Text>
                </View>
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
                  <View style={styles.elderAvatar}>
                    <Text style={styles.avatarText}>
                      {(idoso.nomeSocial || idoso.nome).charAt(0).toUpperCase()}
                    </Text>
                  </View>
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
            {!cuidador && !idosos.length && (
              <Notice>Nenhum idoso vinculado à sua conta.</Notice>
            )}
            <Text style={styles.section}>Acesso rápido</Text>
            <View style={styles.quick}>
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
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.text },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.text,
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
  welcome: { color: '#E0D4DC', fontSize: 12 },
  name: { color: colors.surface, fontSize: 18, fontWeight: '700' },
  notification: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5C2D51',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 24, flexGrow: 1 },
  content: { gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    backgroundColor: '#EFEBF0',
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
});
