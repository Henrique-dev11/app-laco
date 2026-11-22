import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '../accessibility/Texto';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { fs, lh } from '../theme/tipografia';
import {
  dataAvaliacao,
  type Avaliacao,
  type ResumoAvaliacoes,
} from '../services/avaliacoes';
import {
  formatarMedia,
  nomeAvaliador,
  textoTotalAvaliacoes,
} from '../utils/avaliacoes';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Estrelas } from './Estrelas';
import { Notice } from './Notice';

const POR_PAGINA = 3;

type Dados = {
  resumo: ResumoAvaliacoes | null;
  carregando: boolean;
  erro: string;
  atualizar: () => void;
};

/** Nota média em destaque (nome, estrelas e quantidade), no topo do cuidador. */
export function ResumoNota({ resumo, carregando }: Pick<Dados, 'resumo' | 'carregando'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  if (carregando && !resumo)
    return (
      <View style={styles.resumo}>
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Carregando avaliações"
        />
      </View>
    );
  const media = resumo?.media ?? null;
  return (
    <View style={styles.resumo}>
      <Text style={styles.media}>{formatarMedia(media)}</Text>
      <View style={styles.resumoInfo}>
        {media !== null && <Estrelas nota={media} tamanho={18} />}
        <Text style={styles.apoio}>
          {textoTotalAvaliacoes(resumo?.total ?? 0)}
        </Text>
      </View>
    </View>
  );
}

/** Lista de avaliações (estrelas, comentário e data) de um cuidador. */
export function ListaAvaliacoes({ resumo, carregando, erro, atualizar }: Dados) {
  const styles = useStyles(criarStyles);
  const [visiveis, setVisiveis] = useState(POR_PAGINA);
  return (
    <View style={styles.bloco}>
      <Text accessibilityRole="header" style={styles.secao}>
        Avaliações
      </Text>
      {!!erro && (
        <>
          <Notice>{erro}</Notice>
          <Button title="Tentar novamente" variant="outline" onPress={atualizar} />
        </>
      )}
      {!carregando && !erro && !resumo?.avaliacoes.length && (
        <Text style={styles.texto}>Este cuidador ainda não foi avaliado.</Text>
      )}
      {resumo?.avaliacoes.slice(0, visiveis).map((avaliacao) => (
        <ItemAvaliacao key={avaliacao.id} avaliacao={avaliacao} />
      ))}
      {!!resumo && resumo.avaliacoes.length > visiveis && (
        <Button
          title="Ver mais avaliações"
          variant="outline"
          onPress={() => setVisiveis((n) => n + POR_PAGINA * 2)}
        />
      )}
    </View>
  );
}

function ItemAvaliacao({ avaliacao }: { avaliacao: Avaliacao }) {
  const styles = useStyles(criarStyles);
  const nome = nomeAvaliador(avaliacao.autor.nomeSocial || avaliacao.autor.nome);
  return (
    <View style={styles.item}>
      <View style={styles.itemTopo}>
        <Avatar nome={nome} tamanho={40} />
        <View style={styles.resumoInfo}>
          <Text style={styles.autor}>{nome}</Text>
          <View style={styles.linha}>
            <Estrelas nota={avaliacao.nota} />
            <Text style={styles.apoio}>{dataAvaliacao(avaliacao.criadoEm)}</Text>
          </View>
        </View>
      </View>
      {!!avaliacao.comentario && (
        <Text style={styles.texto}>{avaliacao.comentario}</Text>
      )}
    </View>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    resumo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    media: { fontSize: fs(32), fontWeight: '700', color: colors.text },
    resumoInfo: { flex: 1, gap: 2 },
    apoio: { fontSize: fs(13), color: colors.muted },
    bloco: { gap: 10 },
    secao: { fontSize: fs(16), fontWeight: '700', color: colors.text },
    texto: { fontSize: fs(14), lineHeight: lh(21), color: colors.muted },
    item: {
      gap: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
    },
    itemTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    autor: { fontSize: fs(15), fontWeight: '600', color: colors.text },
  });
