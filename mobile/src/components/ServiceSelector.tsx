import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { servicosCadastro } from '../constants/cadastro';
import { colors } from '../theme';

type Props = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
};

export function ServiceSelector({ label, value, onChange, error }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {servicosCadastro.map((service) => {
          const selected = value.includes(service);
          return (
            <TouchableOpacity
              key={service}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange(
                  selected
                    ? value.filter((item) => item !== service)
                    : [...value, service],
                )
              }
              style={[styles.chip, selected && styles.selected]}
            >
              <Text style={[styles.text, selected && styles.selectedText]}>
                {service}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
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
  text: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  selectedText: { color: colors.surface },
  error: { color: colors.error, fontSize: 12 },
});
