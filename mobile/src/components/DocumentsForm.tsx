import { StyleSheet, View } from 'react-native';
import type { Documentos, ErrosFormulario } from '../types/cadastro';
import { formatarData } from '../utils/validation';
import { FormField } from './FormField';

type Props = {
  value: Documentos;
  errors: ErrosFormulario<Documentos>;
  onChange: (value: Documentos) => void;
  showAddressNumber?: boolean;
  showPassword?: boolean;
};

export function DocumentsForm({
  value,
  errors,
  onChange,
  showAddressNumber = true,
  showPassword = true,
}: Props) {
  function change(field: keyof Documentos, text: string) {
    onChange({ ...value, [field]: text });
  }
  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <View style={styles.half}>
          <FormField
            label="CPF*"
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
            value={value.cpf}
            error={errors.cpf}
            onChangeText={(text) => change('cpf', text)}
          />
        </View>
        <View style={styles.half}>
          <FormField
            label="CEP*"
            placeholder="00000-000"
            keyboardType="numeric"
            maxLength={9}
            value={value.cep}
            error={errors.cep}
            onChangeText={(text) => change('cep', text)}
          />
        </View>
      </View>
      {showAddressNumber && (
        <View style={styles.row}>
          <View style={styles.half}>
            <FormField
              label="Número da casa*"
              placeholder="Número"
              value={value.numeroCasa}
              error={errors.numeroCasa}
              onChangeText={(text) => change('numeroCasa', text)}
            />
          </View>
          <View style={styles.half}>
            <FormField
              label="Complemento"
              placeholder="Opcional"
              value={value.complemento}
              onChangeText={(text) => change('complemento', text)}
            />
          </View>
        </View>
      )}
      <FormField
        label="Data de nascimento*"
        placeholder="DD/MM/AAAA"
        keyboardType="numeric"
        maxLength={10}
        value={value.dataNascimento}
        error={errors.dataNascimento}
        onChangeText={(text) => change('dataNascimento', formatarData(text))}
      />
      {showPassword && (
        <FormField
          label="Senha*"
          placeholder="Pelo menos 8 caracteres"
          password
          value={value.senha}
          error={errors.senha}
          onChangeText={(text) => change('senha', text)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexGrow: 1, flexBasis: 180 },
});
