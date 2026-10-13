import { PersonalStep } from '../components/registration/PersonalStep';
import { DocumentStep } from '../components/registration/DocumentStep';

export function CuidadorStep1Screen() {
  return <PersonalStep perfil="cuidador" />;
}
export function CuidadorStep2Screen() {
  return <DocumentStep perfil="cuidador" />;
}
