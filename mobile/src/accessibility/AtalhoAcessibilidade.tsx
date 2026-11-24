import { useState } from 'react';
import { Button } from '../components/Button';
import { PainelAcessibilidade } from './PainelAcessibilidade';

export function AtalhoAcessibilidade() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button
        title="Acessibilidade"
        variant="outline"
        onPress={() => setAberto(true)}
      />
      <PainelAcessibilidade visivel={aberto} onClose={() => setAberto(false)} />
    </>
  );
}
