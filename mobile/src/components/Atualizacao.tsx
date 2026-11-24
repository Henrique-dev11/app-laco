import { Platform, RefreshControl } from 'react-native';
import { Button } from './Button';

export type Atualizacao = { carregando: boolean; atualizar: () => void };
export function gesto(atualizacao?: Atualizacao) {
  return atualizacao && Platform.OS !== 'web' ? (
    <RefreshControl
      refreshing={atualizacao.carregando}
      onRefresh={atualizacao.atualizar}
    />
  ) : undefined;
}

export function AtualizarWeb({ atualizacao }: { atualizacao?: Atualizacao }) {
  return atualizacao && Platform.OS === 'web' ? (
    <Button
      title="Atualizar dados"
      variant="outline"
      disabled={atualizacao.carregando}
      onPress={atualizacao.atualizar}
    />
  ) : null;
}
