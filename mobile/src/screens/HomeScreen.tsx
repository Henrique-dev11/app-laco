import { useAuth } from '../contexts/AuthContext';
import type { ScreenProps } from '../types/navigation';
import { tipoDaHome } from '../utils/home';
import { HomeCuidador } from './home/HomeCuidador';
import { HomeIdoso } from './home/HomeIdoso';
import { HomeResponsavel } from './home/HomeResponsavel';

/** Escolhe a Home conforme quem entrou: cuidador, responsável ou idoso. */
export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { usuario } = useAuth();
  if (!usuario) return null;
  const tipo = tipoDaHome(usuario);
  if (tipo === 'cuidador') return <HomeCuidador navigation={navigation} />;
  if (tipo === 'idoso') return <HomeIdoso navigation={navigation} />;
  return <HomeResponsavel navigation={navigation} />;
}
