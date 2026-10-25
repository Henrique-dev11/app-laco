import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { ActivityIndicator, Keyboard, Text, View } from 'react-native';
import { isAxiosError } from 'axios';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { CuidadosIdosoForm } from '../components/CuidadosIdosoForm';
import {
  FotoPerfilForm,
  type FotoRascunho,
} from '../components/FotoPerfilForm';
import { SecaoPerfil } from '../components/SecaoPerfil';
import { Notice } from '../components/Notice';
import {
  EnderecoForm,
  dadosEndereco,
  enderecoVazio,
  erroEndereco,
} from '../components/EnderecoForm';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { enviarImagem, removerFoto, validarFoto } from '../services/foto';
import type { Endereco, Idoso } from '../types/auth';
import type { ScreenProps } from '../types/navigation';
import {
  dataValida,
  formatarCpf,
  formatarData,
  formatarTelefone,
} from '../utils/validation';
import {
  alteracoes,
  alteracoesIdoso,
  dadosIdosoFormulario,
  dadosIdosoParaApi,
  normalizarDadosIdoso,
  type DadosIdosoFormulario,
} from '../utils/perfis';
import { statusLabels, useAppStyles } from '../theme/appStyles';
import { useTheme } from '../theme/ThemeContext';

type Navigation =
  | ScreenProps<'EditarIdoso'>['navigation']
  | ScreenProps<'AdicionarIdoso'>['navigation'];
