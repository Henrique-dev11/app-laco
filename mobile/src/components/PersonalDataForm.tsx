import { View, StyleSheet } from 'react-native';
import type { DadosPessoais, ErrosFormulario } from '../types/cadastro';
import { FormField } from './FormField';

type Props = {
  value: DadosPessoais;
  errors: ErrosFormulario<DadosPessoais>;
  onChange: (value: DadosPessoais) => void;
};

export function PersonalDataForm({ value, errors, onChange }: Props) {
  function change(field: keyof DadosPessoais, text: string) {
    onChange({ ...value, [field]: text });
  }
  return (
    <View style={styles.form}>
      <FormField
        label="Nome completo*"
        placeholder="Digite seu nome completo"
        autoCapitalize="words"
        value={value.nomeCompleto}
        error={errors.nomeCompleto}
        onChangeText={(text) => change('nomeCompleto', text)}
      />
      <FormField
        label="Nome social"
        placeholder="Se aplicável"
        autoCapitalize="words"
        value={value.nomeSocial}
        onChangeText={(text) => change('nomeSocial', text)}
      />
      <FormField
        label="E-mail*"
        placeholder="seuemail@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={value.email}
        error={errors.email}
        onChangeText={(text) => change('email', text)}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <FormField
            label="Telefone*"
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            maxLength={19}
            value={value.telefone}
            error={errors.telefone}
            onChangeText={(text) => change('telefone', text)}
          />
        </View>
        <View style={styles.half}>
          <FormField
            label="Telefone 2"
            placeholder="Opcional"
            keyboardType="phone-pad"
            maxLength={19}
            value={value.telefone2}
            error={errors.telefone2}
            onChangeText={(text) => change('telefone2', text)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexGrow: 1, flexBasis: 180 },
});
