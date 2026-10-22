import { Text, View } from 'react-native';
import { Button } from './Button';
import { FormField } from './FormField';
import { useAppStyles } from '../theme/appStyles';
import type { OfertaRascunho } from '../types/cadastro';

export function ServiceConfigFields({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: OfertaRascunho;
  onChange: (value: OfertaRascunho) => void;
  disabled?: boolean;
  error?: string;
}) {
  const styles = useAppStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{value.nome}</Text>
      {!!value.descricao && <Text style={styles.text}>{value.descricao}</Text>}
      {(value.precoSugerido != null ||
        value.duracaoSugeridaMinutos != null) && (
        <Text style={styles.text}>
          Sugestão do catálogo:{' '}
          {value.precoSugerido != null
            ? `R$ ${Number(value.precoSugerido).toFixed(2).replace('.', ',')}`
            : 'preço livre'}
          {value.duracaoSugeridaMinutos != null
            ? ` · ${value.duracaoSugeridaMinutos} minutos`
            : ''}
          . Você pode alterar.
        </Text>
      )}
      <FormField
        label="Preço-base (R$)*"
        value={value.preco}
        editable={!disabled}
        keyboardType="decimal-pad"
        onChangeText={(preco) => onChange({ ...value, preco })}
      />
      <Text style={styles.text}>Unidade da duração</Text>
      <View style={styles.row}>
        {(['minutos', 'horas'] as const).map((unidade) => (
          <Button
            key={unidade}
            title={unidade === 'horas' ? 'Horas' : 'Minutos'}
            disabled={disabled}
            variant={value.unidade === unidade ? 'filled' : 'outline'}
            onPress={() => {
              const atual = Number(value.duracao.replace(',', '.'));
              onChange({
                ...value,
                unidade,
                duracao:
                  value.duracao && Number.isFinite(atual)
                    ? String(
                        unidade === value.unidade
                          ? atual
                          : unidade === 'horas'
                            ? atual / 60
                            : atual * 60,
                      )
                    : '',
              });
            }}
          />
        ))}
      </View>
      <FormField
        label={`Duração estimada em ${value.unidade}*`}
        value={value.duracao}
        editable={!disabled}
        keyboardType="decimal-pad"
        onChangeText={(duracao) => onChange({ ...value, duracao })}
      />
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {error}
        </Text>
      )}
    </View>
  );
}
