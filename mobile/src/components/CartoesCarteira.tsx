import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../accessibility/Texto';
import { useMotion } from '../motion/MotionProvider';
import { MotionView } from '../motion/MotionView';
import { fs } from '../theme/tipografia';
import { useAppStyles } from '../theme/appStyles';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export const moeda = (valor: string | number) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SaldoCarteira({
  disponivel,
  pendente,
  abrir,
}: {
  disponivel: string;
  pendente: string;
  abrir?: () => void;
}) {
  const styles = useAppStyles();
  const colors = useTheme();
  const { reducedMotion } = useMotion();
  const valor = Number(disponivel);
  const [mostrado, setMostrado] = useState(valor);
  const [evolucao] = useState(() => new Animated.Value(valor));
  const anterior = useRef(valor);
  useEffect(() => {
    if (reducedMotion) {
      anterior.current = valor;
      evolucao.setValue(valor);
      return;
    }
    evolucao.setValue(anterior.current);
    const listener = evolucao.addListener(({ value }) => {
      anterior.current = value;
      setMostrado(value);
    });
    const animacao = Animated.timing(evolucao, {
      toValue: valor,
      duration: 420,
      useNativeDriver: false,
    });
    animacao.start();
    return () => {
      evolucao.removeListener(listener);
      animacao.stop();
    };
  }, [valor, reducedMotion, evolucao]);
  return (
    <MotionView
      preset="fade"
      style={[styles.card, { backgroundColor: colors.badge }]}
    >
      <View style={styles.row}>
        <Ionicons name="wallet-outline" size={22} color={colors.primaryDark} />
        <Text style={styles.section}>Carteira virtual</Text>
      </View>
      <Text style={styles.text}>Saldo disponível</Text>
      <Text
        style={[styles.name, { fontSize: fs(30) }]}
        accessibilityLabel={moeda(valor)}
      >
        {moeda(reducedMotion ? valor : mostrado)}
      </Text>
      <Text style={styles.text}>A liberar · {moeda(pendente)}</Text>
      {abrir && <Button title="Abrir carteira" onPress={abrir} />}
    </MotionView>
  );
}

export function GraficoBarras({
  titulo,
  pontos,
  unidade,
  formatar,
}: {
  titulo: string;
  pontos: { rotulo: string; valor: number | null }[];
  unidade: string;
  formatar: (valor: number) => string;
}) {
  const styles = useAppStyles();
  const colors = useTheme();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const { reducedMotion } = useMotion();
  const [altura] = useState(() => new Animated.Value(1));
  const assinatura = pontos.map((p) => p.rotulo + ':' + p.valor).join('|');
  useEffect(() => {
    if (reducedMotion) {
      altura.setValue(1);
      return;
    }
    altura.setValue(0.25);
    const movimento = Animated.timing(altura, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });
    movimento.start();
    return () => movimento.stop();
  }, [altura, assinatura, reducedMotion]);
  const maximo = Math.max(1, ...pontos.map((p) => p.valor ?? 0));
  const atual = selecionado === null ? undefined : pontos[selecionado];
  const ultimaAtiva = pontos.findLast((p) => p.valor !== null && p.valor > 0);
  const destaque = atual ?? ultimaAtiva;
  return (
    <View style={styles.card}>
      <Text style={styles.section}>{titulo}</Text>
      <Text style={styles.text}>
        {destaque?.valor !== undefined && destaque.valor !== null
          ? destaque.rotulo + ' · ' + formatar(destaque.valor)
          : 'Sem ' + unidade + ' no período.'}
      </Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={
          titulo +
          '. ' +
          (destaque?.valor != null
            ? destaque.rotulo + ', ' + formatar(destaque.valor)
            : 'Sem dados')
        }
        accessibilityHint="Use as ações de aumentar e diminuir para percorrer os pontos"
        accessibilityActions={[
          { name: 'increment', label: 'Próximo ponto' },
          { name: 'decrement', label: 'Ponto anterior' },
        ]}
        onAccessibilityAction={(e) =>
          setSelecionado((i) =>
            Math.max(
              0,
              Math.min(
                pontos.length - 1,
                (i ??
                  (e.nativeEvent.actionName === 'increment'
                    ? -1
                    : pontos.length)) +
                  (e.nativeEvent.actionName === 'increment' ? 1 : -1),
              ),
            ),
          )
        }
      >
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            height: 100,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: pontos.length <= 8 ? 8 : 2,
            transform: [{ scaleY: altura }],
          }}
        >
          {pontos.map((p) => (
            <View
              key={p.rotulo}
              style={{
                flex: 1,
                height: Math.max(2, ((p.valor ?? 0) / maximo) * 100),
                borderRadius: 4,
                backgroundColor:
                  (p.valor ?? 0) > 0 ? colors.primaryDark : colors.border,
              }}
            />
          ))}
        </Animated.View>
      </View>
      {!!pontos.length && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.helper}>{pontos[0].rotulo}</Text>
          <Text style={styles.helper}>{pontos.at(-1)?.rotulo}</Text>
        </View>
      )}
    </View>
  );
}

export function ConfirmacaoFinanceira({ titulo }: { titulo: string }) {
  const styles = useAppStyles();
  const colors = useTheme();
  const { reducedMotion } = useMotion();
  const [escala] = useState(() => new Animated.Value(reducedMotion ? 1 : 0.6));
  useEffect(() => {
    if (reducedMotion) {
      escala.setValue(1);
      return;
    }
    const animacao = Animated.spring(escala, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    });
    animacao.start();
    return () => animacao.stop();
  }, [escala, reducedMotion]);
  return (
    <View
      style={[styles.card, styles.row]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Ionicons
          name="checkmark-circle"
          size={36}
          color={colors.primaryDark}
        />
      </Animated.View>
      <Text style={styles.name}>{titulo}</Text>
    </View>
  );
}
