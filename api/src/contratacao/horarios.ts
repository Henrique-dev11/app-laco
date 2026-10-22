export const FUSO = 'America/Sao_Paulo';
export const DIAS = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
] as const;
const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export function partesLocais(data: Date) {
  const p = Object.fromEntries(
    formatador.formatToParts(data).map((p) => [p.type, p.value]),
  );
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
  };
}
export function instanteLocal(data: string, minutos: number) {
  const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  const base = Date.parse(`${data}T${hora}:00Z`);
  let instante = base;
  for (let i = 0; i < 3; i++) {
    const local = partesLocais(new Date(instante));
    instante += base - Date.parse(`${local.data}T${local.hora}:00Z`);
  }
  const final = partesLocais(new Date(instante));
  return final.data === data && final.hora === hora ? new Date(instante) : null;
}
const minutosHora = (data: Date) =>
  data.getUTCHours() * 60 + data.getUTCMinutes();
export function calcularHorarios(
  mes: string,
  duracao: number,
  disponibilidade: { diaSemana: string; horaInicio: Date; horaFim: Date }[],
  ocupados: { inicio: Date; fim: Date }[],
  agora = new Date(),
) {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, numeroMes, 0)).getUTCDate();
  const datas: {
    data: string;
    horarios: {
      inicio: string;
      fim: string;
      horaInicio: string;
      horaFim: string;
    }[];
  }[] = [];
  for (let dia = 1; dia <= ultimo; dia++) {
    const data = `${mes}-${String(dia).padStart(2, '0')}`;
    const semana = DIAS[new Date(`${data}T12:00:00Z`).getUTCDay()];
    const horarios = new Map<
      string,
      { inicio: string; fim: string; horaInicio: string; horaFim: string }
    >();
    for (const janela of disponibilidade.filter(
      (d) => d.diaSemana === semana,
    )) {
      for (
        let minuto = minutosHora(janela.horaInicio);
        minuto + duracao <= minutosHora(janela.horaFim);
        minuto += 15
      ) {
        const inicio = instanteLocal(data, minuto);
        if (!inicio || inicio <= agora) continue;
        const fim = new Date(inicio.getTime() + duracao * 60000);
        const localFim = partesLocais(fim);
        if (localFim.data !== data) continue;
        // O limite é hora local; Date no banco de disponibilidade representa apenas HH:MM.
        const fimMinutos =
          Number(localFim.hora.slice(0, 2)) * 60 +
          Number(localFim.hora.slice(3));
        if (fimMinutos > minutosHora(janela.horaFim)) continue;
        if (ocupados.some((a) => inicio < a.fim && fim > a.inicio)) continue;
        horarios.set(inicio.toISOString(), {
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          horaInicio: partesLocais(inicio).hora,
          horaFim: localFim.hora,
        });
      }
    }
    if (horarios.size)
      datas.push({
        data,
        horarios: [...horarios.values()].sort((a, b) =>
          a.inicio.localeCompare(b.inicio),
        ),
      });
  }
  return datas;
}
