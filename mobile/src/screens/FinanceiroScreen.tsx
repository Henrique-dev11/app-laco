import {
  ConfirmacaoFinanceira,
  GraficoBarras,
  SaldoCarteira,
} from '../components/CartoesCarteira';
import { useConsultaApi } from '../hooks/useConsultaApi';
import { useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { AvaliarCuidador } from '../components/AvaliarCuidador';
import { Button } from '../components/Button';
import { CodigoDestaque } from '../components/CodigoDestaque';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { useAuth } from '../contexts/AuthContext';
import { useListaApi } from '../hooks/useListaApi';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { api, mensagemErro } from '../services/api';
import { useAppStyles } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';

type Metodo = 'PIX' | 'CARTAO' | 'OUTRO';

type Movimento = {
  metodo?: Metodo;
  id: number;
  valor: string;
  tipo: string;
  status: string;
  descricao: string;
  createdAt: string;
};
type Pagamento = {
  metodo?: Metodo;
  id: number;
  contratacaoId: number;
  status: string;
  bruto: string;
  comissao: string;
  liquido: string;
  createdAt: string;
  movimentos: Movimento[];
  contratacao?: { nomeServico: string };
  motivoContestacao?: string;
  motivoResolucao?: string;
  inicioEm?: string;
  fimEm?: string;
  validacaoEm?: string;
};
type Visita = {
  id: number;
  etapa: string;
  agendado: boolean;
  origemProposta?: boolean;
  avaliacao?: { nota: number } | null;
  avaliadoNome?: string | null;
  total: string;
  pagamento: Pagamento | null;
  contratos: {
    id: number;
    nomeServico: string;
    agendamento?: { inicio: string } | null;
  }[];
};
type Carteira = {
  liberacoes: { dia: string; valor: string }[];
  disponivel: string;
  pendente: string;
  recebido: string;
  sacado: string;
  movimentos: Movimento[];
};

const metodos = { PIX: 'Pix', CARTAO: 'Cartão', OUTRO: 'Outro método' };

function SelecionarMetodo({
  titulo,
  valor,
  opcoes,
  selecionar,
  desativado,
}: {
  titulo: string;
  valor: Metodo;
  opcoes: Metodo[];
  selecionar: (metodo: Metodo) => void;
  desativado: boolean;
}) {
  const styles = useAppStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.section}>{titulo}</Text>
      <View style={styles.row}>
        {opcoes.map((metodo) => (
          <Button
            key={metodo}
            title={metodos[metodo]}
            compacto
            selected={valor === metodo}
            variant={valor === metodo ? 'filled' : 'outline'}
            onPress={() => selecionar(metodo)}
            disabled={desativado}
          />
        ))}
      </View>
    </View>
  );
}

const moeda = (valor: string) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const local = (valor: string) =>
  new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const situacoes: Record<string, string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em atendimento',
  AGUARDANDO_VALIDACAO: 'Em validação',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  RECUSADO: 'Recusado',
  RETIDO: 'Retido em garantia',
  LIBERADO: 'Liberado',
  REEMBOLSADO: 'Reembolsado',
  EM_CONTESTACAO: 'Em contestação',
};
const nomesMovimentos: Record<string, string> = {
  RETENCAO: 'Pagamento em garantia',
  LIBERACAO: 'Valor liberado',
  REEMBOLSO: 'Reembolso',
  SAQUE: 'Saque concluído',
};

