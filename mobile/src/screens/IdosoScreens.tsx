import { PersonalStep } from '../components/registration/PersonalStep';
import { DocumentStep } from '../components/registration/DocumentStep';

export function IdosoStep1Screen() {
  return <PersonalStep perfil="idoso" />;
}
export function IdosoStep2Screen() {
  return <DocumentStep perfil="idoso" />;
}
