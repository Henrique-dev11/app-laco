import { View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { Avatar } from '../components/Avatar';
import { Estrelas } from '../components/Estrelas';
import { GraficoBarras, moeda } from '../components/CartoesCarteira';
import { Notice } from '../components/Notice';
import { useConsultaApi } from '../hooks/useConsultaApi';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAppStyles } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';

type Perfil = {
  usuario: {
    id: number;
    nome: string;
    nomeSocial: string | null;
    foto: { updatedAt: string } | null;
  };
  statusVerificacao?: string;
  biografia?: string | null;
  experienciaProfissional?: string | null;
  avaliacoes: {
    media: number | null;
    total: number;
    avaliacoes?: {
      id: number;
      autor: string;
      nota: number;
      comentario: string | null;
    }[];
  };
  desempenho: { mes: string; total: number; media?: number | null }[];
  cuidadorServicos?: {
    id: number;
    preco: string;
    duracaoMinutos: number;
    servico: { nome: string };
  }[];
  idosos?: { primeiroNome: string; faixaEtaria: string }[];
};
const mesCurto = (mes: string) =>
  new Date(mes + '-01T12:00:00Z').toLocaleDateString('pt-BR', {
    month: 'short',
    timeZone: 'UTC',
  });

export function PerfilConsultaScreen({ route }: ScreenProps<'PerfilConsulta'>) {
  const { usuarioId, tipo, proprio } = route.params;
  const cuidador = tipo === 'cuidador';
  const consulta = useConsultaApi<Perfil>(
    proprio
      ? '/perfis/me'
      : `/perfis/${cuidador ? 'cuidadores' : 'responsaveis'}/${usuarioId}`,
  );
  const perfil = consulta.dados;
  const styles = useAppStyles();
  const nome = perfil?.usuario.nomeSocial || perfil?.usuario.nome || '';
  return (
    <AppScreenLayout
      title={
        proprio
          ? 'Prévia do meu perfil'
          : cuidador
            ? 'Perfil do cuidador'
            : 'Perfil do responsável'
      }
      atualizacao={consulta}
    >
      {!!consulta.erro && <Notice>{consulta.erro}</Notice>}
      {!perfil && !consulta.erro && <Notice>Carregando perfil...</Notice>}
      {perfil && (
        <>
          {proprio && cuidador && perfil.statusVerificacao !== 'APROVADO' && (
            <Notice>
              A prévia está disponível para você. A consulta por outras pessoas
              depende da aprovação do perfil.
            </Notice>
          )}
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Avatar
              nome={nome}
              usuarioId={usuarioId}
              versao={perfil.usuario.foto?.updatedAt}
              tamanho={88}
            />
            <Text style={styles.name}>{nome}</Text>
            {perfil.avaliacoes.media === null ? (
              <Text style={styles.text}>Ainda sem avaliações</Text>
            ) : (
              <>
                <Estrelas nota={perfil.avaliacoes.media} tamanho={20} />
                <Text style={styles.text}>
                  {perfil.avaliacoes.media.toLocaleString('pt-BR')} de 5 ·{' '}
                  {perfil.avaliacoes.total} avaliações
                </Text>
              </>
            )}
          </View>
          {!!(perfil.biografia || perfil.experienciaProfissional) && (
            <View style={styles.card}>
              <Text style={styles.section}>Sobre o cuidador</Text>
              {!!perfil.biografia && (
                <Text style={styles.text}>{perfil.biografia}</Text>
              )}
              {!!perfil.experienciaProfissional && (
                <Text style={styles.text}>
                  {perfil.experienciaProfissional}
                </Text>
              )}
            </View>
          )}
          <GraficoBarras
            titulo={cuidador ? 'Visitas concluídas' : 'Evolução das avaliações'}
            pontos={perfil.desempenho.map((item) => ({
              rotulo: mesCurto(item.mes),
              valor: cuidador ? item.total : (item.media ?? null),
            }))}
            unidade={cuidador ? 'visitas concluídas' : 'notas'}
            formatar={(valor) =>
              cuidador
                ? `${valor} ${valor === 1 ? 'visita' : 'visitas'}`
                : valor.toLocaleString('pt-BR') + ' de 5'
            }
          />
          {cuidador ? (
            <>
              <Text style={styles.section}>Serviços e valores</Text>
              {!perfil.cuidadorServicos?.length && (
                <Notice>Nenhum serviço ativo.</Notice>
              )}
              {perfil.cuidadorServicos?.map((item) => (
                <View style={styles.card} key={item.id}>
                  <Text style={styles.name}>{item.servico.nome}</Text>
                  <Text style={styles.text}>
                    {moeda(item.preco)} · {item.duracaoMinutos} min
                  </Text>
                </View>
              ))}
              <Text style={styles.section}>Avaliações</Text>
              {!perfil.avaliacoes.avaliacoes?.length && (
                <Notice>Ainda não há avaliações.</Notice>
              )}
              {perfil.avaliacoes.avaliacoes?.map((item) => (
                <View style={styles.card} key={item.id}>
                  <Text style={styles.name}>{item.autor}</Text>
                  <Estrelas nota={item.nota} tamanho={18} />
                  {!!item.comentario && (
                    <Text style={styles.text}>{item.comentario}</Text>
                  )}
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.section}>
                Idosos vinculados aos seus atendimentos
              </Text>
              {!perfil.idosos?.length && (
                <Notice>Nenhum vínculo disponível.</Notice>
              )}
              {perfil.idosos?.map((idoso, index) => (
                <View style={styles.card} key={index}>
                  <Text style={styles.name}>{idoso.primeiroNome}</Text>
                  <Text style={styles.text}>{idoso.faixaEtaria}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </AppScreenLayout>
  );
}