function Comprovante({ pagamento }: { pagamento: Pagamento }) {
  const styles = useAppStyles();
  const retencao = pagamento.movimentos.find((m) => m.tipo === 'RETENCAO');
  return (
    <View style={styles.card}>
      <Text style={styles.name}>
        {pagamento.contratacao?.nomeServico?.replace(
          /\s*\((?:TCC|DEMO)\)/gi,
          '',
        ) ?? 'Resumo do pagamento'}
      </Text>
      <Text style={styles.text}>
        Pagamento #{pagamento.id} · {situacoes[pagamento.status]}
      </Text>
      <Text style={styles.text}>
        Total {moeda(pagamento.bruto)} · Comissão {moeda(pagamento.comissao)} ·
        Líquido {moeda(pagamento.liquido)}
      </Text>
      {pagamento.status !== 'PENDENTE' && pagamento.metodo && (
        <Text style={styles.text}>
          Forma de pagamento · {metodos[pagamento.metodo]}
        </Text>
      )}
      {retencao && (
        <Text selectable style={styles.text}>
          Comprovante #{retencao.id} · {local(retencao.createdAt)} ·{' '}
          {moeda(retencao.valor)}
        </Text>
      )}
      {!!pagamento.motivoContestacao && (
        <Text style={styles.text}>
          Contestação: {pagamento.motivoContestacao}
        </Text>
      )}
      {!!pagamento.motivoResolucao && (
        <Text style={styles.text}>Resolução: {pagamento.motivoResolucao}</Text>
      )}
    </View>
  );
}

