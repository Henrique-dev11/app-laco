import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../Button';
import { PersonalDataForm } from '../PersonalDataForm';
import { perfis } from '../../constants/cadastro';
import { useCadastro } from '../../contexts/CadastroContext';
import { RegistrationLayout } from '../../layouts/RegistrationLayout';
import type {
  DadosPessoais,
  ErrosFormulario,
  Perfil,
} from '../../types/cadastro';
import type { RootStackParamList } from '../../types/navigation';
import { validarPessoal } from '../../utils/validation';

export function PersonalStep({ perfil }: { perfil: Perfil }) {
  const { cadastro, atualizarCadastro } = useCadastro();
  const [errors, setErrors] = useState<ErrosFormulario<DadosPessoais>>({});
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  function continuar() {
    const nextErrors = validarPessoal(cadastro.pessoal);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const route = {
      responsavel: 'ResponsavelStep2',
      cuidador: 'CuidadorStep2',
      idoso: 'IdosoStep2',
    } as const;
    navigation.navigate(route[perfil]);
  }
  return (
    <RegistrationLayout
      perfil={perfil}
      step={1}
      title={`Cadastro ${perfil === 'responsavel' ? 'do responsável' : perfil === 'cuidador' ? 'do cuidador' : 'do idoso'}`}
      subtitle="Vamos te conhecer melhor"
    >
      <PersonalDataForm
        value={cadastro.pessoal}
        errors={errors}
        onChange={(pessoal) => atualizarCadastro({ pessoal })}
      />
      <Button
        title="Continuar"
        color={perfis[perfil].color}
        onPress={continuar}
      />
    </RegistrationLayout>
  );
}
