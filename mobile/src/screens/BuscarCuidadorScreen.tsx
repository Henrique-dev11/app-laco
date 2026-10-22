import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAppStyles } from '../theme/appStyles';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { ScreenProps } from '../types/navigation';

type Cuidador = {
  id: number;
  usuario: {
    id: number;
    nome: string;
    nomeSocial: string | null;
    foto: { updatedAt: string } | null;
  };
  endereco: { cidade: string; estado: string };
  biografia: string | null;
  cuidadorServicos: {
    id: number;
    preco: string;
    duracaoMinutos: number;
    servico: { nome: string };
  }[];
};
export function BuscarCuidadorScreen({
  navigation,
}: ScreenProps<'BuscarCuidador'>) {
  const appStyles = useAppStyles();
  const colors = useTheme();
  const { usuario } = useAuth();
  const { dados, carregando, erro, atualizar } = useListaApi<Cuidador>(
    '/catalogo/cuidadores',
  );
  const idosos = usuario?.responsavel?.responsavelIdosos ?? [];
  const [idosoId, setIdosoId] = useState(idosos[0]?.idoso.id);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  async function solicitar(cuidadorServicoId: number) {
    if (!idosoId || !usuario?.responsavel || enviando) return;
    setEnviando(true);
    setMensagem('');
    try {
      await api.post('/contratacoes', {
        responsavelId: usuario.responsavel.id,
        idosoId,
        cuidadorServicoId,
      });
      setMensagem('Solicitação salva. Aguarde a resposta do cuidador.');
    } catch (error) {
      setMensagem(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <AppScreenLayout
      title="Buscar cuidador"
      subtitle="Encontre quem pode cuidar com você"
      tab="Buscar"
    >
      <Text style={appStyles.text}>Para quem você procura cuidados?</Text>
      {idosos.map(({ idoso }) => (
        <Button
          key={idoso.id}
          title={idoso.nomeSocial || idoso.nome}
          variant={idoso.id === idosoId ? 'filled' : 'outline'}
          disabled={enviando}
          onPress={() => setIdosoId(idoso.id)}
        />
      ))}
      {!idosos.length && (
        <Notice>
          É necessário ter um idoso vinculado para solicitar uma contratação.
        </Notice>
      )}
      {!!mensagem && <Notice>{mensagem}</Notice>}
      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !dados.length && (
        <Notice>Nenhum cuidador aprovado disponível no momento.</Notice>
      )}
      {dados.map((cuidador) => (
        <View key={cuidador.id} style={appStyles.card}>
          <View style={appStyles.row}>
            <Avatar
              nome={cuidador.usuario.nomeSocial || cuidador.usuario.nome}
              usuarioId={cuidador.usuario.id}
              versao={cuidador.usuario.foto?.updatedAt}
              tamanho={56}
            />
            <Text style={appStyles.name}>
              {cuidador.usuario.nomeSocial || cuidador.usuario.nome}
            </Text>
          </View>
          <Text style={appStyles.text}>
            {cuidador.endereco.cidade}/{cuidador.endereco.estado}
          </Text>
          {!!cuidador.biografia && (
            <Text style={appStyles.text}>{cuidador.biografia}</Text>
          )}
          {cuidador.cuidadorServicos.map((oferta) => (
            <View key={oferta.id} style={{ gap: 8 }}>
              <Text style={appStyles.text}>
                {oferta.servico.nome} · R${' '}
                {Number(oferta.preco).toFixed(2).replace('.', ',')} ·{' '}
                {oferta.duracaoMinutos} minutos
              </Text>
              <Button
                title={enviando ? 'Aguarde...' : 'Solicitar contratação'}
                disabled={enviando || !idosoId}
                onPress={() => {
                  void solicitar(oferta.id);
                }}
              />
            </View>
          ))}
        </View>
      ))}
      <Button
        title="Atualizar busca"
        variant="outline"
        disabled={carregando || enviando}
        onPress={atualizar}
      />
      <Button
        title="Ver minhas contratações"
        variant="outline"
        onPress={() => navigation.navigate('Historico')}
      />
    </AppScreenLayout>
  );
}