export function VisitaFinanceiraScreen({
  route,
  navigation,
}: ScreenProps<'VisitaFinanceira'>) {
  const styles = useAppStyles();
  const { usuario } = useAuth();
  const id = route.params.contratacaoId;
  const url = '/financeiro/visitas/' + id;
  const consulta = useConsultaApi<Visita>(url, 15000);
  const visita = consulta.dados;
  const carregar = consulta.atualizar;
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [metodo, setMetodo] = useState<Metodo>('PIX');
  const [avaliando, setAvaliando] = useState(false);
  const [avaliouAgora, setAvaliouAgora] = useState(false);
  const [qr, setQr] = useState<string>();
  const [codigo, setCodigo] = useState('');
  const [emitido, setEmitido] = useState<{
    codigo: string;
    expiraEm: string;
  }>();
  const [motivo, setMotivo] = useState('');
  const emCurso = useRef(false);
  async function executar(acao: () => Promise<void>) {
    if (emCurso.current) return;
    emCurso.current = true;
    setOcupado(true);
    setErro('');
    setSucesso('');
    try {
      await acao();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
      emCurso.current = false;
    }
  }
  const post = (sufixo: string, corpo?: object) =>
    executar(async () => {
      const { data } = await api.post<Visita | Pagamento>(url + sufixo, corpo);
      if (sufixo === '/pagar' && 'status' in data && data.status === 'RETIDO')
        setSucesso('Pagamento confirmado');
      if (
        sufixo === '/validar' &&
        'pagamento' in data &&
        data.pagamento?.status === 'LIBERADO'
      )
        setSucesso('Valor liberado');
      setCodigo('');
      setEmitido(undefined);
      setQr(undefined);
      await carregar();
    });
  const etapa =
    visita?.etapa === 'AGENDADO'
      ? 'INICIO'
      : visita?.etapa === 'AGUARDANDO_VALIDACAO'
        ? 'FIM'
        : null;
  const retido = visita?.pagamento?.status === 'RETIDO';
  const passos = [
    'Solicitado',
    'Aceito',
    'Pago',
    'Agendado',
    'Em atendimento',
    'Em validação',
    'Concluído',
  ];
  const etapas = [
    'PENDENTE',
    'AGUARDANDO_PAGAMENTO',
    'ACEITO',
    'AGENDADO',
    'EM_ANDAMENTO',
    'AGUARDANDO_VALIDACAO',
    'CONCLUIDO',
  ];
  const atual = etapas.indexOf(visita?.etapa ?? '');
  return (
    <AppScreenLayout
      title="Acompanhar atendimento"
      formulario
      atualizacao={consulta}
    >
      {!visita && !erro && !consulta.erro && (
        <Notice>Carregando atendimento...</Notice>
      )}
      {!!(erro || consulta.erro) && <Notice>{erro || consulta.erro}</Notice>}
      {!!sucesso && <ConfirmacaoFinanceira titulo={sucesso} />}
      {visita && (
        <>
          <View style={styles.card}>
            <Text style={styles.name}>{situacoes[visita.etapa]}</Text>
            <Text style={styles.text}>
              Total da visita {moeda(visita.total)}
            </Text>
            <Text style={styles.text}>
              {visita.contratos
                .map((c) => c.nomeServico.replace(/\s*\((?:TCC|DEMO)\)/gi, ''))
                .join(' + ')}
            </Text>
            {!!visita.contratos[0]?.agendamento && (
              <Text style={styles.text}>
                {local(visita.contratos[0].agendamento.inicio)}
              </Text>
            )}
            {atual >= 0 &&
              passos.map((passo, i) => (
                <Text
                  key={passo}
                  style={i === atual ? styles.name : styles.text}
                >
                  {i === atual ? 'Etapa atual · ' : i < atual ? '✓ ' : ''}
                  {passo}
                </Text>
              ))}
          </View>
          {visita.pagamento && <Comprovante pagamento={visita.pagamento} />}
          {visita.pagamento?.inicioEm && (
            <Text style={styles.text}>
              Início registrado em {local(visita.pagamento.inicioEm)}
            </Text>
          )}
          {visita.pagamento?.fimEm && (
            <Text style={styles.text}>
              Conclusão registrada em {local(visita.pagamento.fimEm)}
            </Text>
          )}
          {usuario?.responsavel && visita.etapa === 'AGUARDANDO_PAGAMENTO' && (
            <>
              <SelecionarMetodo
                titulo="Forma de pagamento"
                valor={metodo}
                opcoes={['PIX', 'CARTAO']}
                selecionar={setMetodo}
                desativado={ocupado}
              />
              {metodo === 'PIX' && !qr && (
                <Button
                  title="Ver QR Code"
                  disabled={ocupado}
                  onPress={() =>
                    void executar(async () => {
                      const { data } = await api.post<{ imagem: string }>(
                        url + '/qr',
                      );
                      setQr(data.imagem);
                      await carregar();
                    })
                  }
                />
              )}
              {metodo === 'PIX' && !!qr && (
                <Image
                  source={{ uri: qr }}
                  accessibilityLabel="QR Code de pagamento virtual"
                  style={{ width: 176, height: 176, alignSelf: 'center' }}
                />
              )}
              {(metodo === 'CARTAO' || qr) && (
                <Button
                  title={`Confirmar pagamento virtual de ${moeda(visita.total)} via ${metodos[metodo]}`}
                  disabled={ocupado}
                  onPress={() => void post('/pagar', { metodo })}
                />
              )}
            </>
          )}
          {usuario?.responsavel &&
            visita.etapa === 'ACEITO' &&
            retido &&
            !visita.agendado &&
            !visita.origemProposta && (
              <Button
                title="Agendar atendimento"
                onPress={() =>
                  navigation.navigate('AgendarAtendimento', {
                    contratacaoId: visita.id,
                  })
                }
              />
            )}
          {etapa && usuario?.responsavel && (
            <>
              {emitido &&
                emitido.codigo.startsWith(etapa === 'INICIO' ? 'I' : 'F') && (
                  <CodigoDestaque codigo={emitido.codigo} etapa={etapa} expiraEm={emitido.expiraEm} />
                )}
              <Button
                title={
                  etapa === 'INICIO'
                    ? 'Gerar código de início'
                    : 'Gerar código de conclusão'
                }
                disabled={ocupado}
                onPress={() =>
                  void executar(async () =>
                    setEmitido(
                      (await api.post(url + '/codigo', { etapa })).data,
                    ),
                  )
                }
              />
            </>
          )}
          {etapa && usuario?.cuidador && (
            <>
              <FormField
                label={
                  etapa === 'INICIO'
                    ? 'Código de início'
                    : 'Código de conclusão'
                }
                value={codigo}
                maxLength={7}
                autoCapitalize="characters"
                onChangeText={(valor) => setCodigo(valor.toUpperCase())}
              />
              <Button
                title={
                  etapa === 'INICIO'
                    ? 'Validar e iniciar atendimento'
                    : 'Validar e liberar valor'
                }
                disabled={ocupado || codigo.length !== 7}
                onPress={() => void post('/validar', { etapa, codigo })}
              />
            </>
          )}
          {usuario?.cuidador && visita.etapa === 'EM_ANDAMENTO' && (
            <Button
              title="Solicitar confirmação da conclusão"
              disabled={ocupado}
              onPress={() => void post('/acao', { acao: 'FINALIZAR' })}
            />
          )}
          {['PENDENTE', 'AGUARDANDO_PAGAMENTO', 'ACEITO', 'AGENDADO'].includes(
            visita.etapa,
          ) && (
            <Button
              title={
                retido
                  ? 'Cancelar visita e reembolsar valor'
                  : 'Cancelar visita'
              }
              variant="outline"
              disabled={ocupado}
              onPress={() => void post('/acao', { acao: 'CANCELAR' })}
            />
          )}
          {retido && (
            <>
              <FormField
                label="Motivo da contestação"
                value={motivo}
                maxLength={1000}
                multiline
                onChangeText={setMotivo}
              />
              <Button
                title="Abrir contestação"
                variant="outline"
                disabled={ocupado || !motivo.trim()}
                onPress={() =>
                  void post('/acao', { acao: 'CONTESTAR', motivo })
                }
              />
            </>
          )}
          {visita.etapa === 'EM_CONTESTACAO' && (
            <Notice>
              O valor fica retido até a decisão da administração. Em emergência,
              acione o serviço de emergência local.
            </Notice>
          )}
          {visita.etapa === 'CONCLUIDO' &&
            !!visita.avaliadoNome &&
            (visita.avaliacao || avaliouAgora ? (
              <Notice>Avaliação enviada.</Notice>
            ) : (
              <Button
                title={
                  usuario?.cuidador ? 'Avaliar responsável' : 'Avaliar cuidador'
                }
                onPress={() => setAvaliando(true)}
              />
            ))}
          {visita.etapa === 'CONCLUIDO' && (
            <AvaliarCuidador
              contratacaoId={avaliando ? visita.id : null}
              avaliadoNome={visita.avaliadoNome ?? ''}
              onClose={() => setAvaliando(false)}
              onEnviada={() => {
                setAvaliando(false);
                setAvaliouAgora(true);
                void carregar();
              }}
            />
          )}
        </>
      )}
    </AppScreenLayout>
  );
}

