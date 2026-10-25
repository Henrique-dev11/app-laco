import type { Endereco, Idoso, UsuarioAtual } from '../types/auth';

export function dadosIdosoFormulario(idoso?: Idoso) {
  return {
    nome: idoso?.nome ?? '',
    nomeSocial: idoso?.nomeSocial ?? '',
    dataNascimento: idoso ? dataParaFormulario(idoso.dataNascimento) : '',
    cpf: idoso?.cpf ?? '',
    telefone: idoso?.telefone ?? '',
    sexo: idoso?.sexo ?? '',
    necessidadesEspeciais: idoso?.necessidadesEspeciais ?? '',
    observacoes: idoso?.observacoes ?? '',
  };
}
export type DadosIdosoFormulario = ReturnType<typeof dadosIdosoFormulario>;

export function normalizarDadosIdoso(dados: DadosIdosoFormulario) {
  return {
    ...dados,
    nome: dados.nome.trim(),
    nomeSocial: dados.nomeSocial.trim(),
    cpf: dados.cpf.replace(/\D/g, ''),
    telefone: dados.telefone.replace(/\D/g, ''),
    sexo: dados.sexo.trim(),
    necessidadesEspeciais: dados.necessidadesEspeciais.trim(),
    observacoes: dados.observacoes.trim(),
  };
}

export function dadosIdosoParaApi(dados: DadosIdosoFormulario) {
  const normalizado = normalizarDadosIdoso(dados);
  return {
    ...normalizado,
    dataNascimento: dataParaApi(normalizado.dataNascimento),
    cpf: normalizado.cpf || null,
    telefone: normalizado.telefone || null,
  };
}

export function alteracoesIdoso(
  antes: DadosIdosoFormulario,
  depois: DadosIdosoFormulario,
) {
  return alteracoes(dadosIdosoParaApi(antes), dadosIdosoParaApi(depois));
}

export function resumoEndereco(endereco: Endereco) {
  return `${endereco.rua}, ${endereco.numero} · ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`;
}

/** Valores sem máscaras para comparar e enviar apenas alterações reais. */
export function dadosPerfil(usuario: UsuarioAtual) {
  const perfil = (usuario.cuidador ?? usuario.responsavel)!;
  return {
    nome: usuario.nome,
    nomeSocial: usuario.nomeSocial ?? '',
    email: usuario.email,
    telefone2: usuario.telefone2 ?? '',
    telefone: perfil.telefone,
    cpf: perfil.cpf,
    dataNascimento: dataParaFormulario(perfil.dataNascimento),
    biografia: usuario.cuidador?.biografia ?? '',
    experienciaProfissional: usuario.cuidador?.experienciaProfissional ?? '',
    registroProfissional: usuario.cuidador?.registroProfissional ?? '',
  };
}

export type DadosPerfil = ReturnType<typeof dadosPerfil>;

export function normalizarPerfil(dados: DadosPerfil): DadosPerfil {
  return {
    ...Object.fromEntries(
      Object.entries(dados).map(([campo, valor]) => [campo, valor.trim()]),
    ),
    email: dados.email.trim().toLowerCase(),
    telefone: dados.telefone.replace(/\D/g, ''),
    telefone2: dados.telefone2.replace(/\D/g, ''),
    cpf: dados.cpf.replace(/\D/g, ''),
  } as DadosPerfil;
}

export function alteracoesPerfil(
  antes: DadosPerfil,
  depois: DadosPerfil,
  cuidador: boolean,
) {
  const mudancas = alteracoes(
    normalizarPerfil(antes),
    normalizarPerfil(depois),
  );
  const {
    nome,
    nomeSocial,
    email,
    telefone2,
    telefone,
    cpf,
    dataNascimento,
    biografia,
    experienciaProfissional,
    registroProfissional,
  } = mudancas;
  const usuario = {
    ...(nome !== undefined && { nome }),
    ...(nomeSocial !== undefined && { nomeSocial }),
    ...(email !== undefined && { email }),
    ...(telefone2 !== undefined && { telefone2: telefone2 || null }),
  };
  return {
    ...(Object.keys(usuario).length > 0 && { usuario }),
    ...(telefone !== undefined && { telefone }),
    ...(cpf !== undefined && { cpf }),
    ...(dataNascimento !== undefined && {
      dataNascimento: dataParaApi(dataNascimento),
    }),
    ...(cuidador && {
      ...(biografia !== undefined && { biografia }),
      ...(experienciaProfissional !== undefined && { experienciaProfissional }),
      ...(registroProfissional !== undefined && { registroProfissional }),
    }),
  };
}

export function dataParaFormulario(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('/');
}
export function dataParaApi(data: string) {
  return data.split('/').reverse().join('-');
}
/** Envia só os campos editados, inclusive campos opcionais apagados pelo usuário. */
export function alteracoes<T extends object>(antes: T, depois: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(depois).filter(
      ([chave, valor]) => valor !== (antes as Record<string, unknown>)[chave],
    ),
  ) as Partial<T>;
}
