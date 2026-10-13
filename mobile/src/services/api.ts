import { create, isAxiosError } from 'axios';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL não foi configurada.');
}

export const api = create({
  baseURL: apiUrl,
  timeout: 10000,
});

export function definirToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function mensagemErro(error: unknown) {
  if (isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
    if (!error.response)
      return 'Não foi possível acessar a API. Verifique a conexão e tente novamente.';
  }
  return 'Não foi possível concluir. Tente novamente.';
}