export function HistoricoFinanceiroScreen({
  navigation,
}: ScreenProps<'HistoricoFinanceiro'>) {
  const { usuario } = useAuth();
  const pagamentos = useListaApi<Pagamento>('/financeiro/pagamentos');
  return (
    <AppScreenLayout title="Histórico de pagamentos" atualizacao={pagamentos}>
      {usuario?.cuidador && (
        <Button
          title="Abrir carteira virtual"
          onPress={() => navigation.navigate('CarteiraVirtual')}
        />
      )}
      {pagamentos.carregando && <Notice>Carregando pagamentos...</Notice>}
      {!!pagamentos.erro && <Notice>{pagamentos.erro}</Notice>}
      {!pagamentos.erro &&
        !pagamentos.carregando &&
        !pagamentos.dados.length && (
          <Notice>Nenhum pagamento registrado.</Notice>
        )}
      {pagamentos.dados.map((p) => (
        <View key={p.id}>
          <Comprovante pagamento={p} />
          <Button
            title={`Ver atendimento #${p.contratacaoId}`}
            variant="outline"
            onPress={() =>
              navigation.navigate('VisitaFinanceira', {
                contratacaoId: p.contratacaoId,
              })
            }
          />
        </View>
      ))}
    </AppScreenLayout>
  );
}

