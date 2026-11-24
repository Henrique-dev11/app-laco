import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../components/Button';
import { useMotion } from '../motion/MotionProvider';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { fs, lh } from '../theme/tipografia';
import {
  ESCALAS_FONTE,
  passoEscala,
  rotuloEscala,
  type Contraste,
  type PosicaoBotao,
  type VelocidadeVoz,
} from '../utils/acessibilidade';
import {
  useLeitura,
  usePreferenciasAcessibilidade,
} from './AcessibilidadeContext';
import { ForaDaLeitura, Text } from './Texto';

type Props = { visivel: boolean; onClose: () => void };

const contrastes: { valor: Contraste; titulo: string; descricao: string }[] = [
  { valor: 'padrao', titulo: 'Padrão', descricao: 'Cores originais do Laço' },
  {
    valor: 'claro',
    titulo: 'Alto contraste claro',
    descricao: 'Fundo branco e letras pretas',
  },
  {
    valor: 'escuro',
    titulo: 'Alto contraste escuro',
    descricao: 'Fundo preto e letras amarelas e brancas',
  },
];
const velocidades: { valor: VelocidadeVoz; titulo: string }[] = [
  { valor: 'lenta', titulo: 'Lenta' },
  { valor: 'normal', titulo: 'Normal' },
  { valor: 'rapida', titulo: 'Rápida' },
];
const posicoes: { valor: PosicaoBotao; titulo: string }[] = [
  { valor: 'esquerda', titulo: 'Esquerda' },
  { valor: 'direita', titulo: 'Direita' },
];

/**
 * Painel de acessibilidade (folha inferior, no mesmo padrão dos outros
 * modais do app). Tudo é aplicado e salvo na hora, sem botão de confirmar.
 */
export function PainelAcessibilidade({ visivel, onClose }: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { reducedMotion } = useMotion();
  const { preferencias, atualizar, restaurar } =
    usePreferenciasAcessibilidade();
  const { falando, parar } = useLeitura();

  const escalaMinima = preferencias.escalaFonte === ESCALAS_FONTE[0];
  const escalaMaxima =
    preferencias.escalaFonte === ESCALAS_FONTE[ESCALAS_FONTE.length - 1];

  return (
    <Modal
      visible={visivel}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <ForaDaLeitura>
        <View style={styles.fundo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessible={false}
          />
          <View style={styles.folha} accessibilityViewIsModal>
            <ScrollView
              contentContainerStyle={styles.conteudo}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.alca} />
              <View style={styles.topo}>
                <View style={styles.grow}>
                  <Text accessibilityRole="header" style={styles.titulo}>
                    Acessibilidade
                  </Text>
                  <Text style={styles.texto}>
                    Ajuste o app para ficar mais fácil de ver e de usar.
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  onPress={onClose}
                  hitSlop={10}
                  style={styles.fechar}
                >
                  <Ionicons name="close" size={26} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Secao titulo="Tamanho do texto" icone="text">
                <View style={styles.tamanho}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Diminuir texto"
                    disabled={escalaMinima}
                    onPress={() =>
                      atualizar({
                        escalaFonte: passoEscala(preferencias.escalaFonte, -1),
                      })
                    }
                    style={[styles.passo, escalaMinima && styles.desativado]}
                  >
                    <Ionicons name="remove" size={26} color={colors.surface} />
                  </TouchableOpacity>
                  <Text
                    accessibilityLiveRegion="polite"
                    style={styles.valorTamanho}
                  >
                    {rotuloEscala(preferencias.escalaFonte)}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Aumentar texto"
                    disabled={escalaMaxima}
                    onPress={() =>
                      atualizar({
                        escalaFonte: passoEscala(preferencias.escalaFonte, 1),
                      })
                    }
                    style={[styles.passo, escalaMaxima && styles.desativado]}
                  >
                    <Ionicons name="add" size={26} color={colors.surface} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.exemplo}>
                  Exemplo: assim ficará o texto do aplicativo.
                </Text>
              </Secao>

              <Secao titulo="Contraste" icone="contrast">
                {contrastes.map((opcao) => (
                  <Opcao
                    key={opcao.valor}
                    titulo={opcao.titulo}
                    descricao={opcao.descricao}
                    selecionada={preferencias.contraste === opcao.valor}
                    onPress={() => atualizar({ contraste: opcao.valor })}
                  />
                ))}
              </Secao>

              <Secao titulo="Leitura" icone="volume-high">
                <Text style={styles.texto}>
                  Toque em um texto ou botão na tela para ouvir seu conteúdo.
                </Text>
                <Switch
                  accessibilityLabel="Leitura por toque"
                  value={!!preferencias.leituraPorToque}
                  onValueChange={(leituraPorToque) => {
                    parar();
                    atualizar({ leituraPorToque });
                  }}
                />
                {falando && (
                  <Button
                    title="Parar leitura"
                    variant="outline"
                    onPress={parar}
                  />
                )}
                <Text style={styles.rotulo}>Velocidade da voz</Text>
                <View style={styles.chips}>
                  {velocidades.map((opcao) => (
                    <Chip
                      key={opcao.valor}
                      titulo={opcao.titulo}
                      selecionado={preferencias.velocidadeVoz === opcao.valor}
                      onPress={() => atualizar({ velocidadeVoz: opcao.valor })}
                    />
                  ))}
                </View>
              </Secao>

              <Secao titulo="Leitura facilitada" icone="reader">
                <Interruptor
                  titulo="Texto em negrito"
                  descricao="Deixa as letras mais grossas."
                  valor={preferencias.negrito}
                  onChange={(negrito) => atualizar({ negrito })}
                />
                <Interruptor
                  titulo="Mais espaço entre as linhas"
                  descricao="Facilita acompanhar frases longas."
                  valor={preferencias.espacamentoLinhas}
                  onChange={(espacamentoLinhas) =>
                    atualizar({ espacamentoLinhas })
                  }
                />
                <Interruptor
                  titulo="Reduzir animações"
                  descricao="Telas e botões sem movimento."
                  valor={preferencias.reduzirAnimacoes}
                  onChange={(reduzirAnimacoes) =>
                    atualizar({ reduzirAnimacoes })
                  }
                />
              </Secao>

              <Secao titulo="Botão de acessibilidade" icone="move">
                <Interruptor
                  titulo="Ocultar botão flutuante"
                  descricao="Reative pelo menu Acessibilidade no perfil ou na tela de entrada."
                  valor={!!preferencias.botaoOculto}
                  onChange={(botaoOculto) => atualizar({ botaoOculto })}
                />
                <Text style={styles.texto}>Altura do botão</Text>
                <View style={styles.chips}>
                  {[
                    { titulo: 'Topo', y: 0 },
                    { titulo: 'Meio', y: 0.5 },
                    { titulo: 'Embaixo', y: 1 },
                  ].map(({ titulo, y }) => (
                    <Chip
                      key={y}
                      titulo={titulo}
                      selecionado={(preferencias.pontoBotao?.y ?? 1) === y}
                      onPress={() =>
                        atualizar({
                          pontoBotao: {
                            x:
                              preferencias.pontoBotao?.x ??
                              (preferencias.posicaoBotao === 'esquerda'
                                ? 0
                                : 1),
                            y,
                          },
                        })
                      }
                    />
                  ))}
                </View>
                <Text style={styles.texto}>Em qual lado da tela ele fica?</Text>
                <View style={styles.chips}>
                  {posicoes.map((opcao) => (
                    <Chip
                      key={opcao.valor}
                      titulo={opcao.titulo}
                      selecionado={preferencias.posicaoBotao === opcao.valor}
                      onPress={() =>
                        atualizar({
                          posicaoBotao: opcao.valor,
                          pontoBotao: {
                            x: opcao.valor === 'esquerda' ? 0 : 1,
                            y: preferencias.pontoBotao?.y ?? 1,
                          },
                        })
                      }
                    />
                  ))}
                </View>
              </Secao>

              <Button
                title="Restaurar padrão"
                variant="outline"
                onPress={() => {
                  parar();
                  restaurar();
                }}
              />
              <Button title="Fechar" onPress={onClose} />
            </ScrollView>
          </View>
        </View>
      </ForaDaLeitura>
    </Modal>
  );
}

