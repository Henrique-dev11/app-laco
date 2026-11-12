import { useMemo } from 'react';
import { MeuCuidadoCard } from '../../components/MeuCuidadoCard';
import { useAuth } from '../../contexts/AuthContext';
import { useAgendados } from '../../hooks/useAgendados';
import { horaEmSaoPaulo, saudacao } from '../../utils/home';
import { AtalhoGrande, ProximoAtendimento, SecaoTitulo } from './blocos';
import { HomeShell, type HomeProps } from './HomeShell';

/** Home do idoso com acesso próprio: poucos botões, grandes e diretos. */
export function HomeIdoso({ navigation }: HomeProps) {
  const { usuario } = useAuth();
  const { proximo, erro, agora } = useAgendados();
  const cumprimento = useMemo(() => saudacao(horaEmSaoPaulo()), []);
  const proprio = usuario?.responsavel?.responsavelIdosos.find(
    (item) => item.parentesco === 'PROPRIO',
  )?.idoso;
  if (!usuario || !proprio) return null;
  return (
    <HomeShell navigation={navigation} saudacao={cumprimento}>
      <ProximoAtendimento
        grande
        proximo={proximo}
        agora={agora}
        erro={erro}
        linha={(item) =>
          `${item.contratacao.cuidadorServico.cuidador.usuario.nome} vai cuidar de você`
        }
        onPress={() => navigation.navigate('Agenda')}
      />
      <SecaoTitulo>Meu cuidador</SecaoTitulo>
      <MeuCuidadoCard idosoId={proprio.id} navigation={navigation} />
      <SecaoTitulo>O que você quer fazer?</SecaoTitulo>
      <AtalhoGrande
        titulo="Buscar cuidador"
        descricao="Encontre alguém para cuidar de você"
        icone="search"
        onPress={() =>
          navigation.navigate('BuscarCuidador', { idosoId: proprio.id })
        }
      />
      <AtalhoGrande
        titulo="Minha agenda"
        descricao="Veja seus atendimentos marcados"
        icone="calendar"
        onPress={() => navigation.navigate('Agenda')}
      />
      <AtalhoGrande
        titulo="Mensagens"
        descricao="Converse com seu cuidador"
        icone="chatbubbles"
        onPress={() => navigation.navigate('Mensagens')}
      />
      <AtalhoGrande
        titulo="Meu perfil"
        descricao="Seus dados e sua foto"
        icone="person"
        onPress={() => navigation.navigate('Perfil')}
      />
    </HomeShell>
  );
}
