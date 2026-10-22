import { useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import {
  EnderecoForm,
  dadosEndereco,
  erroEndereco,
} from '../components/EnderecoForm';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import {
  dataValida,
  emailValido,
  formatarData,
  somenteNumeros,
} from '../utils/validation';
import { alteracoes, dataParaApi, dataParaFormulario } from '../utils/perfis';
import { useAppStyles } from '../theme/appStyles';
import type { Endereco, UsuarioAtual } from '../types/auth';

function FormularioPerfil({
  usuario,
  cuidador,
}: {
  usuario: UsuarioAtual;
  cuidador: boolean;
}) {
  const perfil = (cuidador ? usuario.cuidador : usuario.responsavel)!;
  const navigation = useNavigation();
  const { atualizar } = useAuth();
  const styles = useAppStyles();
  const [original] = useState(() => ({
    nome: usuario.nome,
    nomeSocial: usuario.nomeSocial ?? '',
    email: usuario.email,
    telefone2: usuario.telefone2 ?? '',
    telefone: perfil.telefone,
    cpf: perfil.cpf,
    dataNascimento: dataParaFormulario(perfil.dataNascimento),
    biografia: usuario.cuidador?.biografia ?? '',
    experienciaProfissional: usuario.cuidador?.experienciaProfissional ?? '',
    registroProfissional: usuario.cuidador?.registroProfissional ?? '',
  }));
  const [dados, setDados] = useState(original);
  const [enderecoOriginal] = useState(dadosEndereco(perfil.endereco));
  const [endereco, setEndereco] = useState<Endereco>(enderecoOriginal);
  const [enviando, setEnviando] = useState(false),
    [mensagem, setMensagem] = useState('');
  async function salvar() {
    if (enviando) return;
    const tel = somenteNumeros(dados.telefone),
      tel2 = somenteNumeros(dados.telefone2);
    const erro =
      !dados.nome.trim() || !emailValido(dados.email)
        ? 'Informe nome e e-mail válidos.'
        : tel.length < 10 ||
            tel.length > 13 ||
            (dados.telefone2.trim() && (tel2.length < 10 || tel2.length > 13))
          ? 'Informe telefones válidos com DDD.'
          : somenteNumeros(dados.cpf).length !== 11 ||
              !dataValida(dados.dataNascimento)
            ? 'Informe CPF e nascimento válidos.'
            : erroEndereco(endereco);
    if (erro) {
      setMensagem(erro);
      return;
    }
    setEnviando(true);
    setMensagem('');
    try {
      const mudancas = alteracoes(original, dados);
      const usuarioDados = {
        ...(mudancas.nome !== undefined && { nome: dados.nome.trim() }),
        ...(mudancas.nomeSocial !== undefined && {
          nomeSocial: dados.nomeSocial.trim(),
        }),
        ...(mudancas.email !== undefined && {
          email: dados.email.trim().toLowerCase(),
        }),
        ...(mudancas.telefone2 !== undefined && { telefone2: tel2 || null }),
      };
      const body = {
        ...(Object.keys(usuarioDados).length && { usuario: usuarioDados }),
        ...(mudancas.telefone !== undefined && { telefone: tel }),
        ...(mudancas.cpf !== undefined && { cpf: somenteNumeros(dados.cpf) }),
        ...(mudancas.dataNascimento !== undefined && {
          dataNascimento: dataParaApi(dados.dataNascimento),
        }),
        ...(cuidador && {
          ...('biografia' in mudancas && { biografia: dados.biografia.trim() }),
          ...('experienciaProfissional' in mudancas && {
            experienciaProfissional: dados.experienciaProfissional.trim(),
          }),
          ...('registroProfissional' in mudancas && {
            registroProfissional: dados.registroProfissional.trim(),
          }),
        }),
        ...(Object.keys(alteracoes(enderecoOriginal, dadosEndereco(endereco)))
          .length && {
          endereco: alteracoes(enderecoOriginal, dadosEndereco(endereco)),
        }),
      };
      await api.patch(
        `/${cuidador ? 'cuidadores' : 'responsaveis'}/${perfil.id}`,
        body,
      );
      await atualizar();
      setMensagem('Perfil atualizado com sucesso.');
    } catch (e) {
      setMensagem(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <>
      {(
        [
          'nome',
          'nomeSocial',
          'email',
          'telefone',
          'telefone2',
          'cpf',
          'dataNascimento',
        ] as const
      ).map((campo) => (
        <FormField
          key={campo}
          label={
            {
              nome: 'Nome completo*',
              nomeSocial: 'Nome social',
              email: 'E-mail*',
              telefone: 'Telefone*',
              telefone2: 'Telefone secundário',
              cpf: 'CPF*',
              dataNascimento: 'Nascimento (DD/MM/AAAA)*',
            }[campo]
          }
          value={dados[campo]}
          editable={!enviando}
          maxLength={
            campo === 'dataNascimento'
              ? 10
              : campo === 'email'
                ? 255
                : campo === 'nome' || campo === 'nomeSocial'
                  ? 150
                  : 20
          }
          keyboardType={
            campo === 'email'
              ? 'email-address'
              : ['telefone', 'telefone2', 'cpf', 'dataNascimento'].includes(
                    campo,
                  )
                ? 'numeric'
                : 'default'
          }
          autoCapitalize={campo === 'email' ? 'none' : 'sentences'}
          onChangeText={(value) =>
            setDados((d) => ({
              ...d,
              [campo]: campo === 'dataNascimento' ? formatarData(value) : value,
            }))
          }
        />
      ))}
      <Text style={styles.section}>Endereço</Text>
      <EnderecoForm
        value={endereco}
        onChange={setEndereco}
        disabled={enviando}
      />
      {cuidador && (
        <>
          <Text style={styles.section}>Dados profissionais</Text>
          {(
            [
              'biografia',
              'experienciaProfissional',
              'registroProfissional',
            ] as const
          ).map((campo) => (
            <FormField
              key={campo}
              label={
                {
                  biografia: 'Biografia',
                  experienciaProfissional: 'Experiência profissional',
                  registroProfissional: 'Registro profissional',
                }[campo]
              }
              value={dados[campo]}
              editable={!enviando}
              multiline={campo !== 'registroProfissional'}
              maxLength={campo === 'registroProfissional' ? 100 : 5000}
              onChangeText={(value) =>
                setDados((d) => ({ ...d, [campo]: value }))
              }
            />
          ))}
        </>
      )}
      {!!mensagem && <Notice>{mensagem}</Notice>}
      <Button
        title={enviando ? 'Salvando...' : 'Salvar perfil'}
        disabled={enviando}
        onPress={() => {
          void salvar();
        }}
      />
      <Button
        title="Voltar ao perfil"
        variant="outline"
        disabled={enviando}
        onPress={() => navigation.goBack()}
      />
    </>
  );
}
function EditarPerfil({ cuidador }: { cuidador: boolean }) {
  const { usuario } = useAuth();
  return (
    <AppScreenLayout
      title={
        cuidador ? 'Editar perfil do cuidador' : 'Editar perfil do responsável'
      }
      tab="Perfil"
    >
      {usuario && (cuidador ? usuario.cuidador : usuario.responsavel) ? (
        <FormularioPerfil usuario={usuario} cuidador={cuidador} />
      ) : (
        <Notice>Seu perfil não permite acessar esta edição.</Notice>
      )}
    </AppScreenLayout>
  );
}
export function EditarCuidadorScreen() {
  return <EditarPerfil cuidador />;
}
export function EditarResponsavelScreen() {
  return <EditarPerfil cuidador={false} />;
}
