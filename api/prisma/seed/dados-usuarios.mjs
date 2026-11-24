const nomesFemininos = [
  'Ana',
  'Beatriz',
  'Camila',
  'Daniela',
  'Elisa',
  'Fernanda',
  'Gabriela',
  'Helena',
  'Isabela',
  'Juliana',
  'Larissa',
  'Mariana',
  'Natália',
  'Olívia',
  'Patrícia',
  'Renata',
  'Sabrina',
  'Talita',
  'Valéria',
  'Vitória',
  'Adriana',
  'Bruna',
  'Cecília',
  'Débora',
  'Érica',
];
const nomesMasculinos = [
  'André',
  'Bruno',
  'Caio',
  'Diego',
  'Eduardo',
  'Felipe',
  'Gustavo',
  'Henrique',
  'Igor',
  'João',
  'Leandro',
  'Marcelo',
  'Nicolas',
  'Otávio',
  'Paulo',
  'Rafael',
  'Samuel',
  'Thiago',
  'Vinícius',
  'Vitor',
  'Alexandre',
  'Bernardo',
  'César',
  'Danilo',
  'Emerson',
];
const sobrenomes = [
  'Almeida',
  'Barbosa',
  'Cardoso',
  'Duarte',
  'Esteves',
  'Ferreira',
  'Gomes',
  'Lima',
  'Mendes',
  'Nogueira',
];
const localidades = [
  ['São Paulo', '01001000'],
  ['Campinas', '13010000'],
  ['Santos', '11010000'],
  ['Sorocaba', '18010000'],
  ['São José dos Campos', '12210000'],
  ['Ribeirão Preto', '14010000'],
  ['Jundiaí', '13201000'],
  ['São Bernardo do Campo', '09710000'],
  ['Osasco', '06010000'],
  ['Guarulhos', '07010000'],
];
const especialidades = [
  'apoio à mobilidade e prevenção de quedas',
  'organização da rotina e estímulo à autonomia',
  'companhia, leitura e atividades de memória',
  'acompanhamento em consultas e exames',
  'acolhimento e acompanhamento noturno',
];

export const QUANTIDADE_POR_PERFIL = 50;
export const SENHA_DEMONSTRACAO = 'LacoFicticio2026!';
export const DIAS_UTEIS = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
export const SERVICOS_DEMONSTRACAO = [
  { nome: 'Acompanhamento domiciliar', preco: 160, duracaoMinutos: 240 },
  { nome: 'Rotina diária', preco: 90, duracaoMinutos: 120 },
  { nome: 'Companhia', preco: 60, duracaoMinutos: 120 },
  { nome: 'Acompanhamento a exames', preco: 110, duracaoMinutos: 180 },
  { nome: 'Cuidados noturnos', preco: 280, duracaoMinutos: 480 },
];

// Números sintéticos com dígitos verificadores para passar pela validação do app.
export function cpfFicticio(indice) {
  let cpf = String(970000001 + indice);
  for (const tamanho of [9, 10]) {
    const soma = [...cpf].reduce(
      (total, digito, i) => total + Number(digito) * (tamanho + 1 - i),
      0,
    );
    const digito = (soma * 10) % 11;
    cpf += digito === 10 ? '0' : String(digito);
  }
  return cpf;
}

function nomeFicticio(indice, grupo) {
  const nomes = indice % 2 === 0 ? nomesFemininos : nomesMasculinos;
  return `${nomes[(Math.floor(indice / 2) + grupo * 7) % nomes.length]} ${sobrenomes[(indice + grupo * 3) % sobrenomes.length]} ${sobrenomes[(Math.floor(indice / 10) + grupo + 4) % sobrenomes.length]}`;
}

function nascimento(ano, indice) {
  return `${ano}-${String((indice % 12) + 1).padStart(2, '0')}-${String((indice % 27) + 1).padStart(2, '0')}`;
}

