export async function prepararCatalogo(client) {
  for (const [nome, descricao] of [
    ['Acompanhamento domiciliar', 'Apoio ao idoso em seu domicílio.'],
    ['Rotina diária', 'Auxílio nas atividades diárias.'],
    ['Companhia', 'Companhia e acompanhamento do idoso.'],
    ['Acompanhamento a exames', 'Acompanhamento em consultas e exames.'],
    ['Cuidados noturnos', 'Acompanhamento durante o período noturno.'],
  ]) {
    await client.query(
      'INSERT INTO "Servico" (nome, descricao, "updatedAt") VALUES ($1, $2, NOW()) ON CONFLICT (nome) WHERE "catalogo" = true DO NOTHING',
      [nome, descricao],
    );
  }
}
