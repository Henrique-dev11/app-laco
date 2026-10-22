import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Text } from 'react-native';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import {
  EnderecoForm,
  dadosEndereco,
  enderecoVazio,
  erroEndereco,
} from '../components/EnderecoForm';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import type { Endereco } from '../types/auth';
import type { ScreenProps } from '../types/navigation';
import { dataValida, formatarData, somenteNumeros } from '../utils/validation';
import { dataParaApi, dataParaFormulario, alteracoes } from '../utils/perfis';
import { statusLabels, useAppStyles } from '../theme/appStyles';

type Idoso = {
  id: number;
  nome: string;
  nomeSocial: string | null;
  dataNascimento: string;
  cpf: string | null;
  telefone: string | null;
  sexo: string | null;
  necessidadesEspeciais: string | null;
  observacoes: string | null;
  endereco: Endereco;
  updatedAt: string;
};
function FormularioIdoso({ idoso }: { idoso?: Idoso }) {
  const { usuario, atualizar } = useAuth();
  const navigation = useNavigation();
  const styles = useAppStyles();
  const [original] = useState({
    nome: idoso?.nome ?? '',
    nomeSocial: idoso?.nomeSocial ?? '',
    dataNascimento: idoso ? dataParaFormulario(idoso.dataNascimento) : '',
    cpf: idoso?.cpf ?? '',
    telefone: idoso?.telefone ?? '',
    sexo: idoso?.sexo ?? '',
    necessidadesEspeciais: idoso?.necessidadesEspeciais ?? '',
    observacoes: idoso?.observacoes ?? '',
  });
  const [dados, setDados] = useState(original);
  const [enderecoOriginal] = useState(
    dadosEndereco(idoso?.endereco ?? enderecoVazio),
  );
  const [endereco, setEndereco] = useState<Endereco>(enderecoOriginal);
  const [parentesco, setParentesco] = useState('OUTRO');
  const [mensagem, setMensagem] = useState(''),
    [enviando, setEnviando] = useState(false),
    [salvo, setSalvo] = useState(false);
  async function salvar() {
    if (enviando || salvo) return;
    const cpf = somenteNumeros(dados.cpf),
      telefone = somenteNumeros(dados.telefone);
    const erro =
      !dados.nome.trim() || !dataValida(dados.dataNascimento)
        ? 'Informe nome e data de nascimento válidos.'
        : dados.cpf.trim() && cpf.length !== 11
          ? 'CPF deve ter 11 dígitos.'
          : dados.telefone.trim() &&
              (telefone.length < 10 || telefone.length > 13)
            ? 'Informe telefone válido com DDD.'
            : erroEndereco(endereco);
    if (erro) {
      setMensagem(erro);
      return;
    }
    const depois = {
      ...dados,
      nome: dados.nome.trim(),
      nomeSocial: dados.nomeSocial.trim(),
      dataNascimento: dataParaApi(dados.dataNascimento),
      cpf: cpf || null,
      telefone: telefone || null,
    };
    setEnviando(true);
    setMensagem('');
    try {
      if (idoso) {
        const antes = {
          ...original,
          dataNascimento: dataParaApi(original.dataNascimento),
          cpf: original.cpf || null,
          telefone: original.telefone || null,
        };
        const patch = alteracoes(antes, depois);
        const enderecoPatch = alteracoes(
          enderecoOriginal,
          dadosEndereco(endereco),
        );
        await api.patch(`/idosos/${idoso.id}`, {
          ...patch,
          ...(Object.keys(enderecoPatch).length && { endereco: enderecoPatch }),
        });
      } else {
        await api.post('/idosos', {
          ...depois,
          cpf: cpf || undefined,
          telefone: telefone || undefined,
          parentesco,
          endereco: dadosEndereco(endereco),
        });
      }
      setSalvo(true);
      await atualizar().catch(() =>
        setMensagem(
          'Os dados foram salvos, mas não foi possível atualizar a lista da conta. Tente atualizar abaixo.',
        ),
      );
    } catch (e) {
      setMensagem(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  }
  if (salvo)
    return (
      <>
        <Notice>
          {idoso
            ? 'Dados do idoso atualizados.'
            : 'Idoso cadastrado e vinculado à sua conta.'}
        </Notice>
        {!!mensagem && (
          <>
            <Notice>{mensagem}</Notice>
            <Button
              title="Atualizar dados da conta"
              disabled={enviando}
              onPress={() => {
                setEnviando(true);
                void atualizar()
                  .then(() => setMensagem(''))
                  .catch((e) => setMensagem(mensagemErro(e)))
                  .finally(() => setEnviando(false));
              }}
            />
          </>
        )}
        <Button
          title="Voltar"
          disabled={enviando}
          onPress={() => navigation.goBack()}
        />
      </>
    );
  return (
    <>
      {(
        [
          'nome',
          'nomeSocial',
          'dataNascimento',
          'cpf',
          'telefone',
          'sexo',
          'necessidadesEspeciais',
          'observacoes',
        ] as const
      ).map((campo) => (
        <FormField
          key={campo}
          label={
            {
              nome: 'Nome completo*',
              nomeSocial: 'Nome social',
              dataNascimento: 'Nascimento (DD/MM/AAAA)*',
              cpf: 'CPF (opcional)',
              telefone: 'Telefone (opcional)',
              sexo: 'Sexo (opcional)',
              necessidadesEspeciais: 'Necessidades especiais',
              observacoes: 'Observações',
            }[campo]
          }
          value={dados[campo]}
          editable={!enviando}
          maxLength={
            campo === 'dataNascimento'
              ? 10
              : campo === 'nome' || campo === 'nomeSocial'
                ? 150
                : campo === 'sexo'
                  ? 30
                  : campo === 'cpf' || campo === 'telefone'
                    ? 20
                    : 5000
          }
          keyboardType={
            ['cpf', 'telefone', 'dataNascimento'].includes(campo)
              ? 'numeric'
              : 'default'
          }
          multiline={
            campo === 'necessidadesEspeciais' || campo === 'observacoes'
          }
          onChangeText={(valor) =>
            setDados((d) => ({
              ...d,
              [campo]: campo === 'dataNascimento' ? formatarData(valor) : valor,
            }))
          }
        />
      ))}
      {!idoso && (
        <>
          <Text style={styles.section}>Seu parentesco com o idoso</Text>
          {['FILHO', 'FILHA', 'CONJUGE', 'NETO', 'NETA', 'OUTRO'].map((p) => (
            <Button
              key={p}
              title={statusLabels[p]}
              variant={p === parentesco ? 'filled' : 'outline'}
              disabled={enviando}
              onPress={() => setParentesco(p)}
            />
          ))}
        </>
      )}
      <Text style={styles.section}>Endereço do idoso</Text>
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
      {!!mensagem && <Notice>{mensagem}</Notice>}
      <Button
        title={enviando ? 'Salvando...' : 'Salvar idoso'}
        disabled={enviando}
        onPress={() => {
          void salvar();
        }}
      />
    </>
  );
}
export function AdicionarIdosoScreen() {
  const { usuario } = useAuth();
  return (
    <AppScreenLayout title="Adicionar idoso" tab="Perfil">
      {usuario?.responsavel ? (
        <FormularioIdoso />
      ) : (
        <Notice>Disponível para responsáveis.</Notice>
      )}
    </AppScreenLayout>
  );
}
export function EditarIdosoScreen({ route }: ScreenProps<'EditarIdoso'>) {
  const [idoso, setIdoso] = useState<Idoso | null>(null),
    [erro, setErro] = useState(''),
    [tentativa, setTentativa] = useState(0);
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
        .catch((e) => {
          if (!controller.signal.aborted) setErro(mensagemErro(e));
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- tentativa permite repetir a consulta após erro ou alteração.
    }, [route.params.idosoId, tentativa]),
  );
  return (
    <AppScreenLayout title="Editar idoso" tab="Perfil">
      {!idoso && !erro && <ActivityIndicator />}
      {!!erro && (
        <>
          <Notice>{erro}</Notice>
          <Button
            title="Tentar novamente"
            onPress={() => setTentativa((n) => n + 1)}
          />
        </>
      )}
      {!!idoso && (
        <FormularioIdoso key={`${idoso.id}-${idoso.updatedAt}`} idoso={idoso} />
      )}
    </AppScreenLayout>
  );
}
