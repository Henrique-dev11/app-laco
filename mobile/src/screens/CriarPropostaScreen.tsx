import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { FormField } from '../components/FormField';
import { CalendarioDisponivel } from '../components/CalendarioDisponivel';
import { useAppStyles } from '../theme/appStyles';
import { api, mensagemErro } from '../services/api';
import {
  dataProposta,
  valorProposta,
  urlPropostas,
  type ContextoProposta,
} from '../services/propostas';
import {
  centavosProposta,
  decimalProposta,
  minutosProposta,
} from '../utils/propostas';
import { dataSaoPaulo } from '../utils/calendario';
import type { ScreenProps } from '../types/navigation';
type Item = {
  cuidadorServicoId: number;
  nome: string;
  preco: string;
  duracao: string;
  unidade: 'horas' | 'minutos';
  inicios: string[];
  contratacaoOrigemId?: number;
};
type Opcoes = {
  datas: {
    data: string;
    horarios: {
      inicio: string;
      fim: string;
      horaInicio: string;
      horaFim: string;
    }[];
  }[];
};
export function CriarPropostaScreen(props: ScreenProps<'CriarProposta'>) {
  return (
    <Formulario
      key={`${props.route.params.usuarioId}-${props.route.params.anterior?.id ?? 'nova'}`}
      {...props}
    />
  );
}
function Formulario({ route, navigation }: ScreenProps<'CriarProposta'>) {
  const { usuarioId, anterior } = route.params;
  const url = urlPropostas(usuarioId),
    styles = useAppStyles();
  const [contexto, setContexto] = useState<ContextoProposta | null>(null);
  const [idosoId, setIdosoId] = useState<number | null>(
    anterior?.idosoId ?? null,
  );
  const [itens, setItens] = useState<Item[]>(
    () =>
      anterior?.itens.map((i) => ({
        cuidadorServicoId: i.cuidadorServicoId,
        nome: i.nomeServico,
        preco: i.preco,
        duracao: String(i.duracaoMinutos),
        unidade: 'minutos',
        inicios: i.inicios,
        ...(i.contratacaoOrigemId
          ? { contratacaoOrigemId: i.contratacaoOrigemId }
          : {}),
      })) ?? [],
  );
  const [observacoes, setObservacoes] = useState(anterior?.observacoes ?? '');
  const [revisao, setRevisao] = useState(false),
    [salvando, setSalvando] = useState(false),
    [erro, setErro] = useState('');
  const [consulta, setConsulta] = useState(0);
  const [calendario, setCalendario] = useState<number | null>(null);
  const [mes, setMes] = useState(dataSaoPaulo().slice(0, 7)),
    [dia, setDia] = useState('');
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null),
    [carregando, setCarregando] = useState(false);
  const itemAtual = calendario === null ? undefined : itens[calendario];
  const duracaoAtual = itemAtual
    ? minutosProposta(itemAtual.duracao, itemAtual.unidade)
    : null;
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      api
        .get<ContextoProposta>(`${url}/contexto`, { signal: controller.signal })
        .then((r) => {
          if (!controller.signal.aborted) {
            setContexto(r.data);
            setIdosoId((atual) => atual ?? r.data.idosos[0]?.id ?? null);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setErro(mensagemErro(e));
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- consulta permite repetir o carregamento após erro.
    }, [url, consulta]),
  );
  useFocusEffect(
    useCallback(() => {
      if (calendario === null || !duracaoAtual) return;
      const controller = new AbortController();
      setOpcoes(null);
      setCarregando(true);
      api
        .get<Opcoes>(`${url}/horarios`, {
          params: { mes, duracaoMinutos: duracaoAtual },
          signal: controller.signal,
        })
        .then((r) => {
          if (!controller.signal.aborted) setOpcoes(r.data);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setErro(mensagemErro(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setCarregando(false);
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- consulta atualiza a disponibilidade após conflito.
    }, [url, mes, calendario, duracaoAtual, consulta]),
  );
  const totalCentavos = itens.reduce(
    (n, i) => n + (centavosProposta(i.preco) ?? 0) * i.inicios.length,
    0,
  );
  function conflita(inicio: string, fim: string) {
    return itens.some((i) =>
      i.inicios.some((d) => {
        const duracao = minutosProposta(i.duracao, i.unidade);
        return (
          duracao !== null &&
          new Date(inicio).getTime() <
            new Date(d).getTime() + duracao * 60000 &&
          new Date(fim).getTime() > new Date(d).getTime()
        );
      }),
    );
  }
  function alterar(index: number, patch: Partial<Item>) {
    setItens((atuais) =>
      atuais.map((i, n) => (n === index ? { ...i, ...patch } : i)),
    );
  }
  function validar() {
    if (!idosoId || !contexto?.idosos.some((i) => i.id === idosoId))
      return 'Selecione um idoso vinculado ao responsável.';
    if (!itens.length) return 'Adicione pelo menos um serviço.';
    if (itens.reduce((n, i) => n + i.inicios.length, 0) > 60)
      return 'Limite de 60 atendimentos por proposta.';
    for (const i of itens) {
      if (!contexto.ofertas.some((o) => o.id === i.cuidadorServicoId))
        return 'Um serviço não está mais ativo. Remova-o da proposta.';
      if (!centavosProposta(i.preco))
        return 'Informe um valor positivo com até duas casas decimais por atendimento.';
      if (!minutosProposta(i.duracao, i.unidade))
        return 'Informe duração de 1 a 720 minutos, sem frações de minuto.';
      if (!i.inicios.length)
        return 'Selecione pelo menos uma data para cada serviço.';
      if (
        i.contratacaoOrigemId &&
        !contexto.contratacoes.some(
          (c) =>
            c.id === i.contratacaoOrigemId &&
            c.idosoId === idosoId &&
            c.cuidadorServicoId === i.cuidadorServicoId,
        )
      )
        return 'A contratação vinculada não está mais disponível. Revise o vínculo.';
    }
    if (totalCentavos > 9999999999) return 'O total excede o limite permitido.';
    return '';
  }
  async function enviar() {
    if (salvando) return;
    const erroValidacao = validar();
    if (erroValidacao) {
      setErro(erroValidacao);
      setRevisao(false);
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await api.post(url, {
        idosoId,
        ...(anterior ? { anteriorId: anterior.id } : {}),
        observacoes,
        total: decimalProposta(totalCentavos),
        itens: itens.map((i) => ({
          cuidadorServicoId: i.cuidadorServicoId,
          ...(i.contratacaoOrigemId
            ? { contratacaoOrigemId: i.contratacaoOrigemId }
            : {}),
          preco: decimalProposta(centavosProposta(i.preco)!),
          duracaoMinutos: minutosProposta(i.duracao, i.unidade),
          inicios: i.inicios,
        })),
      });
      navigation.goBack();
    } catch (e) {
      setErro(mensagemErro(e));
      setRevisao(false);
      setConsulta((n) => n + 1);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <AppScreenLayout
      title={revisao ? 'Revisar proposta' : 'Criar proposta de atendimento'}
      subtitle="Formalize as condições combinadas no chat"
      tab="Mensagens"
    >
      {!!erro && <Notice>{erro}</Notice>}
      {!contexto && !erro && <ActivityIndicator />}
      <Text style={styles.section}>Idoso</Text>
      {contexto?.idosos.map((i) => (
        <Button
          key={i.id}
          title={i.nomeSocial || i.nome}
          disabled={revisao || !!anterior || salvando}
          variant={idosoId === i.id ? 'filled' : 'outline'}
          onPress={() => {
            setIdosoId(i.id);
            setItens((v) =>
              v.map((a) => ({ ...a, contratacaoOrigemId: undefined })),
            );
          }}
        />
      ))}
      {!revisao &&
        contexto?.ofertas.map((o) => (
          <Button
            key={o.id}
            title={`Adicionar ${o.servico.nome} · ${valorProposta(o.preco)}`}
            variant="outline"
            disabled={itens.length >= 10 || salvando}
            onPress={() => {
              const candidatos = contexto.contratacoes.filter(
                (c) =>
                  c.idosoId === idosoId &&
                  c.cuidadorServicoId === o.id &&
                  !itens.some((i) => i.contratacaoOrigemId === c.id),
              );
              setItens((v) => [
                ...v,
                {
                  cuidadorServicoId: o.id,
                  nome: o.servico.nome,
                  preco: o.preco,
                  duracao: String(o.duracaoMinutos),
                  unidade: 'minutos',
                  inicios: [],
                  ...(candidatos.length === 1
                    ? { contratacaoOrigemId: candidatos[0].id }
                    : {}),
                },
              ]);
              setCalendario(null);
            }}
          />
        ))}
      {contexto && !contexto.ofertas.length && (
        <Notice>
          Cadastre serviços ativos no seu perfil para criar propostas.
        </Notice>
      )}
      {itens.map((i, index) => (
        <View style={styles.card} key={index}>
          <Text style={styles.section}>{i.nome}</Text>
          {revisao ? (
            <Text style={styles.text}>
              {valorProposta(i.preco)} por atendimento ·{' '}
              {minutosProposta(i.duracao, i.unidade)} minutos cada ·{' '}
              {i.inicios.length} atendimento(s)
            </Text>
          ) : (
            <>
              <FormField
                label="Valor negociado por atendimento (R$)"
                value={i.preco}
                onChangeText={(v) => alterar(index, { preco: v })}
                keyboardType="decimal-pad"
              />
              <FormField
                label={`Duração em ${i.unidade}`}
                value={i.duracao}
                onChangeText={(v) =>
                  alterar(index, { duracao: v, inicios: [] })
                }
                keyboardType="decimal-pad"
              />
              <View style={styles.row}>
                {(['minutos', 'horas'] as const).map((unidade) => (
                  <Button
                    key={unidade}
                    title={unidade}
                    variant={i.unidade === unidade ? 'filled' : 'outline'}
                    onPress={() => {
                      const minutos = minutosProposta(i.duracao, i.unidade);
                      alterar(index, {
                        unidade,
                        duracao: minutos
                          ? String(unidade === 'horas' ? minutos / 60 : minutos)
                          : '',
                        inicios: [],
                      });
                    }}
                  />
                ))}
              </View>
              <Text style={styles.helper}>
                Alterar a duração exige selecionar os horários novamente.
              </Text>
              <Text style={styles.text}>
                Contratação:{' '}
                {i.contratacaoOrigemId
                  ? `atualizar #${i.contratacaoOrigemId} no primeiro atendimento`
                  : 'criar novos registros no aceite'}
              </Text>
              {contexto?.contratacoes
                .filter(
                  (c) =>
                    c.idosoId === idosoId &&
                    c.cuidadorServicoId === i.cuidadorServicoId,
                )
                .map((c) => (
                  <Button
                    key={c.id}
                    title={`Vincular contratação #${c.id}`}
                    variant={
                      i.contratacaoOrigemId === c.id ? 'filled' : 'outline'
                    }
                    onPress={() =>
                      alterar(index, { contratacaoOrigemId: c.id })
                    }
                  />
                ))}
              {!!i.contratacaoOrigemId && (
                <Button
                  title="Criar novos atendimentos sem vínculo anterior"
                  variant="outline"
                  onPress={() =>
                    alterar(index, { contratacaoOrigemId: undefined })
                  }
                />
              )}
            </>
          )}
          {i.inicios.map((d) => (
            <View key={d} style={{ gap: 6 }}>
              <Text style={styles.text}>
                {dataProposta(d)} até{' '}
                {dataProposta(
                  new Date(
                    new Date(d).getTime() +
                      (minutosProposta(i.duracao, i.unidade) ?? 0) * 60000,
                  ).toISOString(),
                )}
              </Text>
              {!revisao && (
                <Button
                  title="Remover data"
                  variant="outline"
                  onPress={() =>
                    alterar(index, {
                      inicios: i.inicios.filter((v) => v !== d),
                    })
                  }
                />
              )}
            </View>
          ))}
          {!revisao && (
            <>
              <Button
                title="Selecionar datas e horários"
                variant="outline"
                disabled={!minutosProposta(i.duracao, i.unidade)}
                onPress={() => {
                  setCalendario(index);
                  setDia('');
                  setConsulta((n) => n + 1);
                }}
              />
              <Button
                title="Remover serviço"
                variant="outline"
                onPress={() => {
                  setItens((v) => v.filter((_, n) => n !== index));
                  setCalendario(null);
                }}
              />
            </>
          )}
        </View>
      ))}
      {!revisao && itemAtual && calendario !== null && (
        <View style={styles.card}>
          <Text style={styles.section}>Horários para {itemAtual.nome}</Text>
          <CalendarioDisponivel
            mes={mes}
            onMes={(m) => {
              setMes(m);
              setDia('');
            }}
            datas={opcoes?.datas.map((d) => d.data) ?? []}
            selecionada={dia}
            onSelecionar={setDia}
            disabled={carregando}
          />
          {carregando && <ActivityIndicator />}
          {!carregando && opcoes && !opcoes.datas.length && (
            <Notice>
              Não há horários livres neste mês para essa duração. Verifique se o
              atendimento cabe em um intervalo da disponibilidade ou consulte
              outro mês.
            </Notice>
          )}
          {opcoes?.datas
            .find((d) => d.data === dia)
            ?.horarios.map((h) => (
              <Button
                key={h.inicio}
                title={`${h.horaInicio} às ${h.horaFim}`}
                variant="outline"
                disabled={
                  itemAtual.inicios.length >= 30 || conflita(h.inicio, h.fim)
                }
                onPress={() =>
                  alterar(calendario, {
                    inicios: [...itemAtual.inicios, h.inicio].sort(),
                  })
                }
              />
            ))}
          <Text style={styles.helper}>
            Horário de São Paulo. As datas serão revalidadas no envio e no
            aceite.
          </Text>
          <Button
            title="Fechar calendário"
            variant="outline"
            onPress={() => setCalendario(null)}
          />
        </View>
      )}
      {revisao ? (
        <>{!!observacoes && <Text style={styles.text}>{observacoes}</Text>}</>
      ) : (
        <FormField
          label="Observações e condições negociadas"
          value={observacoes}
          onChangeText={setObservacoes}
          maxLength={2000}
          multiline
        />
      )}
      <Text style={styles.name}>
        Valor total: {valorProposta(decimalProposta(totalCentavos))}
      </Text>
      <Notice>
        O total soma o preço por atendimento multiplicado pelas datas de cada
        serviço. A proposta enviada só confirma horários após o aceite do
        responsável.
      </Notice>
      {revisao ? (
        <>
          <Button
            title={salvando ? 'Enviando...' : 'Enviar proposta'}
            disabled={salvando}
            onPress={() => {
              void enviar();
            }}
          />
          <Button
            title="Editar proposta"
            variant="outline"
            disabled={salvando}
            onPress={() => setRevisao(false)}
          />
        </>
      ) : (
        <Button
          title="Revisar proposta"
          disabled={!contexto || !itens.length}
          onPress={() => {
            const e = validar();
            setErro(e);
            if (!e) {
              setRevisao(true);
              setCalendario(null);
            }
          }}
        />
      )}
      {!!erro && !contexto && (
        <Button
          title="Tentar carregar novamente"
          onPress={() => setConsulta((n) => n + 1)}
        />
      )}
    </AppScreenLayout>
  );
}
