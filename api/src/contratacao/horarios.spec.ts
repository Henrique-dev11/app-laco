import { calcularHorarios, instanteLocal, partesLocais } from './horarios.js';
const hora = (v: string) => new Date(`1970-01-01T${v}:00Z`);
const janela = (inicio = '08:00', fim = '12:00') => ({
  diaSemana: 'SEGUNDA',
  horaInicio: hora(inicio),
  horaFim: hora(fim),
});
describe('horários livres no fuso de São Paulo', () => {
  it('limita um atendimento de quatro horas ao início da janela', () => {
    const dias = calcularHorarios(
      '2027-02',
      240,
      [janela()],
      [],
      new Date('2027-01-01T00:00:00Z'),
    );
    expect(
      dias
        .find((d) => d.data === '2027-02-01')!
        .horarios.map((h) => h.horaInicio),
    ).toEqual(['08:00']);
    expect(
      dias.every((d) => new Date(`${d.data}T12:00Z`).getUTCDay() === 1),
    ).toBe(true);
  });
  it('considera várias janelas, conflitos e limites sem sobreposição nas bordas', () => {
    const dias = calcularHorarios(
      '2027-02',
      60,
      [janela(), janela('13:00', '17:00')],
      [
        {
          inicio: new Date('2027-02-01T09:00:00-03:00'),
          fim: new Date('2027-02-01T10:00:00-03:00'),
        },
      ],
      new Date('2027-01-01T00:00Z'),
    );
    const h = dias[0].horarios.map((h) => h.horaInicio);
    expect(h).toContain('08:00');
    expect(h).toContain('10:00');
    expect(h).toContain('13:00');
    expect(h).not.toContain('08:15');
    expect(h).not.toContain('09:00');
    expect(h).not.toContain('11:15');
  });
  it('não oferece horários passados e retorna instantes com fuso explícito', () => {
    const dias = calcularHorarios(
      '2027-02',
      60,
      [janela()],
      [],
      new Date('2027-02-01T10:00:00-03:00'),
    );
    expect(dias[0].horarios[0].horaInicio).toBe('10:15');
    expect(dias[0].horarios[0].inicio).toBe('2027-02-01T13:15:00.000Z');
    expect(partesLocais(new Date('2027-02-02T01:00:00Z')).data).toBe(
      '2027-02-01',
    );
    expect(instanteLocal('2027-02-01', 480)?.toISOString()).toBe(
      '2027-02-01T11:00:00.000Z',
    );
  });
});
