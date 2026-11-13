import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agendadosParaHome,
  rotuloDia,
  saudacao,
  tipoDaHome,
} from '../src/utils/home.ts';

const agora = Date.parse('2026-11-11T15:00:00Z'); // 12:00 em São Paulo
const atendimento = (id, inicio, status = 'ACEITA', ativo = true) => ({
  id,
  inicio,
  ativo,
  contratacao: {
    status,
    idoso: { nome: 'Dona Maria' },
    cuidadorServico: {
      servico: { nome: 'Companhia' },
      cuidador: { usuario: { nome: 'Ana' } },
    },
  },
});

test('tipo da Home segue o perfil de quem entrou', () => {
  assert.equal(tipoDaHome({ cuidador: {}, responsavel: null }), 'cuidador');
  assert.equal(
    tipoDaHome({
      cuidador: null,
      responsavel: { responsavelIdosos: [{ parentesco: 'PROPRIO' }] },
    }),
    'idoso',
  );
  assert.equal(
    tipoDaHome({
      cuidador: null,
      responsavel: { responsavelIdosos: [{ parentesco: 'FILHO' }] },
    }),
    'responsavel',
  );
  assert.equal(
    tipoDaHome({ cuidador: null, responsavel: { responsavelIdosos: [] } }),
    'responsavel',
  );
});

test('home mostra só aceitos ativos nos próximos 2 dias, em ordem', () => {
  const { agendados, proximo } = agendadosParaHome(
    [
      atendimento(1, '2026-11-14T15:00:00Z'), // 3 dias: fora
      atendimento(2, '2026-11-12T15:00:00Z'), // amanhã
      atendimento(3, '2026-11-11T18:00:00Z'), // hoje
      atendimento(4, '2026-11-11T20:00:00Z', 'SOLICITADA'), // não aceito
      atendimento(5, '2026-11-11T21:00:00Z', 'ACEITA', false), // inativo
      atendimento(6, '2026-11-10T20:00:00Z'), // começou há 19 h: ainda aparece
      atendimento(7, '2026-11-09T20:00:00Z'), // há mais de 24 h: fora
    ],
    agora,
  );
  assert.deepEqual(
    agendados.map((item) => item.id),
    [6, 3, 2],
  );
  assert.equal(proximo?.id, 3);
});

test('sem atendimentos futuros não há próximo', () => {
  const { agendados, proximo } = agendadosParaHome(
    [atendimento(1, '2026-11-11T10:00:00Z')],
    agora,
  );
  assert.equal(agendados.length, 1);
  assert.equal(proximo, null);
});

test('saudação muda ao longo do dia', () => {
  assert.equal(saudacao(8), 'Bom dia,');
  assert.equal(saudacao(14), 'Boa tarde,');
  assert.equal(saudacao(20), 'Boa noite,');
  assert.equal(saudacao(2), 'Boa noite,');
});

test('rótulo do dia usa Hoje e Amanhã no fuso de São Paulo', () => {
  assert.equal(rotuloDia('2026-11-11T18:00:00Z', agora), 'Hoje');
  assert.equal(rotuloDia('2026-11-12T18:00:00Z', agora), 'Amanhã');
  // 02:00 UTC do dia 12 ainda é noite do dia 11 em São Paulo.
  assert.equal(rotuloDia('2026-11-12T02:00:00Z', agora), 'Hoje');
  assert.match(rotuloDia('2026-11-15T18:00:00Z', agora), /15\/11/);
});
