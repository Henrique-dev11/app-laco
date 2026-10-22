import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { ServiceConfigFields } from '../components/ServiceConfigFields';
import { useAuth } from '../contexts/AuthContext';
import { useListaApi } from '../hooks/useListaApi';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { api, mensagemErro } from '../services/api';
import { useAppStyles } from '../theme/appStyles';
import type { OfertaRascunho } from '../types/cadastro';
import type { Servico } from '../types/servico';
import { erroOferta, valoresOferta } from '../utils/ofertas';

type Oferta = {
  id: number;
  preco: string;
  duracaoMinutos: number;
  ativo: boolean;
  updatedAt: string;
  servico: Servico;
};
function EditarOferta({
  oferta,
  disabled,
  salvar,
}: {
  oferta: Oferta;
  disabled: boolean;
  salvar: (value: OfertaRascunho, ativo: boolean) => void;
}) {
  const [value, setValue] = useState<OfertaRascunho>({
    servicoId: oferta.servico.id,
    nome: oferta.servico.nome,
    preco: oferta.preco,
    duracao: String(oferta.duracaoMinutos),
    unidade: 'minutos',
    precoSugerido: oferta.servico.precoSugerido,
    duracaoSugeridaMinutos: oferta.servico.duracaoSugeridaMinutos,
  });
  return (
    <View style={{ gap: 8 }}>
      <ServiceConfigFields
        value={value}
        onChange={setValue}
        disabled={disabled}
      />
      <Button
        title="Salvar preço e duração"
        disabled={disabled}
        onPress={() => salvar(value, oferta.ativo)}
      />
      <Button
        title={oferta.ativo ? 'Pausar oferta' : 'Reativar oferta'}
        disabled={disabled}
        variant="outline"
        onPress={() =>
          salvar(
            {
              ...value,
              preco: oferta.preco,
              duracao: String(oferta.duracaoMinutos),
              unidade: 'minutos',
            },
            !oferta.ativo,
          )
        }
      />
    </View>
  );
}

export function MeusServicosScreen() {
  const { usuario, atualizar: atualizarPerfil } = useAuth();
  const cuidadorId = usuario?.cuidador?.id;
  const styles = useAppStyles();
  const ofertas = useListaApi<Oferta>(
    `/cuidadores/${cuidadorId ?? 0}/servicos`,
  );
  const catalogo = useListaApi<Servico>('/servicos');
  const [novo, setNovo] = useState<OfertaRascunho | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  if (!cuidadorId)
    return (
      <AppScreenLayout title="Meus serviços">
        <Notice>Disponível para cuidadores.</Notice>
      </AppScreenLayout>
    );
  async function salvar(
    value: OfertaRascunho,
    existente = false,
    ativo = true,
  ) {
    if (enviando) return;
    const erro = erroOferta(value);
    if (erro) {
      setMensagem(erro);
      return;
    }
    setEnviando(true);
    setMensagem('');
    try {
      const path = `/cuidadores/${cuidadorId}/servicos`;
      if (existente)
        await api.patch(`${path}/${value.servicoId}`, {
          ...valoresOferta(value),
          ativo,
        });
      else if (value.servicoId)
        await api.post(`${path}/${value.servicoId}`, valoresOferta(value));
      else
        await api.post(path, {
          nome: value.nome.trim(),
          descricao: value.descricao?.trim(),
          ...valoresOferta(value),
        });
      if (!existente) {
        setNovo(null);
        setNome('');
        setDescricao('');
      }
      ofertas.atualizar();
      await atualizarPerfil();
      setMensagem(
        'Serviço salvo. As condições das contratações existentes foram preservadas.',
      );
    } catch (e) {
      setMensagem(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <AppScreenLayout
      title="Configurar meus serviços"
      subtitle="Gerencie suas referências de preço e duração"
      tab="Perfil"
    >
      <Notice>
        Preço-base e duração orientam novas solicitações. Alterações aqui não
        mudam contratos já solicitados.
      </Notice>
      {!!mensagem && <Notice>{mensagem}</Notice>}
      {ofertas.carregando && <ActivityIndicator />}
      {!!ofertas.erro && <Notice>{ofertas.erro}</Notice>}
      {!ofertas.carregando && !ofertas.erro && !ofertas.dados.length && (
        <Notice>Você ainda não oferece serviços.</Notice>
      )}
      {ofertas.dados.map((o) => (
        <EditarOferta
          key={`${o.id}-${o.updatedAt}`}
          oferta={o}
          disabled={enviando}
          salvar={(v, ativo) => {
            void salvar(v, true, ativo);
          }}
        />
      ))}
      <Text style={styles.section}>Adicionar serviço do catálogo</Text>
      {catalogo.carregando && <ActivityIndicator />}
      {!!catalogo.erro && <Notice>{catalogo.erro}</Notice>}
      {catalogo.dados
        .filter((s) => !ofertas.dados.some((o) => o.servico.id === s.id))
        .map((s) => (
          <Button
            key={s.id}
            title={s.nome}
            variant="outline"
            disabled={enviando || ofertas.carregando || !!ofertas.erro}
            onPress={() =>
              setNovo({
                servicoId: s.id,
                nome: s.nome,
                preco: s.precoSugerido ?? '',
                duracao: s.duracaoSugeridaMinutos?.toString() ?? '',
                unidade: 'minutos',
                precoSugerido: s.precoSugerido,
                duracaoSugeridaMinutos: s.duracaoSugeridaMinutos,
              })
            }
          />
        ))}
      <View style={styles.card}>
        <Text style={styles.section}>Ou crie um serviço personalizado</Text>
        <FormField
          label="Nome do serviço"
          value={nome}
          onChangeText={setNome}
          maxLength={150}
          editable={!enviando}
        />
        <FormField
          label="Descrição (opcional)"
          value={descricao}
          onChangeText={setDescricao}
          maxLength={2000}
          editable={!enviando}
        />
        <Button
          title="Configurar novo serviço"
          disabled={enviando || !nome.trim()}
          variant="outline"
          onPress={() =>
            setNovo({
              nome: nome.trim(),
              descricao: descricao.trim(),
              preco: '',
              duracao: '',
              unidade: 'minutos',
            })
          }
        />
      </View>
      {novo && (
        <>
          <ServiceConfigFields
            value={novo}
            onChange={setNovo}
            disabled={enviando}
          />
          <Button
            title={enviando ? 'Salvando...' : 'Salvar novo serviço'}
            disabled={enviando}
            onPress={() => {
              void salvar(novo);
            }}
          />
          <Button
            title="Descartar novo serviço"
            disabled={enviando}
            variant="outline"
            onPress={() => setNovo(null)}
          />
        </>
      )}
      <Button
        title="Atualizar serviços"
        variant="outline"
        disabled={enviando || ofertas.carregando || catalogo.carregando}
        onPress={() => {
          ofertas.atualizar();
          catalogo.atualizar();
        }}
      />
    </AppScreenLayout>
  );
}
