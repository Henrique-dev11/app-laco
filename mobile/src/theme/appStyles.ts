import { StyleSheet } from 'react-native';
import type { Paleta } from './index';
import { useStyles } from './ThemeContext';

const criarAppStyles = (colors: Paleta) =>
  StyleSheet.create({
    card: {
      padding: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 12,
    },
    name: { fontSize: 18, fontWeight: '600', color: colors.text },
    section: { fontSize: 16, fontWeight: '700', color: colors.text },
    text: { fontSize: 14, color: colors.muted, lineHeight: 21 },
    helper: { fontSize: 12, color: colors.muted, lineHeight: 18 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
    badge: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.badge,
    },
    badgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
    separator: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  });

/** Estilos compartilhados das telas, na paleta do perfil logado. */
export const useAppStyles = () => useStyles(criarAppStyles);

export const statusLabels: Record<string, string> = {
  PENDENTE: 'Em análise',
  APROVADO: 'Aprovado',
  REJEITADO: 'Não aprovado',
  SOLICITADA: 'Aguardando resposta',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
  CONCLUIDA: 'Concluída',
  FILHO: 'Filho',
  FILHA: 'Filha',
  CONJUGE: 'Cônjuge',
  NETO: 'Neto',
  NETA: 'Neta',
  OUTRO: 'Outro',
  DOMINGO: 'Domingo',
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sábado',
};
