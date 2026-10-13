import type {
  DadosIdoso,
  DadosPessoais,
  Documentos,
  ErrosFormulario,
} from '../types/cadastro';

export function somenteNumeros(value: string) {
  return value.replace(/\D/g, '');
}

export function formatarData(value: string) {
  const numeros = somenteNumeros(value).slice(0, 8);
  if (numeros.length > 4)
    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
  if (numeros.length > 2) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return numeros;
}

export function emailValido(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function dataValida(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [dia, mes, ano] = value.split('/').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return (
    ano >= 1900 &&
    data <= new Date() &&
    data.getDate() === dia &&
    data.getMonth() === mes - 1 &&
    data.getFullYear() === ano
  );
}

export function validarPessoal(
  dados: DadosPessoais,
): ErrosFormulario<DadosPessoais> {
  const errors: ErrosFormulario<DadosPessoais> = {};
  if (dados.nomeCompleto.trim().split(/\s+/).length < 2)
    errors.nomeCompleto = 'Digite o nome e o sobrenome';
  if (!emailValido(dados.email)) errors.email = 'Digite um e-mail válido';
  const telefone = somenteNumeros(dados.telefone);
  if (telefone.length < 10 || telefone.length > 13)
    errors.telefone = 'Digite um telefone válido com DDD';
  const telefone2 = somenteNumeros(dados.telefone2);
  if (
    dados.telefone2.trim() &&
    (telefone2.length < 10 || telefone2.length > 13)
  )
    errors.telefone2 = 'Digite um telefone válido com DDD';
  return errors;
}

export function validarDocumentos(
  dados: Documentos,
  exigeNumero: boolean,
): ErrosFormulario<Documentos> {
  const errors: ErrosFormulario<Documentos> = {};
  if (somenteNumeros(dados.cpf).length !== 11)
    errors.cpf = 'CPF deve ter 11 dígitos';
  if (somenteNumeros(dados.cep).length !== 8)
    errors.cep = 'CEP deve ter 8 dígitos';
  if (exigeNumero && !dados.numeroCasa.trim())
    errors.numeroCasa = 'Preencha o número';
  if (!dataValida(dados.dataNascimento))
    errors.dataNascimento = 'Digite uma data válida (DD/MM/AAAA)';
  if (dados.senha.length < 8)
    errors.senha = 'A senha deve ter pelo menos 8 caracteres';
  return errors;
}

export function validarIdoso(dados: DadosIdoso): ErrosFormulario<DadosIdoso> {
  const errors: ErrosFormulario<DadosIdoso> = {};
  if (dados.nomeCompleto.trim().split(/\s+/).length < 2)
    errors.nomeCompleto = 'Digite o nome e o sobrenome';
  if (somenteNumeros(dados.cpf).length !== 11)
    errors.cpf = 'CPF deve ter 11 dígitos';
  if (!dataValida(dados.dataNascimento))
    errors.dataNascimento = 'Digite uma data válida (DD/MM/AAAA)';
  return errors;
}
