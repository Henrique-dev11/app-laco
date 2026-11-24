import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CamadaLeitura, Text } from '../accessibility/Texto';
import { BotaoAcessibilidade } from '../accessibility/BotaoAcessibilidade';
import { useAlturaTeclado } from '../hooks/useAlturaTeclado';
import { useMotion } from '../motion/MotionProvider';
import { mensagemErro } from '../services/api';
import { enviarAvaliacao } from '../services/avaliacoes';
import type { Paleta } from '../theme';
import { useStyles } from '../theme/ThemeContext';
import { fs, lh } from '../theme/tipografia';
import { ESPACO_BOTAO } from '../utils/acessibilidade';
import { COMENTARIO_MAXIMO, validarAvaliacao } from '../utils/avaliacoes';
import { Button } from './Button';
import { FormField } from './FormField';
import { Notice } from './Notice';
import { SeletorEstrelas } from './SeletorEstrelas';

type Props = {
  /** Contratação concluída que está sendo avaliada; nulo = modal fechado. */
  contratacaoId: number | null;
  avaliadoNome: string;
  onClose: () => void;
  /** Chamado depois que a API aceitou a avaliação. */
  onEnviada: () => void;
};

/**
 * Folha para avaliar a outra parte após a conclusão do atendimento.
 * A nota em estrelas é obrigatória e o comentário é opcional.
 */
export function AvaliarCuidador(props: Props) {
  const { contratacaoId, onClose } = props;
  const { reducedMotion } = useMotion();
  return (
    <Modal
      visible={contratacaoId !== null}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      {/* A `key` faz cada abertura começar com nota e comentário em branco. */}
      {contratacaoId !== null && <Folha key={contratacaoId} {...props} />}
    </Modal>
  );
}

function Folha({ contratacaoId, avaliadoNome, onClose, onEnviada }: Props) {
  const styles = useStyles(criarStyles);
  const alturaTeclado = useAlturaTeclado();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (contratacaoId === null || enviando) return;
    // Valida antes de chamar a API (a API também valida).
    const invalido = validarAvaliacao(nota, comentario);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await enviarAvaliacao(contratacaoId, nota, comentario);
      onEnviada();
    } catch (error) {
      setErro(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }

  function fechar() {
    if (!enviando) onClose();
  }

  return (
    <CamadaLeitura>
      <View style={styles.fundo}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={fechar}
          accessible={false}
        />
        <View
          style={[styles.folha, { marginBottom: alturaTeclado }]}
          accessibilityViewIsModal
        >
          <ScrollView
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View style={styles.alca} />
            <Text accessibilityRole="header" style={styles.titulo}>
              Avaliar {avaliadoNome}
            </Text>
            <Text style={styles.texto}>
              Como foi sua experiência neste atendimento?
            </Text>
            <SeletorEstrelas
              nota={nota}
              onChange={(valor) => {
                setNota(valor);
                setErro('');
              }}
              disabled={enviando}
            />
            <FormField
              label="Comentário (opcional)"
              value={comentario}
              onChangeText={setComentario}
              maxLength={COMENTARIO_MAXIMO}
              multiline
              editable={!enviando}
            />
            <Text style={styles.contador}>
              {comentario.length}/{COMENTARIO_MAXIMO}
            </Text>
            {!!erro && <Notice>{erro}</Notice>}
            <Button
              title={enviando ? 'Enviando...' : 'Enviar avaliação'}
              loading={enviando}
              disabled={enviando}
              onPress={() => {
                void enviar();
              }}
            />
            <Button
              title="Cancelar"
              variant="outline"
              disabled={enviando}
              onPress={fechar}
            />
          </ScrollView>
        </View>
      </View>
      {/* O botão global fica sob o modal; este mantém a acessibilidade à mão. */}
      <BotaoAcessibilidade elevado={false} />
    </CamadaLeitura>
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
      maxHeight: '90%',
      flexShrink: 1,
      overflow: 'hidden',
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // O espaço extra no fim deixa o conteúdo rolar para fora de trás do botão de acessibilidade.
    conteudo: { padding: 20, paddingBottom: 32 + ESPACO_BOTAO, gap: 16 },
    alca: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    titulo: { fontSize: fs(20), fontWeight: '700', color: colors.text },
    texto: { fontSize: fs(14), lineHeight: lh(21), color: colors.muted },
    contador: {
      alignSelf: 'flex-end',
      marginTop: -8,
      fontSize: fs(12),
      color: colors.muted,
    },
  });
