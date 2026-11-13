import { StyleSheet, View } from 'react-native';
import { Notice } from '../../components/Notice';
import { QuickAccessCard } from '../../components/QuickAccessCard';
import { useAuth } from '../../contexts/AuthContext';
import { useAgendados } from '../../hooks/useAgendados';
import {
  ItemAtendimento,
  LinhaPessoa,
  ProximoAtendimento,
  SecaoTitulo,
} from './blocos';
import { HomeShell, type HomeProps } from './HomeShell';

/** Home do responsável: quem ele cuida e como encontrar um cuidador. */
export function HomeResponsavel({ navigation }: HomeProps) {
  const { usuario } = useAuth();
  const { agendados, proximo, erro, agora } = useAgendados();
  if (!usuario?.responsavel) return null;
  const idosos = usuario.responsavel.responsavelIdosos;
  return (
    <HomeShell navigation={navigation}>
      <ProximoAtendimento
        proximo={proximo}
        agora={agora}
        erro={erro}
        linha={(item) =>
          `${item.contratacao.cuidadorServico.cuidador.usuario.nome} cuida de ${item.contratacao.idoso.nome}`
        }
        vazio={{
          texto: 'Nenhum atendimento agendado por enquanto.',
          acao: 'Buscar cuidador',
          onAcao: () => navigation.navigate('BuscarCuidador'),
        }}
        onPress={() => navigation.navigate('Agenda')}
      />
      <SecaoTitulo
        acao={idosos.length ? 'Ver todos' : 'Adicionar'}
        onAcao={() =>
          navigation.navigate(idosos.length ? 'MeusIdosos' : 'AdicionarIdoso')
        }
      >
        Meus idosos
      </SecaoTitulo>
      {idosos.length ? (
        idosos.map(({ idoso }) => (
          <LinhaPessoa
            key={idoso.id}
            nome={idoso.nomeSocial || idoso.nome}
            detalhe={`${idoso.endereco.cidade}/${idoso.endereco.estado}`}
            avatar={{ idosoId: idoso.id, versao: idoso.foto?.updatedAt }}
            onPress={() =>
              navigation.navigate('IdosoDetalhes', { idosoId: idoso.id })
            }
          />
        ))
      ) : (
        <Notice>Nenhum idoso vinculado à sua conta.</Notice>
      )}
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
              linha={`Cuidador: ${item.contratacao.cuidadorServico.cuidador.usuario.nome}`}
              onPress={() => navigation.navigate('Agenda')}
            />
          ))}
        </>
      )}
      <SecaoTitulo>Acesso rápido</SecaoTitulo>
      <View style={styles.quick}>
        <QuickAccessCard
          title="Buscar cuidador"
          icon="search-outline"
          onPress={() => navigation.navigate('BuscarCuidador')}
        />
        <QuickAccessCard
          title="Meus idosos"
          icon="people-outline"
          onPress={() => navigation.navigate('MeusIdosos')}
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
    </HomeShell>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
