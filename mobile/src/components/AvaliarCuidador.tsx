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
  cuidadorNome: string;
  onClose: () => void;
  /** Chamado depois que a API aceitou a avaliação. */
  onEnviada: () => void;
};

/**
 * Folha para avaliar o cuidador de um atendimento concluído: nota em estrelas
 * (obrigatória) e comentário (opcional). Usada pelo responsável e pelo idoso
 * independente a partir do histórico de contratações.
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

function Folha({
  contratacaoId,
  cuidadorNome,
  onClose,
  onEnviada,
}: Props) {
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
      <Pressable style={styles.fundo} onPress={fechar}>
        <Pressable
          style={[styles.folha, { marginBottom: alturaTeclado }]}
          onPress={() => undefined}
        >
          <ScrollView
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.alca} />
            <Text accessibilityRole="header" style={styles.titulo}>
              Avaliar {cuidadorNome}
            </Text>
            <Text style={styles.texto}>
              Conte como foi o atendimento. Sua avaliação ajuda outras famílias
              a escolher um cuidador.
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
        </Pressable>
      </Pressable>
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
