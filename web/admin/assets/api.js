export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function createApi({
  getToken = () => null,
  onUnauthorized = () => {},
  fetcher = globalThis.fetch,
  baseUrl = '/api',
} = {}) {
  async function request(
    path,
    { method = 'GET', body, token = getToken(), binary = false } = {},
  ) {
    const headers = {
      Accept:
        binary === 'imagem'
          ? 'image/*'
          : binary
            ? 'application/pdf'
            : 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });
    } catch {
      throw new ApiError(
        'Não foi possível conectar. Verifique sua conexão e tente novamente.',
        0,
      );
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && path !== '/auth/login') onUnauthorized();
      const message = Array.isArray(data.message)
        ? data.message.join(' ')
        : data.message;
      throw new ApiError(
        typeof message === 'string'
          ? message
          : 'Não foi possível concluir esta ação.',
        response.status,
      );
    }
    if (response.status === 204) return null;
    return binary ? response.blob() : response.json();
  }
  return {
    login: (email, senha) =>
      request('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), senha },
        token: null,
      }),
    perfil: () => request('/auth/me'),
    listar: () => request('/admin/cuidadores'),
    verificar: (id, statusVerificacao) =>
      request(`/admin/cuidadores/${id}/verificacao`, {
        method: 'PATCH',
        body: { statusVerificacao },
      }),
    conta: (id, status) =>
      request(`/admin/cuidadores/${id}/conta`, {
        method: 'PATCH',
        body: { status },
      }),
    curriculo: (id) =>
      request(`/admin/cuidadores/${id}/curriculo`, { binary: true }),
    // Fotos de cuidadores pendentes são privadas: precisam do token, então
    // não dá para usar <img src> direto; baixamos o binário e criamos um blob.
    foto: (usuarioId) =>
      request(`/fotos/${usuarioId}`, { binary: 'imagem' }),
    logout: (token) =>
      request('/auth/logout', { method: 'POST', token: token ?? getToken() }),
  };
}
