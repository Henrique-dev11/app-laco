import { View } from 'react-native';
import { FormField } from './FormField';

export type CuidadosIdoso = {
  sexo: string;
  necessidadesEspeciais: string;
  observacoes: string;
};

export function CuidadosIdosoForm({
  value,
  onChange,
  disabled,
}: {
  value: CuidadosIdoso;
  onChange: (value: CuidadosIdoso) => void;
  disabled: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      {(
        [
          ['sexo', 'Sexo (opcional)'],
          ['necessidadesEspeciais', 'Necessidades especiais'],
          ['observacoes', 'Observações'],
        ] as const
      ).map(([campo, label]) => (
        <FormField
          key={campo}
          label={label}
          value={value[campo]}
          editable={!disabled}
          multiline={campo !== 'sexo'}
          maxLength={campo === 'sexo' ? 30 : 5000}
          onChangeText={(texto) => onChange({ ...value, [campo]: texto })}
        />
      ))}
    </View>
  );
}