export function CarteiraVirtualScreen() {
  const styles = useAppStyles();
  const [dias, setDias] = useState(30);
  const consulta = useConsultaApi<Carteira>(
    '/financeiro/carteira?dias=' + dias,
    0,
    true,
  );
  const carteira = consulta.dados;
  const carregar = consulta.atualizar;
  const [erro, setErro] = useState('');
  const [valor, setValor] = useState('');
  const [metodo, setMetodo] = useState<Metodo>('PIX');
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const referencia = useRef<string | undefined>(undefined);
  const emCurso = useRef(false);
  async function sacar() {
    if (emCurso.current) return;
    emCurso.current = true;
    setOcupado(true);
    setErro('');
    try {
      referencia.current ??= (
        await api.post<{ referencia: string }>(
          '/financeiro/carteira/referencia',
        )
      ).data.referencia;
      await api.post('/financeiro/carteira/saques', {
        valor,
        metodo,
        referencia: referencia.current,
      });
      referencia.current = undefined;
      setValor('');
      setConfirmando(false);
      await carregar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
      emCurso.current = false;
    }
  }
  return (
    <AppScreenLayout title="Carteira virtual" formulario atualizacao={consulta}>
      {!!erro && <Notice>{erro}</Notice>}
      {!!consulta.erro && <Notice>{consulta.erro}</Notice>}
      {!carteira && !erro && !consulta.erro && (
        <Notice>Carregando carteira...</Notice>
      )}
      {carteira && (
        <>
          <SaldoCarteira
            disponivel={carteira.disponivel}
            pendente={carteira.pendente}
          />
          <View style={styles.row}>
            <View style={[styles.card, { flexGrow: 1 }]}>
              <Text style={styles.text}>Total recebido</Text>
              <Text style={styles.name}>{moeda(carteira.recebido)}</Text>
            </View>
            <View style={[styles.card, { flexGrow: 1 }]}>
              <Text style={styles.text}>Total sacado</Text>
              <Text style={styles.name}>{moeda(carteira.sacado)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            {[7, 30, 90].map((periodo) => (
              <Button
                key={periodo}
                compacto
                title={`${periodo} dias`}
                selected={dias === periodo}
                variant={dias === periodo ? 'filled' : 'outline'}
                onPress={() => setDias(periodo)}
              />
            ))}
          </View>
          <GraficoBarras
            key={carteira.liberacoes?.length ?? 0}
            titulo="Valores liberados"
            unidade="créditos"
            pontos={(carteira.liberacoes ?? []).map(({ dia, valor }) => ({
              rotulo: dia.slice(8) + '/' + dia.slice(5, 7),
              valor: Number(valor),
            }))}
            formatar={(valor) => moeda(String(valor))}
          />
          <FormField
            label="Valor do saque em reais"
            value={valor}
            keyboardType="decimal-pad"
            editable={!confirmando}
            onChangeText={setValor}
          />
          <SelecionarMetodo
            titulo="Forma de recebimento"
            valor={metodo}
            opcoes={['PIX', 'CARTAO', 'OUTRO']}
            selecionar={setMetodo}
            desativado={confirmando}
          />
          {confirmando ? (
            <>
              <Button
                title={`Confirmar saque virtual de ${moeda(valor.replace(',', '.'))} via ${metodos[metodo]}`}
                disabled={ocupado}
                onPress={() => void sacar()}
              />
              <Button
                title="Editar valor ou método"
                variant="outline"
                disabled={ocupado}
                onPress={() => {
                  setConfirmando(false);
                  referencia.current = undefined;
                }}
              />
            </>
          ) : (
            <Button
              title="Revisar saque"
              disabled={
                !/^\d{1,12}([,.]\d{1,2})?$/.test(valor) ||
                Number(valor.replace(',', '.')) <= 0
              }
              onPress={() => setConfirmando(true)}
            />
          )}
          <Text style={styles.section}>Movimentações</Text>
          {!carteira.movimentos.length && (
            <Notice>Nenhuma movimentação.</Notice>
          )}
          {carteira.movimentos.map((m) => (
            <View style={styles.card} key={m.id}>
              <Text style={styles.name}>
                {nomesMovimentos[m.tipo] ?? m.tipo}
              </Text>
              <Text style={styles.text}>
                #{m.id} · {moeda(m.valor)} · {local(m.createdAt)} · {m.status}
                {m.tipo === 'SAQUE' && m.metodo
                  ? ` · ${metodos[m.metodo]}`
                  : ''}
              </Text>
            </View>
          ))}
        </>
      )}
    </AppScreenLayout>
  );
}
