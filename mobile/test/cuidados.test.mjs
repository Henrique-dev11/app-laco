import test from 'node:test';
import assert from 'node:assert/strict';
import { proximoCuidado } from '../src/utils/cuidados.ts';
const agora = Date.parse('2026-10-25T15:00:00Z');
const contrato = (id, status = 'ACEITA', agendamento = null, idosoId = 3) => ({
  id,
  status,
  nomeServico: 'Companhia',
  idoso: { id: idosoId },
  agendamento,
  cuidadorServico: {
    cuidador: {
      usuario: {
        id: 10 + id,
        nome: `Cuidador ${id}`,
        nomeSocial: null,
        foto: { updatedAt: '2026-10-24T12:00:00Z' },
      },
    },
  },
});
const horario = (inicio, fim, ativo = true) => ({ inicio, fim, ativo });
test('meu cuidado não mostra contratações de outro idoso ou ainda não confirmadas', () => {
  assert.equal(
    proximoCuidado(
      [
        contrato(1, 'SOLICITADA'),
        contrato(2, 'CANCELADA'),
        contrato(3, 'RECUSADA'),
        contrato(4, 'CONCLUIDA'),
        contrato(5, 'ACEITA', null, 8),
      ],
      3,
      agora,
    ),
    null,
  );
});
test('prioriza o cuidador em atendimento e depois o mais próximo', () => {
  const ativo = contrato(
    3,
    'ACEITA',
    horario('2026-10-25T14:00:00Z', '2026-10-25T16:00:00Z'),
  );
  const proximo = contrato(
    2,
    'ACEITA',
    horario('2026-10-26T14:00:00Z', '2026-10-26T16:00:00Z'),
  );
  const distante = contrato(
    1,
    'ACEITA',
    horario('2026-10-30T14:00:00Z', '2026-10-30T16:00:00Z'),
  );
  assert.equal(proximoCuidado([distante, proximo, ativo], 3, agora), ativo);
  assert.equal(proximoCuidado([distante, proximo], 3, agora), proximo);
});
test('não apresenta cuidador de atendimento encerrado, cancelado ou com horário inválido', () => {
  assert.equal(
    proximoCuidado(
      [
        contrato(
          1,
          'ACEITA',
          horario('2026-10-25T12:00:00Z', '2026-10-25T14:00:00Z'),
        ),
        contrato(
          2,
          'ACEITA',
          horario('2026-10-26T12:00:00Z', '2026-10-26T14:00:00Z', false),
        ),
        contrato(3, 'ACEITA', horario('inválido', 'inválido')),
        contrato(
          4,
          'ACEITA',
          horario('2026-10-25T14:00:00Z', '2026-10-25T15:00:00Z'),
        ),
      ],
      3,
      agora,
    ),
    null,
  );
});
test('mostra serviço confirmado sem horário quando ainda precisa agendar', () => {
  const confirmado = contrato(1);
  assert.equal(
    proximoCuidado([contrato(2, 'SOLICITADA'), confirmado], 3, agora),
    confirmado,
  );
});
test('atendimento marcado tem prioridade sobre serviço sem agendamento', () => {
  const marcado = contrato(
    2,
    'ACEITA',
    horario('2026-10-26T12:00:00Z', '2026-10-26T14:00:00Z'),
  );
  assert.equal(proximoCuidado([contrato(1), marcado], 3, agora), marcado);
});
test('preserva identificação e foto do cuidador sem mudar a lista recebida', () => {
  const lista = [contrato(5), contrato(1)];
  const cuidado = proximoCuidado(lista, 3, agora);
  assert.deepEqual(
    lista.map((item) => item.id),
    [5, 1],
  );
  assert.equal(cuidado.cuidadorServico.cuidador.usuario.nome, 'Cuidador 1');
  assert.ok(cuidado.cuidadorServico.cuidador.usuario.foto.updatedAt);
  assert.equal(proximoCuidado([], 3, agora), null);
});
