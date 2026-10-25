import { View } from 'react-native';
import { FormField } from './FormField';
import type { Endereco } from '../types/auth';
import { formatarCep } from '../utils/validation';
export const enderecoVazio: Endereco = {
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
};
export function erroEndereco(value: Endereco) {
  if (
    ![value.rua, value.numero, value.bairro, value.cidade].every((v) =>
      v.trim(),
    )
  )
    return 'Preencha rua, número, bairro e cidade.';
  if (
    !/^[A-Za-z]{2}$/.test(value.estado.trim()) ||
    value.cep.replace(/\D/g, '').length !== 8
  )
    return 'Informe UF e CEP válidos.';
  return '';
}
export function dadosEndereco(value: Endereco) {
  return {
    rua: value.rua.trim(),
    numero: value.numero.trim(),
    complemento: value.complemento?.trim() ?? '',
    bairro: value.bairro.trim(),
    cidade: value.cidade.trim(),
    estado: value.estado.trim().toUpperCase(),
    cep: value.cep.replace(/\D/g, ''),
  };
}
export function EnderecoForm({
  value,
  onChange,
  disabled = false,
}: {
  value: Endereco;
  onChange: (value: Endereco) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      {(
        [
          ['cep', 'CEP*', 9],
          ['rua', 'Rua*', 150],
          ['numero', 'Número*', 20],
          ['complemento', 'Complemento', 150],
          ['bairro', 'Bairro*', 100],
          ['cidade', 'Cidade*', 100],
          ['estado', 'Estado (UF)*', 2],
        ] as const
      ).map(([campo, label, maxLength]) => (
        <FormField
          key={campo}
          label={label}
          value={
            campo === 'cep' ? formatarCep(value.cep) : (value[campo] ?? '')
          }
          maxLength={maxLength}
          editable={!disabled}
          autoCapitalize={campo === 'estado' ? 'characters' : 'sentences'}
          keyboardType={campo === 'cep' ? 'numeric' : 'default'}
          onChangeText={(texto) =>
            onChange({
              ...value,
              [campo]:
                campo === 'cep'
                  ? formatarCep(texto)
                  : campo === 'estado'
                    ? texto.toUpperCase()
                    : texto,
            })
          }
        />
      ))}
    </View>
  );
}
