import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { ServiceSelector } from '../components/ServiceSelector';
import { ServiceConfigFields } from '../components/ServiceConfigFields';
import { useCadastro } from '../contexts/CadastroContext';
import { RegistrationLayout } from '../layouts/RegistrationLayout';
import { useAppStyles } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';
import type { Servico } from '../types/servico';
import { erroOferta } from '../utils/ofertas';

export function CuidadorServicosScreen({
  navigation,
}: ScreenProps<'CuidadorServicos'>) {
  const { cadastro, atualizarCadastro } = useCadastro();
  const styles = useAppStyles();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [catalogo, setCatalogo] = useState<Servico[]>([]);
  const [erro, setErro] = useState('');
  return (
    <RegistrationLayout
      perfil="cuidador"
      step={3}
      title="Selecionar serviços"
      subtitle="Escolha o que deseja oferecer. Preço e duração serão definidos na próxima etapa."
      showLogo={false}
    >
      <ServiceSelector
        label="Serviços do catálogo"
        value={cadastro.servicos}
        onCatalogo={setCatalogo}
        onChange={(servicos, catalogo) => {
          if (
            servicos.length +
              cadastro.ofertas.filter((o) => o.servicoId === undefined).length >
            50
          ) {
            setErro('Selecione até 50 serviços.');
            return;
          }
          atualizarCadastro({
            servicos,
            ofertas: [
              ...servicos.map((servicoId) => {
                const existente = cadastro.ofertas.find(
                  (o) => o.servicoId === servicoId,
                );
                const servico = catalogo.find((s) => s.id === servicoId)!;
                return (
                  existente ?? {
                    servicoId,
                    nome: servico.nome,
                    preco: servico.precoSugerido ?? '',
                    duracao: servico.duracaoSugeridaMinutos?.toString() ?? '',
                    unidade: 'minutos' as const,
                    precoSugerido: servico.precoSugerido,
                    duracaoSugeridaMinutos: servico.duracaoSugeridaMinutos,
                  }
                );
              }),
              ...cadastro.ofertas.filter((o) => o.servicoId === undefined),
            ],
          });
          setErro('');
        }}
      />
      <View style={styles.card}>
        <Text style={styles.section}>Adicionar serviço personalizado</Text>
        <FormField
          label="Nome do serviço"
          value={nome}
          onChangeText={setNome}
          maxLength={150}
        />
        <FormField
          label="Descrição (opcional)"
          value={descricao}
          onChangeText={setDescricao}
          multiline
          maxLength={2000}
        />
        <Button
          title="Adicionar serviço"
          variant="outline"
          onPress={() => {
            const limpo = nome.trim();
            if (
              catalogo.some(
                (s) =>
                  s.nome.toLocaleLowerCase('pt-BR') ===
                  limpo.toLocaleLowerCase('pt-BR'),
              )
            ) {
              setErro(
                'Este serviço já está no catálogo. Selecione-o na lista acima.',
              );
              return;
            }
            if (
              !limpo ||
              cadastro.ofertas.some(
                (o) =>
                  o.nome.toLocaleLowerCase('pt-BR') ===
                  limpo.toLocaleLowerCase('pt-BR'),
              )
            ) {
              setErro(
                'Informe um nome diferente dos serviços já selecionados.',
              );
              return;
            }
            if (cadastro.ofertas.length >= 50) {
              setErro('Selecione até 50 serviços.');
              return;
            }
            atualizarCadastro({
              ofertas: [
                ...cadastro.ofertas,
                {
                  nome: limpo,
                  descricao: descricao.trim(),
                  preco: '',
                  duracao: '',
                  unidade: 'minutos',
                },
              ],
            });
            setNome('');
            setDescricao('');
            setErro('');
          }}
        />
      </View>
      {cadastro.ofertas
        .filter((o) => o.servicoId === undefined)
        .map((o) => (
          <View key={o.nome} style={styles.card}>
            <Text style={styles.name}>{o.nome}</Text>
            <Text style={styles.text}>{o.descricao}</Text>
            <Button
              title={`Remover ${o.nome}`}
              variant="outline"
              onPress={() =>
                atualizarCadastro({
                  ofertas: cadastro.ofertas.filter((item) => item !== o),
                })
              }
            />
          </View>
        ))}
      {!!erro && <Notice>{erro}</Notice>}
      <Button
        title="Continuar para configuração"
        onPress={() => {
          if (!cadastro.ofertas.length) {
            setErro('Selecione ou adicione pelo menos um serviço.');
            return;
          }
          if (nome.trim() || descricao.trim()) {
            setErro(
              'Adicione o serviço personalizado digitado ou limpe os campos antes de continuar.',
            );
            return;
          }
          navigation.navigate('ConfigurarServicos');
        }}
      />
    </RegistrationLayout>
  );
}

export function ConfigurarServicosScreen({
  navigation,
}: ScreenProps<'ConfigurarServicos'>) {
  const { cadastro, atualizarCadastro } = useCadastro();
  const [validar, setValidar] = useState(false);
  return (
    <RegistrationLayout
      perfil="cuidador"
      step={4}
      title="Configurar meus serviços"
      subtitle="Defina referências de preço e duração. Você poderá atualizá-las depois no perfil."
      showLogo={false}
    >
      {!cadastro.ofertas.length && (
        <Notice>Volte e selecione pelo menos um serviço.</Notice>
      )}
      {cadastro.ofertas.map((oferta, index) => (
        <ServiceConfigFields
          key={oferta.servicoId ?? oferta.nome}
          value={oferta}
          error={validar ? erroOferta(oferta) : ''}
          onChange={(value) =>
            atualizarCadastro({
              ofertas: cadastro.ofertas.map((o, i) =>
                i === index ? value : o,
              ),
            })
          }
        />
      ))}
      <Button
        title="Revisar seleção de serviços"
        variant="outline"
        onPress={() => navigation.goBack()}
      />
      <Button
        title="Salvar configurações e revisar cadastro"
        onPress={() => {
          setValidar(true);
          if (
            cadastro.ofertas.length &&
            !cadastro.ofertas.some((o) => erroOferta(o))
          )
            navigation.navigate('CadastroPreview');
        }}
      />
    </RegistrationLayout>
  );
}
