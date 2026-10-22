import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { listarServicos } from '../services/servicos';
import type { Servico } from '../types/servico';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

type Props = {
  label: string;
  value: number[];
  onChange: (value: number[]) => void;
  error?: string;
};
export function ServiceSelector({ label, value, onChange, error }: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    listarServicos(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setServicos(data.filter((item) => item.ativo));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFalha(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [tentativa]);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {carregando ? (
        <ActivityIndicator color={colors.primary} />
      ) : falha ? (
        <>
          <Text>Não foi possível consultar os serviços.</Text>
          <Button
            title="Tentar novamente"
            onPress={() => {
              setCarregando(true);
              setFalha(false);
              setTentativa((value) => value + 1);
            }}
          />
        </>
      ) : (
        <>
          {!servicos.length && (
            <Text>
              Nenhum serviço cadastrado. Aguarde o catálogo estar disponível.
            </Text>
          )}
          <View style={styles.row}>
            {servicos.map((service) => {
              const selected = value.includes(service.id);
              return (
                <TouchableOpacity
                  key={service.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    onChange(
                      selected
                        ? value.filter((item) => item !== service.id)
                        : [...value, service.id],
                    )
                  }
                  style={[styles.chip, selected && styles.selected]}
                >
                  <Text style={[styles.text, selected && styles.selectedText]}>
                    {service.nome}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    group: { gap: 8 },
    label: { color: colors.primaryDark, fontWeight: '700' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    selected: { backgroundColor: colors.primaryDark },
    text: { color: colors.primaryDark, fontSize: 12 },
    selectedText: { color: colors.surface },
    error: { color: colors.error, fontSize: 12 },
  });
