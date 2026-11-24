import { useConsultaApi } from './useConsultaApi';

const vazio: never[] = [];

export function useListaApi<T>(url: string | null, intervalo = 0) {
  const consulta = useConsultaApi<T[]>(url, intervalo);
  return { ...consulta, dados: consulta.dados ?? vazio };
}
