import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../Button';
import { DocumentsForm } from '../DocumentsForm';
import { FormField } from '../FormField';
import { ServiceSelector } from '../ServiceSelector';
import { perfis } from '../../constants/cadastro';
import { useCadastro } from '../../contexts/CadastroContext';
import { RegistrationLayout } from '../../layouts/RegistrationLayout';
import { selecionarCurriculo } from '../../services/documentos';
import { colors } from '../../theme';
import type { Documentos, ErrosFormulario, Perfil } from '../../types/cadastro';
import type { RootStackParamList } from '../../types/navigation';
import { validarDocumentos } from '../../utils/validation';

export function DocumentStep({ perfil }: { perfil: Perfil }) {
  const { cadastro, atualizarCadastro } = useCadastro();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [errors, setErrors] = useState<
    ErrosFormulario<Documentos> & {
      curriculo?: string;
      termos?: string;
      servicos?: string;
    }
  >({});
  const [selecionando, setSelecionando] = useState(false);
  const cuidador = perfil === 'cuidador';

  async function anexar() {
    setSelecionando(true);
    try {
      const curriculo = await selecionarCurriculo();
      if (curriculo) {
        atualizarCadastro({ curriculo });
        setErrors((atual) => ({ ...atual, curriculo: undefined }));
      }
    } catch {
      setErrors((atual) => ({
        ...atual,
        curriculo: 'Não foi possível selecionar o arquivo. Tente novamente.',
      }));
    } finally {
      setSelecionando(false);
    }
  }

  function continuar() {
    const nextErrors: typeof errors = validarDocumentos(
      cadastro.documentos,
      true,
    );
    if (!cuidador && !cadastro.servicos.length)
      nextErrors.servicos = 'Selecione pelo menos um serviço';
    if (cuidador && !cadastro.curriculo)
      nextErrors.curriculo = 'Anexe seu currículo em PDF';
    if (!cadastro.aceitoTermos)
      nextErrors.termos = 'Você deve aceitar os termos';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    navigation.navigate(
      cuidador
        ? 'CuidadorServicos'
        : perfil === 'responsavel'
          ? 'ResponsavelStep3'
          : 'CadastroPreview',
    );
  }

  return (
    <RegistrationLayout
      perfil={perfil}
      step={2}
      title={cuidador ? 'Documentos e acesso' : 'Documentos e serviços'}
      subtitle={
        cuidador
          ? 'Informe seus documentos e anexe seu currículo'
          : 'Quase lá — conte quais cuidados você precisa'
      }
      showLogo={false}
    >
      <DocumentsForm
        value={cadastro.documentos}
        errors={errors}
        showAddressNumber
        showPassword={false}
        onChange={(documentos) => atualizarCadastro({ documentos })}
      />
      {cuidador && (
        <View style={styles.group}>
          <Text style={styles.label}>Currículo*</Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={selecionando}
            accessibilityState={{ disabled: selecionando }}
            style={styles.upload}
            onPress={anexar}
          >
            <Text style={styles.uploadText}>
              {selecionando
                ? 'Selecionando...'
                : cadastro.curriculo
                  ? `PDF: ${cadastro.curriculo.name}`
                  : '↑ Anexar arquivo (PDF)'}
            </Text>
          </TouchableOpacity>
          {cadastro.curriculo && (
            <Text style={styles.helper}>
              Arquivo selecionado neste dispositivo. Ainda não enviado.
            </Text>
          )}
          {errors.curriculo && (
            <Text style={styles.error}>{errors.curriculo}</Text>
          )}
        </View>
      )}
      {!cuidador && (
        <ServiceSelector
          label="Quais serviços você deseja?*"
          value={cadastro.servicos}
          error={errors.servicos}
          onChange={(servicos) => atualizarCadastro({ servicos })}
        />
      )}
      <FormField
        label="Senha*"
        password
        placeholder="Pelo menos 8 caracteres"
        value={cadastro.documentos.senha}
        error={errors.senha}
        onChangeText={(senha) =>
          atualizarCadastro({ documentos: { ...cadastro.documentos, senha } })
        }
      />
      {
        <View style={styles.group}>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cadastro.aceitoTermos }}
            style={styles.terms}
            onPress={() =>
              atualizarCadastro({ aceitoTermos: !cadastro.aceitoTermos })
            }
          >
            <View
              style={[styles.checkbox, cadastro.aceitoTermos && styles.checked]}
            >
              {cadastro.aceitoTermos && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              Li e aceito os Termos de Uso e a Política de Privacidade (LGPD),
              incluindo o tratamento de dados relacionados ao cuidado de idosos.
            </Text>
          </TouchableOpacity>
          {errors.termos && <Text style={styles.error}>{errors.termos}</Text>}
        </View>
      }
      <Button
        title="Continuar"
        color={perfis[perfil].color}
        onPress={continuar}
        disabled={selecionando}
      />
    </RegistrationLayout>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' },
  upload: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 12,
    minHeight: 70,
    padding: 16,
    justifyContent: 'center',
  },
  uploadText: { color: colors.primaryDark, textAlign: 'center', fontSize: 14 },
  helper: { color: colors.muted, fontSize: 12 },
  error: { color: colors.error, fontSize: 12 },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primaryDark },
  check: { color: colors.surface, fontWeight: '700' },
  termsText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
});
