import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAvaliacaoDto } from './create-avaliacao.dto.js';

const erros = async (corpo: object) =>
  (await validate(plainToInstance(CreateAvaliacaoDto, corpo))).length;

describe('CreateAvaliacaoDto', () => {
  it('aceita notas de 1 a 5, com ou sem comentário', async () => {
    for (const nota of [1, 2, 3, 4, 5]) expect(await erros({ nota })).toBe(0);
    expect(await erros({ nota: 5, comentario: 'ótimo' })).toBe(0);
  });

  it('rejeita nota fora do intervalo, decimal ou texto', async () => {
    for (const nota of [0, 6, -1, 4.5, '5', null, undefined])
      expect(await erros({ nota })).toBeGreaterThan(0);
  });

  it('rejeita comentário acima de 1000 caracteres', async () => {
    expect(await erros({ nota: 5, comentario: 'a'.repeat(1001) })).toBeGreaterThan(0);
  });
});
