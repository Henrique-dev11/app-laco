import { View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { useAppStyles } from '../theme/appStyles';
import { dataSaoPaulo } from '../utils/calendario';
import { dataProposta } from '../services/propostas';

export function ResumoVisitas({
  itens,
}: {
  itens: { nome: string; inicios: string[]; duracao: number }[];
}) {
  const styles = useAppStyles();
  const sessoes = itens
    .flatMap((item) =>
      item.inicios.map((data) => {
        const inicio = new Date(data);
        return {
          inicio,
          nome: item.nome,
          fim: inicio.getTime() + item.duracao * 60000,
        };
      }),
    )
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const visitas: { inicio: Date; fim: number; nomes: string[] }[] = [];
  for (const sessao of sessoes) {
    const anterior = visitas.at(-1);
    if (
      anterior?.fim === sessao.inicio.getTime() &&
      dataSaoPaulo(anterior.inicio) === dataSaoPaulo(sessao.inicio)
    ) {
      anterior.fim = sessao.fim;
      anterior.nomes.push(sessao.nome);
    } else visitas.push({ ...sessao, nomes: [sessao.nome] });
  }
  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Visitas previstas · um código por visita
      </Text>
      {visitas.map(({ inicio, nomes }) => (
        <Text key={inicio.toISOString()} style={styles.text}>
          {dataProposta(inicio.toISOString())} · {nomes.join(' + ')}
        </Text>
      ))}
    </View>
  );
}