function Secao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ComponentProps<typeof Ionicons>['name'];
  children: ReactNode;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <View style={styles.secao}>
      <View style={styles.secaoTitulo}>
        <Ionicons name={icone} size={20} color={colors.primaryDark} />
        <Text accessibilityRole="header" style={styles.secaoTexto}>
          {titulo}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Opção exclusiva (rádio) em formato de cartão. */
function Opcao({
  titulo,
  descricao,
  selecionada,
  onPress,
}: {
  titulo: string;
  descricao: string;
  selecionada: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionada, checked: selecionada }}
      accessibilityLabel={`${titulo}. ${descricao}`}
      onPress={onPress}
      style={[styles.opcao, selecionada && styles.opcaoAtiva]}
    >
      <Ionicons
        name={selecionada ? 'radio-button-on' : 'radio-button-off'}
        size={24}
        color={colors.primaryDark}
      />
      <View style={styles.grow}>
        <Text style={styles.opcaoTitulo}>{titulo}</Text>
        <Text style={styles.texto}>{descricao}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Chip({
  titulo,
  selecionado,
  onPress,
}: {
  titulo: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionado, checked: selecionado }}
      onPress={onPress}
      style={[styles.chip, selecionado && styles.chipAtivo]}
    >
      <Text style={[styles.chipTexto, selecionado && styles.chipTextoAtivo]}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

function Interruptor({
  titulo,
  descricao,
  valor,
  onChange,
}: {
  titulo: string;
  descricao: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <View style={styles.linha}>
      <View style={styles.grow}>
        <Text style={styles.opcaoTitulo}>{titulo}</Text>
        <Text style={styles.texto}>{descricao}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        accessibilityLabel={titulo}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    fundo: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    folha: {
      height: '92%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    conteudo: { padding: 20, paddingBottom: 32, gap: 18 },
    alca: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    topo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    grow: { flex: 1, gap: 2 },
    fechar: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: { fontSize: fs(22), fontWeight: '700', color: colors.text },
    texto: { fontSize: fs(14), lineHeight: lh(21), color: colors.muted },
    secao: { gap: 10 },
    secaoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    secaoTexto: { fontSize: fs(16), fontWeight: '700', color: colors.text },
    rotulo: { fontSize: fs(13), fontWeight: '600', color: colors.muted },
    tamanho: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    passo: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    valorTamanho: { fontSize: fs(20), fontWeight: '700', color: colors.text },
    exemplo: {
      fontSize: fs(14),
      lineHeight: lh(21),
      color: colors.text,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    opcaoAtiva: { borderColor: colors.primary, borderWidth: 2 },
    opcaoTitulo: { fontSize: fs(15), fontWeight: '600', color: colors.text },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: 24,
      backgroundColor: colors.chip,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTexto: {
      fontSize: fs(14),
      fontWeight: '600',
      color: colors.primaryDark,
    },
    chipTextoAtivo: { color: colors.surface },
    desativado: { opacity: 0.4 },
  });