export function dadosUsuario(perfil, indice) {
  if (
    !['cuidador', 'responsavel'].includes(perfil) ||
    !Number.isInteger(indice) ||
    indice < 0 ||
    indice >= QUANTIDADE_POR_PERFIL
  )
    throw new Error('Perfil ou índice de demonstração inválido.');
  const cuidador = perfil === 'cuidador';
  const numero = String(indice + 1).padStart(2, '0');
  const identificador = indice + (cuidador ? 0 : 50);
  const [cidade, cep] = localidades[indice % localidades.length];
  const turno = indice % 3;
  const horarios = [
    ['06:00', '14:00'],
    ['14:00', '22:00'],
    ['00:00', '08:00'],
  ][turno];
  const indicesServicos = turno === 2 ? [2, 3, 4] : [0, 1, 2];
  const anosExperiencia = 2 + (indice % 7);
  const especialidade = especialidades[indice % especialidades.length];
  return {
    perfil,
    numero,
    identificador,
    nome: nomeFicticio(indice, cuidador ? 0 : 1),
    nomeSocial: nomeFicticio(indice, cuidador ? 0 : 1).split(' ')[0],
    email: `${perfil}${numero}@exemplo.test`,
    tipoUsuario: cuidador ? 'CUIDADOR' : 'RESPONSAVEL',
    telefone: String(11900000001 + identificador),
    telefone2: String(11900001001 + identificador),
    cpf: cpfFicticio(identificador),
    dataNascimento: nascimento(
      (cuidador ? 1973 : 1970) + (indice % (cuidador ? 27 : 20)),
      indice,
    ),
    endereco: {
      rua: `Rua Fictícia das ${['Acácias', 'Flores', 'Palmeiras', 'Oliveiras', 'Hortênsias'][indice % 5]}`,
      numero: String(100 + identificador * 3),
      complemento: `Apartamento ${identificador + 1} - endereço de demonstração`,
      bairro: `Jardim Exemplo ${(indice % 5) + 1}`,
      cidade,
      estado: 'SP',
      cep,
    },
    fotoArquivo: `${perfil}${numero}.jpg`,
    biografia: `Perfil fictício para demonstração. Atendimento humanizado em ${cidade}, com foco em ${especialidade}. Valorizo a escuta, o respeito e a comunicação com a família.`,
    experienciaProfissional: `${anosExperiencia} anos de experiência fictícia em cuidados domiciliares e em instituição de longa permanência. Atuação em ${especialidade}, apoio nas atividades diárias e registro da rotina.`,
    registroProfissional: `DEMO-CUID-${numero}`,
    anosExperiencia,
    especialidade,
    horarios,
    ofertas: indicesServicos.map((i) => ({
      ...SERVICOS_DEMONSTRACAO[i],
      preco: SERVICOS_DEMONSTRACAO[i].preco + (indice % 10) * 5,
    })),
    idoso: {
      nome: nomeFicticio(indice, 2),
      cpf: cpfFicticio(100 + indice),
      dataNascimento: nascimento(1938 + (indice % 18), indice),
      sexo: indice % 2 === 0 ? 'Feminino' : 'Masculino',
      telefone: String(11900002001 + indice),
      parentesco: indice % 2 === 0 ? 'FILHA' : 'FILHO',
      observacoes:
        'Pessoa e histórico inteiramente fictícios, cadastrados para testes do Laço. Gosta de música, leitura e caminhadas acompanhadas.',
      necessidadesEspeciais: [
        'Apoio leve à mobilidade e acompanhamento em caminhadas.',
        'Companhia e lembretes da rotina diária.',
        'Acompanhamento em consultas e atividades externas.',
        'Apoio às atividades diárias e estímulo à autonomia.',
        'Supervisão da rotina e prevenção de quedas.',
      ][indice % 5],
    },
  };
}

// PDF de uma página, com fontes padrão e codificação WinAnsi (acentos em português).
// Mantém o seed executável apenas com as dependências que a API já utiliza.
export function criarCurriculo(dados, ano = new Date().getUTCFullYear()) {
  const comandos = [];
  let y = 790;
  const escapar = (texto) =>
    texto
      .replaceAll('\\', '\\\\')
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)');
  function linha(texto, tamanho = 11, negrito = false, cor = '0.18 0.22 0.24') {
    comandos.push(
      `BT /${negrito ? 'F2' : 'F1'} ${tamanho} Tf ${cor} rg 1 0 0 1 48 ${y} Tm (${escapar(texto)}) Tj ET`,
    );
    y -= tamanho + 7;
  }
  function paragrafo(texto) {
    let atual = '';
    for (const palavra of texto.split(/\s+/)) {
      if ((atual + ' ' + palavra).trim().length > 85) {
        linha(atual);
        atual = palavra;
      } else atual = (atual + ' ' + palavra).trim();
    }
    if (atual) linha(atual);
    y -= 6;
  }
  function secao(titulo, texto) {
    y -= 8;
    linha(titulo, 13, true, '0.08 0.36 0.34');
    paragrafo(texto);
  }
  linha('CURRÍCULO PROFISSIONAL', 12, true, '0.08 0.36 0.34');
  linha(dados.nome, 22, true);
  linha(`${dados.endereco.cidade} / SP | ${dados.telefone}`);
  linha(dados.email);
  y -= 8;
  secao(
    'OBJETIVO',
    'Atuar como cuidador de pessoas idosas, oferecendo apoio à rotina e acompanhamento com respeito, atenção e acolhimento.',
  );
  secao('RESUMO PROFISSIONAL', dados.experienciaProfissional);
  secao(
    'EXPERIÊNCIA PROFISSIONAL',
    `Cuidados domiciliares - Família Exemplo ${dados.numero} (fictícia). ${ano - dados.anosExperiencia} a ${ano}. Apoio à higiene e alimentação, companhia e comunicação da rotina aos familiares.`,
  );
  secao(
    'FORMAÇÃO',
    `Curso de Cuidador de Pessoas Idosas - Instituto Fictício Acolher. Conclusão: ${ano - dados.anosExperiencia}. Carga horária de demonstração: 160 horas.`,
  );
  secao(
    'CURSOS COMPLEMENTARES',
    'Primeiros socorros básicos (20h); prevenção de quedas (16h); comunicação e acolhimento da pessoa idosa (24h). Instituições e certificados fictícios.',
  );
  secao(
    'SERVIÇOS E DISPONIBILIDADE',
    `${dados.ofertas.map((oferta) => oferta.nome).join('; ')}. Segunda a sexta-feira, das ${dados.horarios[0]} às ${dados.horarios[1]}.`,
  );
  if (y < 88) throw new Error(`Currículo excedeu uma página: ${dados.email}`);
  y = 58;
  linha(
    'DEMONSTRAÇÃO: pessoa, experiência, cursos e contatos inteiramente fictícios.',
    9,
  );
  const stream = comandos.join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objetos.forEach((objeto, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
