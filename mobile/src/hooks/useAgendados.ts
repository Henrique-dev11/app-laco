import { useMemo } from 'react';
import { useConsultaApi } from './useConsultaApi';
import { agendadosParaHome, type Atendimento } from '../utils/home';

export function useAgendados() {
  const consulta = useConsultaApi<Atendimento[]>('/agendamentos');
  const resultado = useMemo(() => {
    const agora = consulta.instante;
    return { ...agendadosParaHome(consulta.dados ?? [], agora), agora };
  }, [consulta.dados, consulta.instante]);
  return {
    ...resultado,
    erro: !!consulta.erro,
    atualizar: consulta.atualizar,
    carregando: consulta.carregando,
  };
}
