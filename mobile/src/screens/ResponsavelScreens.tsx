import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { PersonalStep } from '../components/registration/PersonalStep';
import { DocumentStep } from '../components/registration/DocumentStep';
import { useCadastro } from '../contexts/CadastroContext';
import { RegistrationLayout } from '../layouts/RegistrationLayout';
import { perfis } from '../constants/cadastro';
import type { DadosIdoso, ErrosFormulario } from '../types/cadastro';
import type { ScreenProps } from '../types/navigation';
import { formatarData, validarIdoso } from '../utils/validation';

export function ResponsavelStep1Screen() {
  return <PersonalStep perfil="responsavel" />;
}
export function ResponsavelStep2Screen() {
  return <DocumentStep perfil="responsavel" />;
}

export function ResponsavelStep3Screen({
  navigation,
}: ScreenProps<'ResponsavelStep3'>) {
  const { cadastro, atualizarCadastro } = useCadastro();
  const [errors, setErrors] = useState<ErrosFormulario<DadosIdoso>>({});
  function change(field: keyof DadosIdoso, value: string) {
    atualizarCadastro({ idoso: { ...cadastro.idoso, [field]: value } });
  }
  function finalizar() {
    const nextErrors = validarIdoso(cadastro.idoso);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) navigation.navigate('CadastroPreview');
  }
  return (
    <RegistrationLayout
      perfil="responsavel"
      step={3}
      title="Cadastro do idoso"
      subtitle="Vamos conhecer o idoso"
    >
      <FormField
        label="Nome completo*"
        placeholder="Digite o nome completo do idoso"
        autoCapitalize="words"
        value={cadastro.idoso.nomeCompleto}
        error={errors.nomeCompleto}
        onChangeText={(value) => change('nomeCompleto', value)}
      />
      <FormField
        label="Nome social"
        placeholder="Se aplicável"
        value={cadastro.idoso.nomeSocial}
        onChangeText={(value) => change('nomeSocial', value)}
      />
      <FormField
        label="CPF*"
        placeholder="000.000.000-00"
        keyboardType="numeric"
        maxLength={14}
        value={cadastro.idoso.cpf}
        error={errors.cpf}
        onChangeText={(value) => change('cpf', value)}
      />
      <FormField
        label="Data de nascimento*"
        placeholder="DD/MM/AAAA"
        keyboardType="numeric"
        maxLength={10}
        value={cadastro.idoso.dataNascimento}
        error={errors.dataNascimento}
        onChangeText={(value) => change('dataNascimento', formatarData(value))}
      />
      <Text>Seu parentesco com o idoso*</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['FILHO', 'FILHA', 'CONJUGE', 'NETO', 'NETA', 'OUTRO'] as const).map(
          (parentesco) => (
            <Button
              key={parentesco}
              title={parentesco}
              variant={
                cadastro.idoso.parentesco === parentesco ? 'filled' : 'outline'
              }
              onPress={() =>
                atualizarCadastro({ idoso: { ...cadastro.idoso, parentesco } })
              }
            />
          ),
        )}
      </View>
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: cadastro.idoso.mesmoEndereco }}
        onPress={() =>
          atualizarCadastro({
            idoso: {
              ...cadastro.idoso,
              mesmoEndereco: !cadastro.idoso.mesmoEndereco,
            },
          })
        }
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text>
          {cadastro.idoso.mesmoEndereco ? '☑' : '☐'} Idoso mora no mesmo
          endereço que eu
        </Text>
      </TouchableOpacity>
      {!cadastro.idoso.mesmoEndereco &&
        (
          [
            'rua',
            'numero',
            'complemento',
            'bairro',
            'cidade',
            'estado',
            'cep',
          ] as const
        ).map((field) => (
          <FormField
            key={field}
            label={`Endereço do idoso · ${field}`}
            value={cadastro.idoso.endereco[field] ?? ''}
            onChangeText={(value) =>
              atualizarCadastro({
                idoso: {
                  ...cadastro.idoso,
                  endereco: { ...cadastro.idoso.endereco, [field]: value },
                },
              })
            }
          />
        ))}
      {!!errors.endereco && <Text>{errors.endereco}</Text>}
      <Button
        title="Finalizar"
        color={perfis.responsavel.color}
        onPress={finalizar}
      />
    </RegistrationLayout>
  );
}
