import type { UsuarioAtual } from '../types/auth';

export type TipoHome = 'cuidador' | 'responsavel' | 'idoso';

export type Atendimento = {
  id: number;
  inicio: string;
  ativo: boolean;
  contratacao: {
    status: string;
    idoso: { nome: string };
    cuidadorServico: {
      servico: { nome: string };
      cuidador: { usuario: { nome: string } };
    };
  };
};

export const FUSO = 'America/Sao_Paulo';
const JANELA_FRENTE_MS = 2 * 24 * 60 * 60 * 1000;
const JANELA_ATRAS_MS = 24 * 60 * 60 * 1000;

/**
 * Qual Home mostrar. Mesma regra do tema (`ThemeProvider`): cuidador; idoso
 * com acesso próprio (parentesco PROPRIO); senão, responsável.
 */
export function tipoDaHome(
  usuario: Pick<UsuarioAtual, 'cuidador' | 'responsavel'>,
): TipoHome {
  if (usuario.cuidador) return 'cuidador';
  const proprio = usuario.responsavel?.responsavelIdosos.some(
    (item) => item.parentesco === 'PROPRIO',
  );
  return proprio ? 'idoso' : 'responsavel';
}

/**
 * Contratos aceitos com horário marcado, do mais próximo ao mais distante.
 * `agendados` é só o que está perto (próximos 2 dias e o que começou nas
 * últimas 24 h); o restante fica na Agenda. `proximo` é o primeiro que ainda
 * não começou.
 */
export function agendadosParaHome(dados: Atendimento[], agora: number) {
  const aceitos = dados
    .filter((item) => item.ativo && item.contratacao.status === 'ACEITA')
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const agendados = aceitos.filter((item) => {
    const inicio = Date.parse(item.inicio);
    return (
      inicio >= agora - JANELA_ATRAS_MS && inicio <= agora + JANELA_FRENTE_MS
    );
  });
  const proximo =
    aceitos.find((item) => Date.parse(item.inicio) > agora) ?? null;
  return { agendados, proximo };
}

export function saudacao(hora: number) {
  if (hora < 5) return 'Boa noite,';
  if (hora < 12) return 'Bom dia,';
  if (hora < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

export function horaEmSaoPaulo(data: Date = new Date()) {
  const hora = Number(
    data.toLocaleString('pt-BR', {
      timeZone: FUSO,
      hour: '2-digit',
      hour12: false,
    }),
  );
  return Number.isFinite(hora) ? hora % 24 : 12;
}

const diaCivil = (data: Date) =>
  data.toLocaleDateString('en-CA', { timeZone: FUSO });

/** "Hoje", "Amanhã" ou o dia da semana com a data (ex.: "qua., 12/11"). */
export function rotuloDia(inicio: string, agora: number) {
  const dia = diaCivil(new Date(inicio));
  if (dia === diaCivil(new Date(agora))) return 'Hoje';
  if (dia === diaCivil(new Date(agora + 24 * 60 * 60 * 1000))) return 'Amanhã';
  return new Date(inicio).toLocaleDateString('pt-BR', {
    timeZone: FUSO,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export const formatarHora = (valor: string) =>
  new Date(valor).toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatarDia = (valor: string) =>
  new Date(valor).toLocaleDateString('pt-BR', {
    timeZone: FUSO,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
