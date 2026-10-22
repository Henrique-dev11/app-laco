import { Platform } from 'react-native';
import { valoresOferta, erroOferta } from '../utils/ofertas';
import { api } from './api';
import type { CadastroRascunho } from '../types/cadastro';
import { somenteNumeros } from '../utils/validation';

function dataIso(value: string) {
  const [dia, mes, ano] = value.split('/');
  return `${ano}-${mes}-${dia}`;
}
export async function salvarCadastro(rascunho: CadastroRascunho) {
  if (
    rascunho.perfil === 'cuidador' &&
    (!rascunho.ofertas.length || rascunho.ofertas.some((o) => erroOferta(o)))
  )
    throw new Error('Configure preço e duração de todos os serviços.');
  const d = rascunho.documentos;
  const endereco = {
    rua: d.rua.trim(),
    numero: d.numeroCasa.trim(),
    complemento: d.complemento.trim(),
    bairro: d.bairro.trim(),
    cidade: d.cidade.trim(),
    estado: d.estado.toUpperCase(),
    cep: somenteNumeros(d.cep),
  };
  const dados = {
    perfil: rascunho.perfil,
    nome: rascunho.pessoal.nomeCompleto.trim(),
    nomeSocial: rascunho.pessoal.nomeSocial.trim(),
    email: rascunho.pessoal.email.trim().toLowerCase(),
    telefone: somenteNumeros(rascunho.pessoal.telefone),
    ...(rascunho.pessoal.telefone2.trim()
      ? { telefone2: somenteNumeros(rascunho.pessoal.telefone2) }
      : {}),
    cpf: somenteNumeros(d.cpf),
    dataNascimento: dataIso(d.dataNascimento),
    senha: d.senha,
    endereco,
    aceitoTermos: rascunho.aceitoTermos,
    servicoIds: rascunho.servicos,
    ...(rascunho.perfil === 'responsavel'
      ? {
          idoso: {
            nome: rascunho.idoso.nomeCompleto.trim(),
            nomeSocial: rascunho.idoso.nomeSocial.trim(),
            cpf: somenteNumeros(rascunho.idoso.cpf),
            dataNascimento: dataIso(rascunho.idoso.dataNascimento),
            parentesco: rascunho.idoso.parentesco,
            endereco: rascunho.idoso.mesmoEndereco
              ? endereco
              : {
                  ...rascunho.idoso.endereco,
                  cep: somenteNumeros(rascunho.idoso.endereco.cep),
                  estado: rascunho.idoso.endereco.estado.toUpperCase(),
                },
          },
        }
      : {}),
    ...(rascunho.perfil === 'cuidador'
      ? {
          ofertas: rascunho.ofertas
            .filter((o) => o.servicoId !== undefined)
            .map((oferta) => ({
              servicoId: oferta.servicoId,
              ...valoresOferta(oferta),
            })),
          servicosPersonalizados: rascunho.ofertas
            .filter((o) => o.servicoId === undefined)
            .map((oferta) => ({
              nome: oferta.nome.trim(),
              descricao: oferta.descricao?.trim(),
              ...valoresOferta(oferta),
            })),
        }
      : {}),
  };
  if (rascunho.perfil !== 'cuidador') return api.post('/auth/cadastro', dados);
  if (!rascunho.curriculo) throw new Error('Selecione o currículo.');
  const form = new FormData();
  form.append('dados', JSON.stringify(dados));
  if (Platform.OS === 'web') {
    const arquivo =
      rascunho.curriculo.file ??
      (await (await fetch(rascunho.curriculo.uri)).blob());
    form.append('curriculo', arquivo, rascunho.curriculo.name);
  } else {
    form.append('curriculo', {
      uri: rascunho.curriculo.uri,
      name: rascunho.curriculo.name,
      type: 'application/pdf',
    } as unknown as Blob);
  }
  return api.post('/auth/cadastro', form, {
    timeout: 60000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
