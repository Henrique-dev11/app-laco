import { fs } from '../../theme/tipografia';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Notice } from '../../components/Notice';
import { QuickAccessCard } from '../../components/QuickAccessCard';
import { useAuth } from '../../contexts/AuthContext';
import { useAgendados } from '../../hooks/useAgendados';
import { useNotificacoes } from '../../hooks/useNotificacoes';
import { MotionPressable as TouchableOpacity } from '../../motion/MotionPressable';
import { mensagemErro } from '../../services/api';
import type { Paleta } from '../../theme';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { statusLabels } from '../../theme/appStyles';
import {
  ItemAtendimento,
  LinhaPessoa,
  ProximoAtendimento,
  Resumo,
  SecaoTitulo,
} from './blocos';
import { HomeShell, type HomeProps } from './HomeShell';

/** Home do cuidador: agenda de trabalho em primeiro plano. */
export function HomeCuidador({ navigation }: HomeProps) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario, atualizar } = useAuth();
  const { pendentes } = useNotificacoes();
  const { agendados, proximo, erro, agora } = useAgendados();
  const [erroCadastro, setErroCadastro] = useState('');
  const cuidador = usuario?.cuidador;
  if (!usuario || !cuidador) return null;
  return (
    <HomeShell navigation={navigation}>
      {cuidador.statusVerificacao !== 'APROVADO' && (
        <Notice>
          {cuidador.statusVerificacao === 'PENDENTE'
            ? 'Recebemos seu cadastro. Seu perfil aguarda a análise da equipe do Laço.'
            : 'Seu perfil ainda não foi aprovado. Entre em contato com a equipe do Laço para revisar o cadastro.'}
        </Notice>
      )}
      <ProximoAtendimento
        proximo={proximo}
        agora={agora}
        erro={erro}
        linha={(item) => `Idoso: ${item.contratacao.idoso.nome}`}
        vazio={{
          texto: 'Nenhum atendimento agendado por enquanto.',
          acao: 'Informar minha disponibilidade',
          onAcao: () => navigation.navigate('Disponibilidade'),
        }}
        onPress={() => navigation.navigate('Agenda')}
      />
      <Resumo
        itens={[
          {
            valor: agendados.length,
            rotulo:
              agendados.length === 1
                ? 'atendimento próximo'
                : 'atendimentos próximos',
            icone: 'calendar-outline',
          },
          {
            valor: pendentes,
            rotulo: pendentes === 1 ? 'aviso novo' : 'avisos novos',
            icone: 'notifications-outline',
          },
        ]}
      />
      {!!agendados.length && (
        <>
          <SecaoTitulo
            acao="Ver agenda"
            onAcao={() => navigation.navigate('Agenda')}
          >
            Próximos atendimentos
          </SecaoTitulo>
          {agendados.slice(0, 5).map((item) => (
            <ItemAtendimento
              key={item.id}
              item={item}
              linha={`Idoso: ${item.contratacao.idoso.nome}`}
              onPress={() => navigation.navigate('Agenda')}
            />
          ))}
        </>
      )}
      <SecaoTitulo>Meu trabalho</SecaoTitulo>
      <View style={styles.quick}>
        <QuickAccessCard
          title="Disponibilidade"
          icon="time-outline"
          onPress={() => navigation.navigate('Disponibilidade')}
        />
        <QuickAccessCard
          title="Meus serviços"
          icon="briefcase-outline"
          onPress={() => navigation.navigate('MeusServicos')}
        />
        <QuickAccessCard
          title="Agenda"
          icon="calendar-outline"
          onPress={() => navigation.navigate('Agenda')}
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
      </View>
      <SecaoTitulo>Meu perfil</SecaoTitulo>
      <LinhaPessoa
        nome={usuario.nomeSocial || usuario.nome}
        detalhe={`${statusLabels[cuidador.statusVerificacao] ?? cuidador.statusVerificacao} · ${cuidador.cuidadorServicos.length} serviço(s)`}
        avatar={{ usuarioId: usuario.id, versao: usuario.foto?.updatedAt }}
        onPress={() => navigation.navigate('Perfil')}
      />
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.atualizar}
        onPress={() => {
          setErroCadastro('');
          void atualizar().catch((error) =>
            setErroCadastro(mensagemErro(error)),
          );
        }}
      >
        <Ionicons name="refresh-outline" size={22} color={colors.primaryDark} />
        <Text style={styles.atualizarTexto}>
          Atualizar situação do meu cadastro
        </Text>
      </TouchableOpacity>
      {!!erroCadastro && <Notice>{erroCadastro}</Notice>}
    </HomeShell>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    atualizar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      padding: 16,
      gap: 14,
      backgroundColor: colors.chip,
      borderRadius: 16,
    },
    atualizarTexto: {
      flex: 1,
      color: colors.primaryDark,
      fontSize: fs(14),
      fontWeight: '600',
    },
  });