function FormularioIdoso({
  idoso,
  navigation,
}: {
  idoso?: Idoso;
  navigation: Navigation;
}) {
  const { usuario, atualizar, fotoPendente, limparFotoPendente } = useAuth();
  const styles = useAppStyles();
  const colors = useTheme();
  const [registroId, setRegistroId] = useState(idoso?.id);
  const [original, setOriginal] = useState(() =>
    normalizarDadosIdoso(dadosIdosoFormulario(idoso)),
  );
  const [dados, setDados] = useState(original);
  const [enderecoOriginal, setEnderecoOriginal] = useState(() =>
    dadosEndereco(idoso?.endereco ?? enderecoVazio),
  );
  const [endereco, setEndereco] = useState<Endereco>(enderecoOriginal);
  const [foto, setFoto] = useState<FotoRascunho>(() =>
    idoso && fotoPendente?.idosoId === idoso.id
      ? fotoPendente.imagem
      : undefined,
  );
  const [parentesco, setParentesco] = useState('OUTRO');
  const [mensagem, setMensagem] = useState('');
  const [erros, setErros] = useState<
    Partial<Record<keyof DadosIdosoFormulario, string>>
  >({});
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<number | null>(null);
  const salvando = useRef(false);
  const dadosPersistidos = useRef(false);
  usePreventRemove(enviando && !concluido, () => {});
  useEffect(() => {
    if (idoso && fotoPendente?.idosoId === idoso.id) limparFotoPendente();
  }, [idoso, fotoPendente, limparFotoPendente]);
  useEffect(() => {
    if (concluido)
      navigation.popTo('IdosoDetalhes', {
        idosoId: concluido,
        mensagem: idoso
          ? 'Perfil do idoso atualizado com sucesso.'
          : 'Idoso cadastrado e vinculado à sua conta.',
      });
  }, [concluido, idoso, navigation]);

  async function salvar() {
    if (salvando.current || concluido) return;
    const atual = normalizarDadosIdoso(dados);
    const mudancas = alteracoes(original, atual);
    const enderecoAtual = dadosEndereco(endereco);
    const enderecoPatch = alteracoes(enderecoOriginal, enderecoAtual);
    const proximosErros: typeof erros = {};
    if ((!registroId || 'nome' in mudancas) && !atual.nome)
      proximosErros.nome = 'Informe o nome completo.';
    if (
      (!registroId || 'dataNascimento' in mudancas) &&
      !dataValida(atual.dataNascimento)
    )
      proximosErros.dataNascimento = 'Informe uma data de nascimento válida.';
    if (
      (!registroId || 'cpf' in mudancas) &&
      atual.cpf &&
      atual.cpf.length !== 11
    )
      proximosErros.cpf = 'CPF deve ter 11 dígitos.';
    if (
      (!registroId || 'telefone' in mudancas) &&
      atual.telefone &&
      !/^\d{10,13}$/.test(atual.telefone)
    )
      proximosErros.telefone = 'Informe telefone válido com DDD.';
    const enderecoErro =
      !registroId || Object.keys(enderecoPatch).length
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
      let id = registroId;
      if (id) {
        const body = {
          ...alteracoesIdoso(original, atual),
          ...(Object.keys(enderecoPatch).length > 0 && {
            endereco: enderecoPatch,
          }),
        };
        if (Object.keys(body).length) {
          await api.patch(`/idosos/${id}`, body);
          dadosPersistidos.current = true;
        }
      } else {
        const body = dadosIdosoParaApi(atual);
        const { data } = await api.post<Idoso>('/idosos', {
          ...body,
          cpf: body.cpf ?? undefined,
          telefone: body.telefone ?? undefined,
          parentesco,
          endereco: enderecoAtual,
        });
        id = data.id;
        setRegistroId(id);
        dadosPersistidos.current = true;
      }
      setOriginal(atual);
      setEnderecoOriginal(enderecoAtual);
      etapa = 'foto';
      if (foto !== undefined) {
        if (foto === null) await removerFoto(id);
        else await enviarImagem(foto, id);
        setFoto(undefined);
      }
      etapa = 'atualizacao';
      await atualizar();
      setConcluido(id);
    } catch (error) {
      const motivo = isAxiosError(error)
        ? mensagemErro(error)
        : error instanceof Error
          ? error.message
          : mensagemErro(error);
      setMensagem(
        etapa === 'atualizacao'
          ? `As alterações foram enviadas, mas não foi possível recarregar a conta. Toque em Salvar alterações para tentar novamente. ${motivo}`
          : etapa === 'foto' && dadosPersistidos.current
            ? `Os dados do idoso foram salvos, mas a foto não pôde ser atualizada. Sua seleção foi preservada. Tente salvar novamente. ${motivo}`
            : motivo,
      );
    } finally {
      salvando.current = false;
      setEnviando(false);
    }
  }
  function campo(
    campo: 'nome' | 'nomeSocial' | 'dataNascimento' | 'cpf' | 'telefone',
    label: string,
  ) {
    const formatar =
      campo === 'cpf'
        ? formatarCpf
        : campo === 'telefone'
          ? formatarTelefone
          : campo === 'dataNascimento'
            ? formatarData
            : (v: string) => v;
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
            : campo === 'telefone'
              ? 21
              : campo === 'dataNascimento'
                ? 10
                : 150
        }
        keyboardType={
          campo === 'telefone'
            ? 'phone-pad'
            : campo === 'cpf' || campo === 'dataNascimento'
              ? 'numeric'
              : 'default'
        }
        onChangeText={(valor) => {
          setDados((antes) => ({ ...antes, [campo]: formatar(valor) }));
          setErros((antes) => ({ ...antes, [campo]: undefined }));
        }}
      />
    );
  }
  return (
    <AppScreenLayout
      title={idoso ? 'Editar perfil do idoso' : 'Adicionar idoso'}
      subtitle="Dados pessoais, foto e informações de cuidado"
      tab="Perfil"
      formulario
      bloqueado={enviando}
    >
      {!!registroId && (
        <SecaoPerfil titulo="Foto de perfil" icone="camera-outline">
          <FotoPerfilForm
            usuario={{
              nome: dados.nome,
              nomeSocial: dados.nomeSocial,
              foto: idoso?.foto,
            }}
            idosoId={registroId}
            contaId={usuario!.id}
            value={foto}
            onChange={(nova) => {
              setFoto(nova);
              setMensagem('');
            }}
            disabled={enviando}
          />
        </SecaoPerfil>
      )}
      <SecaoPerfil titulo="Dados pessoais" icone="person-outline">
        {campo('nome', 'Nome completo*')}
        {campo('nomeSocial', 'Nome social')}
        {campo('dataNascimento', 'Data de nascimento (DD/MM/AAAA)*')}
        {campo('cpf', 'CPF (opcional)')}
      </SecaoPerfil>
      <SecaoPerfil titulo="Informações de contato" icone="call-outline">
        {campo('telefone', 'Telefone (opcional)')}
      </SecaoPerfil>
      <SecaoPerfil titulo="Endereço" icone="location-outline">
        {!!usuario?.responsavel && (
          <Button
            title="Usar endereço do responsável"
            variant="outline"
            disabled={enviando}
            onPress={() =>
              setEndereco(dadosEndereco(usuario.responsavel!.endereco))
            }
          />
        )}
        <EnderecoForm
          value={endereco}
          onChange={setEndereco}
          disabled={enviando}
        />
      </SecaoPerfil>
      <SecaoPerfil titulo="Informações de cuidado" icone="heart-outline">
        <CuidadosIdosoForm
          value={dados}
          onChange={(cuidados) =>
            setDados((antes) => ({
              ...antes,
              sexo: cuidados.sexo,
              necessidadesEspeciais: cuidados.necessidadesEspeciais,
              observacoes: cuidados.observacoes,
            }))
          }
          disabled={enviando}
        />
      </SecaoPerfil>
      {!idoso && !registroId && (
        <SecaoPerfil titulo="Vínculo com o idoso" icone="people-outline">
          <Text style={styles.helper}>Seu parentesco com o idoso</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['FILHO', 'FILHA', 'CONJUGE', 'NETO', 'NETA', 'OUTRO'].map((p) => (
              <Button
                key={p}
                title={statusLabels[p]}
                variant={p === parentesco ? 'filled' : 'outline'}
                disabled={enviando}
                onPress={() => setParentesco(p)}
              />
            ))}
          </View>
        </SecaoPerfil>
      )}
      <View style={{ gap: 12 }}>
        {!!mensagem && <Notice>{mensagem}</Notice>}
        {enviando && (
          <ActivityIndicator
            accessibilityLabel="Salvando alterações"
            color={colors.primary}
          />
        )}
        <Button
          title={
            enviando
              ? 'Salvando...'
              : registroId
                ? 'Salvar alterações'
                : 'Salvar idoso'
          }
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
export function AdicionarIdosoScreen({
  navigation,
}: ScreenProps<'AdicionarIdoso'>) {
  const { usuario } = useAuth();
  if (usuario?.responsavel) return <FormularioIdoso navigation={navigation} />;
  return (
    <AppScreenLayout title="Adicionar idoso" tab="Perfil">
      <Notice>Disponível para responsáveis.</Notice>
    </AppScreenLayout>
  );
}
export function EditarIdosoScreen({
  route,
  navigation,
}: ScreenProps<'EditarIdoso'>) {
  const [idoso, setIdoso] = useState<Idoso | null>(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setIdoso(null);
      setErro('');
      api
        .get<Idoso>(`/idosos/${route.params.idosoId}`, {
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (!controller.signal.aborted) setIdoso(data);
        })
        .catch((error) => {
          if (!controller.signal.aborted) setErro(mensagemErro(error));
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- tentativa permite repetir a consulta após erro.
    }, [route.params.idosoId, tentativa]),
  );
  if (idoso)
    return (
      <FormularioIdoso key={idoso.id} idoso={idoso} navigation={navigation} />
    );
  return (
    <AppScreenLayout title="Editar perfil do idoso" tab="Perfil" formulario>
      {!erro ? (
        <ActivityIndicator />
      ) : (
        <>
          <Notice>{erro}</Notice>
          <Button
            title="Tentar novamente"
            onPress={() => setTentativa((n) => n + 1)}
          />
        </>
      )}
    </AppScreenLayout>
  );
}
