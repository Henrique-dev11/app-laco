export type CuidadoContratado = {
  id: number;
  status: string;
  nomeServico: string;
  idoso: { id: number };
  agendamento: { inicio: string; fim: string; ativo: boolean } | null;
  cuidadorServico: {
    cuidador: {
      usuario: {
        id: number;
        nome: string;
        nomeSocial?: string | null;
        foto?: { updatedAt: string } | null;
      };
    };
  };
};

/** Primeiro o atendimento em andamento, depois o próximo e os aceitos sem horário. */
export function proximoCuidado(
  contratos: CuidadoContratado[],
  idosoId: number,
  agora = Date.now(),
) {
  return (
    contratos
      .filter((contrato) => {
        if (contrato.idoso.id !== idosoId || contrato.status !== 'ACEITA')
          return false;
        const horario = contrato.agendamento;
        return (
          !horario ||
          (horario.ativo &&
            Number.isFinite(Date.parse(horario.inicio)) &&
            Date.parse(horario.fim) > agora)
        );
      })
      .sort((a, b) => {
        const prioridade = (c: CuidadoContratado) =>
          !c.agendamento
            ? Infinity
            : Math.max(0, Date.parse(c.agendamento.inicio) - agora);
        return prioridade(a) - prioridade(b) || a.id - b.id;
      })[0] ?? null
  );
}
