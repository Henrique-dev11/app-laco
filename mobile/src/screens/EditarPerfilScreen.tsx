import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { isAxiosError } from 'axios';
import { Button } from '../components/Button';
import { CuidadosIdosoForm } from '../components/CuidadosIdosoForm';
import { FormField } from '../components/FormField';
import {
  EnderecoForm,
  dadosEndereco,
  erroEndereco,
} from '../components/EnderecoForm';
import {
  FotoPerfilForm,
  type FotoRascunho,
} from '../components/FotoPerfilForm';
import { Notice } from '../components/Notice';
import { SecaoPerfil } from '../components/SecaoPerfil';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { enviarImagem, removerFoto, validarFoto } from '../services/foto';
import {
  dataValida,
  emailValido,
  formatarCpf,
  formatarData,
  formatarTelefone,
} from '../utils/validation';
import {
  alteracoes,
  alteracoesPerfil,
  dadosPerfil,
  normalizarPerfil,
  type DadosPerfil,
} from '../utils/perfis';
import { useAppStyles } from '../theme/appStyles';
import type { Endereco, UsuarioAtual } from '../types/auth';
import type { ScreenProps } from '../types/navigation';

type Navigation = ScreenProps<'EditarPerfil'>['navigation'];

function FormularioPerfil({
  usuario,
  navigation,
}: {
  usuario: UsuarioAtual;
  navigation: Navigation;
}) {
  const cuidador = !!usuario.cuidador;
  const perfil = (usuario.cuidador ?? usuario.responsavel)!;
  const proprio = usuario.responsavel?.responsavelIdosos.find(
    (vinculo) => vinculo.parentesco === 'PROPRIO',
  )?.idoso;
  const { atualizar, fotoPendente, limparFotoPendente } = useAuth();
  const styles = useAppStyles();
  const [original, setOriginal] = useState(() =>
    normalizarPerfil(dadosPerfil(usuario)),
  );
  const [dados, setDados] = useState(original);
  const [enderecoOriginal, setEnderecoOriginal] = useState(() =>
    dadosEndereco(perfil.endereco),
  );
  const [endereco, setEndereco] = useState<Endereco>(enderecoOriginal);
  const [foto, setFoto] = useState<FotoRascunho>(() =>
    fotoPendente &&
    (!fotoPendente.idosoId || fotoPendente.idosoId === proprio?.id)
      ? fotoPendente.imagem
      : undefined,
  );
  const [cuidadosOriginais, setCuidadosOriginais] = useState({
    sexo: proprio?.sexo ?? '',
    necessidadesEspeciais: proprio?.necessidadesEspeciais ?? '',
    observacoes: proprio?.observacoes ?? '',
  });
  const [cuidados, setCuidados] = useState(cuidadosOriginais);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erros, setErros] = useState<
    Partial<Record<keyof DadosPerfil, string>>
  >({});
  const salvando = useRef(false);
  const houvePersistencia = useRef(false);
  usePreventRemove(enviando && !concluido, () => {});
  useEffect(() => {
    if (
      fotoPendente &&
      (!fotoPendente.idosoId || fotoPendente.idosoId === proprio?.id)
    )
      limparFotoPendente();
  }, [fotoPendente, proprio?.id, limparFotoPendente]);
  useEffect(() => {
    if (concluido)
      navigation.popTo('Perfil', {
        mensagem: 'Perfil atualizado com sucesso.',
      });
  }, [concluido, navigation]);

  async function salvar() {
    if (salvando.current) return;
    const atual = normalizarPerfil(dados);
    const mudancas = alteracoes(original, atual);
    const enderecoAtual = dadosEndereco(endereco);
    const enderecoMudancas = alteracoes(enderecoOriginal, enderecoAtual);
    const proximosErros: typeof erros = {};
    // Campos não alterados são preservados, inclusive cadastros antigos.
    if ('nome' in mudancas && !atual.nome)
      proximosErros.nome = 'Informe o nome completo.';
    if ('email' in mudancas && !emailValido(atual.email))
      proximosErros.email = 'Informe um e-mail válido.';
    if ('telefone' in mudancas && !/^\d{10,13}$/.test(atual.telefone))
      proximosErros.telefone = 'Informe um telefone válido com DDD.';
    if (
      'telefone2' in mudancas &&
      atual.telefone2 &&
      !/^\d{10,13}$/.test(atual.telefone2)
    )
      proximosErros.telefone2 = 'Informe um telefone válido com DDD.';
    if ('cpf' in mudancas && !/^\d{11}$/.test(atual.cpf))
      proximosErros.cpf = 'O CPF deve ter 11 dígitos.';
    if ('dataNascimento' in mudancas && !dataValida(atual.dataNascimento))
      proximosErros.dataNascimento = 'Informe uma data de nascimento válida.';
    const enderecoErro = Object.keys(enderecoMudancas).length
      ? erroEndereco(endereco)
      : '';
    setErros(proximosErros);
    if (Object.keys(proximosErros).length || enderecoErro) {
      setMensagem(Object.values(proximosErros)[0] || enderecoErro);
      return;
    }
    if (foto) {
      try {
        validarFoto(foto);
      } catch (error) {
        setMensagem(
          error instanceof Error
            ? error.message
            : 'Verifique a foto selecionada.',
        );
        return;
      }
    }
    salvando.current = true;
    setEnviando(true);
    setMensagem('');
    Keyboard.dismiss();
    let etapa: 'dados' | 'foto' | 'atualizacao' = 'dados';
    try {
      const body = {
        ...alteracoesPerfil(original, atual, cuidador),
        ...(proprio &&
          Object.keys(alteracoes(cuidadosOriginais, cuidados)).length > 0 && {
            idoso: alteracoes(cuidadosOriginais, cuidados),
          }),
        ...(Object.keys(enderecoMudancas).length > 0 && {
          endereco: enderecoMudancas,
        }),
      };
      if (Object.keys(body).length) {
        await api.patch(
          `/${cuidador ? 'cuidadores' : 'responsaveis'}/${perfil.id}`,
          body,
        );
        // Se o upload falhar, a próxima tentativa envia só o que ainda falta.
        houvePersistencia.current = true;
        setOriginal(atual);
        setEnderecoOriginal(enderecoAtual);
        setCuidadosOriginais(cuidados);
      }
      etapa = 'foto';
      if (foto !== undefined) {
        if (foto === null) await removerFoto();
        else await enviarImagem(foto);
        houvePersistencia.current = true;
        setFoto(undefined);
      }
      etapa = 'atualizacao';
      await atualizar();
      setConcluido(true);
    } catch (error) {
      const motivo = isAxiosError(error)
        ? mensagemErro(error)
        : error instanceof Error
          ? error.message
          : mensagemErro(error);
      setMensagem(
        etapa === 'atualizacao'
          ? `As alterações foram enviadas, mas não foi possível recarregar o perfil. Seus dados foram preservados. Toque em Salvar alterações para tentar novamente. ${motivo}`
          : etapa === 'foto' && houvePersistencia.current
            ? `Os dados pessoais foram salvos, mas a foto não pôde ser atualizada. Sua seleção foi preservada. Tente salvar novamente. ${motivo}`
            : motivo,
      );
    } finally {
      salvando.current = false;
      setEnviando(false);
    }
  }

  function campo(campo: keyof DadosPerfil, label: string) {
    const telefone = campo === 'telefone' || campo === 'telefone2';
    const numerico = telefone || campo === 'cpf' || campo === 'dataNascimento';
    const profissional = ['biografia', 'experienciaProfissional'].includes(
      campo,
    );
    const formatar = telefone
      ? formatarTelefone
      : campo === 'cpf'
        ? formatarCpf
        : campo === 'dataNascimento'
          ? formatarData
          : (valor: string) => valor;
    return (
      <FormField
        key={campo}
        label={label}
        value={formatar(dados[campo])}
        error={erros[campo]}
        editable={!enviando}
        maxLength={
          campo === 'cpf'
            ? 14
            : campo === 'dataNascimento'
              ? 10
              : telefone
                ? 21
                : campo === 'email'
                  ? 255
                  : profissional
                    ? 5000
                    : campo === 'registroProfissional'
                      ? 100
                      : 150
        }
        keyboardType={
          campo === 'email'
            ? 'email-address'
            : telefone
              ? 'phone-pad'
              : numerico
                ? 'numeric'
                : 'default'
        }
        autoCapitalize={campo === 'email' ? 'none' : 'sentences'}
        autoCorrect={campo === 'email' || numerico ? false : undefined}
        multiline={profissional}
        onChangeText={(valor) => {
          setDados((antes) => ({ ...antes, [campo]: formatar(valor) }));
          setErros((antes) => ({ ...antes, [campo]: undefined }));
        }}
      />
    );
  }
  return (
    <AppScreenLayout
      title="Editar perfil"
      subtitle="Atualize apenas as informações que desejar"
      tab="Perfil"
      formulario
      bloqueado={enviando}
    >
      <SecaoPerfil titulo="Foto de perfil" icone="camera-outline">
        <FotoPerfilForm
          usuario={usuario}
          value={foto}
          onChange={(novaFoto) => {
            setFoto(novaFoto);
            setMensagem('');
          }}
          disabled={enviando}
        />
      </SecaoPerfil>
      <SecaoPerfil
        titulo="Dados pessoais"
        icone="person-outline"
        descricao="Os campos com * são obrigatórios no cadastro."
      >
        {campo('nome', 'Nome completo*')}
        {campo('nomeSocial', 'Nome social')}
        {campo('dataNascimento', 'Data de nascimento (DD/MM/AAAA)*')}
        {campo('cpf', 'CPF*')}
      </SecaoPerfil>
      <SecaoPerfil titulo="Informações de contato" icone="call-outline">
        {campo('email', 'E-mail*')}
        <Text style={styles.helper}>
          Ao alterar o e-mail, use o novo endereço no próximo acesso ao Laço.
        </Text>
        {campo('telefone', 'Telefone principal*')}
        {campo('telefone2', 'Telefone secundário')}
      </SecaoPerfil>
      <SecaoPerfil titulo="Endereço" icone="location-outline">
        <EnderecoForm
          value={endereco}
          onChange={setEndereco}
          disabled={enviando}
        />
      </SecaoPerfil>
      {!!proprio && (
        <SecaoPerfil titulo="Informações de cuidado" icone="heart-outline">
          <CuidadosIdosoForm
            value={cuidados}
            onChange={setCuidados}
            disabled={enviando}
          />
        </SecaoPerfil>
      )}
      {cuidador && (
        <SecaoPerfil titulo="Dados profissionais" icone="briefcase-outline">
          {campo('biografia', 'Biografia')}
          {campo('experienciaProfissional', 'Experiência profissional')}
          {campo('registroProfissional', 'Registro profissional')}
          {!!usuario.cuidador?.curriculo && (
            <Text style={styles.helper}>
              Currículo salvo: {usuario.cuidador.curriculo.nome}
            </Text>
          )}
        </SecaoPerfil>
      )}
      <View style={{ gap: 12 }}>
        {!!mensagem && <Notice>{mensagem}</Notice>}
        <Button
          loading={enviando}
          title={enviando ? 'Salvando...' : 'Salvar alterações'}
          disabled={enviando}
          onPress={() => {
            void salvar();
          }}
        />
        <Button
          title="Cancelar"
          variant="outline"
          disabled={enviando}
          onPress={() => navigation.goBack()}
        />
      </View>
    </AppScreenLayout>
  );
}

export function EditarPerfilScreen({
  navigation,
}: ScreenProps<'EditarPerfil'>) {
  const { usuario } = useAuth();
  if (usuario && (usuario.cuidador || usuario.responsavel))
    return (
      <FormularioPerfil
        key={usuario.id}
        usuario={usuario}
        navigation={navigation}
      />
    );
  return (
    <AppScreenLayout title="Editar perfil" tab="Perfil" formulario>
      <Notice>Seu perfil não permite acessar esta edição.</Notice>
    </AppScreenLayout>
  );
}
