import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Notice } from './Notice';
import { useListaApi } from '../hooks/useListaApi';
import { useTheme } from '../theme/ThemeContext';
import { useAppStyles } from '../theme/appStyles';
import { proximoCuidado, type CuidadoContratado } from '../utils/cuidados';
import type { ScreenProps } from '../types/navigation';

export function MeuCuidadoCard({
  idosoId,
  navigation,
}: {
  idosoId: number;
  navigation: ScreenProps<'Home'>['navigation'];
}) {
  const lista = useListaApi<CuidadoContratado>('/contratacoes');
  const colors = useTheme();
  const styles = useAppStyles();
  const [agora, setAgora] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setAgora(Date.now());
      const timer = setInterval(() => setAgora(Date.now()), 60000);
      return () => clearInterval(timer);
    }, []),
  );
  if (lista.carregando)
    return (
      <ActivityIndicator
        color={colors.primary}
        accessibilityLabel="Buscando seu cuidador"
      />
    );
  if (lista.erro)
    return (
      <View style={{ gap: 12 }}>
        <Notice>{lista.erro}</Notice>
        <Button
          title="Tentar novamente"
          variant="outline"
          onPress={lista.atualizar}
        />
      </View>
    );
  const contrato = proximoCuidado(lista.dados, idosoId, agora);
  if (!contrato)
    return (
      <View style={{ gap: 12 }}>
        <Notice>
          Você ainda não tem um cuidador confirmado para o próximo atendimento.
        </Notice>
        <Button
          title="Buscar cuidador"
          onPress={() => navigation.navigate('BuscarCuidador', { idosoId })}
        />
      </View>
    );
  const prestador = contrato.cuidadorServico.cuidador.usuario;
  const nome = prestador.nomeSocial || prestador.nome;
  const horario = contrato.agendamento;
  const quando = !horario
    ? 'Aguardando agendamento'
    : Date.parse(horario.inicio) <= agora
      ? 'Em atendimento'
      : new Date(horario.inicio).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver atendimento com ${nome}`}
      style={[
        styles.card,
        { flexDirection: 'row', alignItems: 'center', gap: 14 },
      ]}
      onPress={() =>
        horario
          ? navigation.navigate('Agenda')
          : navigation.navigate('AgendarAtendimento', {
              contratacaoId: contrato.id,
            })
      }
    >
      <Avatar
        nome={nome}
        usuarioId={prestador.id}
        versao={prestador.foto?.updatedAt}
        tamanho={56}
      />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.helper}>Cuidador confirmado</Text>
        <Text style={styles.name}>{nome}</Text>
        <Text style={styles.text}>{contrato.nomeServico}</Text>
        <Text style={styles.helper}>{quando}</Text>
      </View>
      <Ionicons name="chevron-forward" color={colors.muted} size={20} />
    </TouchableOpacity>
  );
}
