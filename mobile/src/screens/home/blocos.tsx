import { fs, lh } from '../../theme/tipografia';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { MotionPressable as TouchableOpacity } from '../../motion/MotionPressable';
import type { Paleta } from '../../theme';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import {
  formatarDia,
  formatarHora,
  rotuloDia,
  type Atendimento,
} from '../../utils/home';

type Icone = ComponentProps<typeof Ionicons>['name'];

/** Título de seção, com um link opcional à direita. */
export function SecaoTitulo({
  children,
  acao,
  onAcao,
}: {
  children: string;
  acao?: string;
  onAcao?: () => void;
}) {
  const styles = useStyles(criarStyles);
  return (
    <View style={styles.secaoLinha}>
      <Text accessibilityRole="header" style={styles.secao}>
        {children}
      </Text>
      {!!acao && !!onAcao && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={acao}
          onPress={onAcao}
          style={styles.secaoAcao}
        >
          <Text style={styles.secaoAcaoTexto}>{acao}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Destaque do próximo atendimento, com dia e hora bem grandes. */
export function ProximoAtendimento({
  proximo,
  agora,
  erro,
  linha,
  vazio,
  grande = false,
  onPress,
}: {
  proximo: Atendimento | null;
  /** Instante em que a lista foi carregada (define "Hoje"/"Amanhã"). */
  agora: number;
  erro: boolean;
  /** Segunda linha do card (quem cuida de quem). */
  linha: (atendimento: Atendimento) => string;
  /** Mostrado quando não há atendimento; sem isso o bloco some. */
  vazio?: { texto: string; acao?: string; onAcao?: () => void };
  grande?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  if (!proximo) {
    if (!vazio && !erro) return null;
    return (
      <View style={styles.vazio}>
        <View style={styles.vazioTopo}>
          <Ionicons
            name="calendar-outline"
            size={28}
            color={colors.primaryDark}
          />
          <Text style={styles.vazioTexto}>
            {erro
              ? 'Não foi possível atualizar. Abra sua agenda para ver os atendimentos.'
              : vazio?.texto}
          </Text>
        </View>
        {!!vazio?.acao && !!vazio.onAcao && !erro && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={vazio.onAcao}
            style={styles.vazioBotao}
          >
            <Text style={styles.vazioBotaoTexto}>{vazio.acao}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  const dia = rotuloDia(proximo.inicio, agora);
  const hora = formatarHora(proximo.inicio);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Próximo atendimento, ${dia} às ${hora}. ${linha(proximo)}`}
      onPress={onPress}
      style={styles.destaque}
    >
      <Text style={styles.destaqueRotulo}>Próximo atendimento</Text>
      <View style={styles.destaqueQuando}>
        <Text
          style={[styles.destaqueHora, grande && styles.destaqueHoraGrande]}
        >
          {hora}
        </Text>
        <Text style={styles.destaqueDia}>{dia}</Text>
      </View>
      <Text style={styles.destaqueServico}>
        {proximo.contratacao.cuidadorServico.servico.nome}
      </Text>
      <Text style={styles.destaqueLinha}>{linha(proximo)}</Text>
      <View style={styles.destaqueRodape}>
        <Text style={styles.destaqueVer}>Ver na agenda</Text>
        <Ionicons name="chevron-forward" size={22} color={colors.surface} />
      </View>
    </TouchableOpacity>
  );
}

/** Linha de um atendimento agendado (hora + dia à esquerda). */
export function ItemAtendimento({
  item,
  linha,
  onPress,
}: {
  item: Atendimento;
  linha: string;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const iniciado = new Date(item.inicio) <= new Date();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.item}
      onPress={onPress}
    >
      <View style={styles.quando}>
        <Text style={styles.quandoHora}>{formatarHora(item.inicio)}</Text>
        <Text style={styles.quandoDia}>{formatarDia(item.inicio)}</Text>
      </View>
      <View style={styles.grow}>
        <Text style={styles.itemNome}>
          {item.contratacao.cuidadorServico.servico.nome}
        </Text>
        <Text style={styles.itemDetalhe}>{linha}</Text>
        {iniciado && (
          <Text style={styles.itemAndamento}>
            Em andamento ou aguardando conclusão
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

/** Linha de pessoa (idoso ou o próprio cuidador) com foto e seta. */
export function LinhaPessoa({
  nome,
  detalhe,
  avatar,
  onPress,
}: {
  nome: string;
  detalhe: string;
  avatar: Pick<
    ComponentProps<typeof Avatar>,
    'usuarioId' | 'idosoId' | 'versao'
  >;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.item}
      onPress={onPress}
    >
      <Avatar nome={nome} tamanho={52} {...avatar} />
      <View style={styles.grow}>
        <Text style={styles.itemNome}>{nome}</Text>
        <Text style={styles.itemDetalhe}>{detalhe}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

/** Dois números lado a lado (resumo do cuidador). */
export function Resumo({
  itens,
}: {
  itens: { valor: number; rotulo: string; icone: Icone }[];
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <View style={styles.resumo}>
      {itens.map((item) => (
        <View
          key={item.rotulo}
          accessible
          accessibilityLabel={`${item.valor} ${item.rotulo}`}
          style={styles.resumoItem}
        >
          <Ionicons name={item.icone} size={24} color={colors.primaryDark} />
          <Text style={styles.resumoValor}>{item.valor}</Text>
          <Text style={styles.resumoRotulo}>{item.rotulo}</Text>
        </View>
      ))}
    </View>
  );
}

/** Botão largo com ícone grande: o atalho principal da Home do idoso. */
export function AtalhoGrande({
  titulo,
  descricao,
  icone,
  onPress,
}: {
  titulo: string;
  descricao: string;
  icone: Icone;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${descricao}`}
      onPress={onPress}
      style={styles.atalho}
    >
      <View style={styles.atalhoIcone}>
        <Ionicons name={icone} size={34} color={colors.surface} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.atalhoTitulo}>{titulo}</Text>
        <Text style={styles.atalhoDescricao}>{descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={26} color={colors.muted} />
    </TouchableOpacity>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    grow: { flex: 1 },
    secaoLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    secao: {
      color: colors.text,
      fontWeight: '700',
      fontSize: fs(17),
      flexShrink: 1,
    },
    secaoAcao: { minHeight: 44, justifyContent: 'center' },
    secaoAcaoTexto: {
      color: colors.primaryDark,
      fontWeight: '700',
      fontSize: fs(14),
      textDecorationLine: 'underline',
    },
    destaque: {
      backgroundColor: colors.primaryDark,
      borderRadius: 20,
      padding: 20,
      gap: 6,
    },
    destaqueRotulo: {
      color: colors.onHeader,
      fontSize: fs(13),
      fontWeight: '600',
    },
    destaqueQuando: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      columnGap: 12,
    },
    destaqueHora: {
      color: colors.surface,
      fontSize: fs(34),
      fontWeight: '800',
    },
    destaqueHoraGrande: { fontSize: fs(40) },
    destaqueDia: { color: colors.surface, fontSize: fs(18), fontWeight: '700' },
    destaqueServico: {
      color: colors.surface,
      fontSize: fs(17),
      fontWeight: '700',
    },
    destaqueLinha: { color: colors.onHeader, fontSize: fs(15) },
    destaqueRodape: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 6,
    },
    destaqueVer: { color: colors.surface, fontSize: fs(14), fontWeight: '700' },
    vazio: {
      backgroundColor: colors.chip,
      borderRadius: 16,
      padding: 18,
      gap: 14,
    },
    vazioTopo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    vazioTexto: {
      flex: 1,
      color: colors.text,
      fontSize: fs(15),
      fontWeight: '600',
      lineHeight: lh(22),
    },
    vazioBotao: {
      minHeight: 48,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    vazioBotaoTexto: {
      color: colors.surface,
      fontSize: fs(15),
      fontWeight: '700',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.surface,
    },
    itemNome: { color: colors.text, fontSize: fs(16), fontWeight: '700' },
    itemDetalhe: { color: colors.muted, fontSize: fs(14), marginTop: 4 },
    itemAndamento: {
      color: colors.primaryDark,
      fontSize: fs(13),
      fontWeight: '700',
      marginTop: 4,
    },
    quando: {
      minWidth: 80,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    quandoHora: {
      color: colors.primaryDark,
      fontSize: fs(22),
      fontWeight: '800',
    },
    quandoDia: { color: colors.muted, fontSize: fs(12), fontWeight: '600' },
    resumo: { flexDirection: 'row', gap: 12 },
    resumoItem: {
      flex: 1,
      gap: 4,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resumoValor: { color: colors.text, fontSize: fs(28), fontWeight: '800' },
    resumoRotulo: { color: colors.muted, fontSize: fs(13), fontWeight: '600' },
    atalho: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      minHeight: 88,
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    atalhoIcone: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    atalhoTitulo: { color: colors.text, fontSize: fs(20), fontWeight: '800' },
    atalhoDescricao: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
  });
