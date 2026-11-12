import type { Prisma } from '../generated/prisma/client.js';

/** Só os metadados entram nas consultas; o arquivo passa por uma rota autenticada. */
export const incluirFotoIdoso = {
  endereco: true,
  foto: { select: { updatedAt: true } },
  responsavelIdosos: {
    where: { parentesco: 'PROPRIO' },
    select: {
      responsavel: {
        select: {
          telefone: true,
          cpf: true,
          dataNascimento: true,
          endereco: true,
          usuario: {
            select: {
              nome: true,
              nomeSocial: true,
              foto: { select: { updatedAt: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.IdosoInclude;

export function apresentarIdoso(
  idoso: Prisma.IdosoGetPayload<{ include: typeof incluirFotoIdoso }>,
) {
  const { responsavelIdosos, ...dados } = idoso;
  const proprio = responsavelIdosos[0];
  if (!proprio) return dados;
  const responsavel = proprio.responsavel;
  return {
    ...dados,
    nome: responsavel.usuario.nome,
    nomeSocial: responsavel.usuario.nomeSocial,
    cpf: responsavel.cpf,
    telefone: responsavel.telefone,
    dataNascimento: responsavel.dataNascimento,
    endereco: responsavel.endereco,
    foto: responsavel.usuario.foto,
  };
}
