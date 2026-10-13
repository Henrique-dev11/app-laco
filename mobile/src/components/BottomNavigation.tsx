import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  activeTab?: 'Início' | 'Buscar' | 'Agenda' | 'Mensagens' | 'Perfil';
  onHome: () => void;
  onSearch: () => void;
  onAgenda: () => void;
  onMessages: () => void;
  onProfile: () => void;
};

export function BottomNavigation({
  activeTab = 'Início',
  onHome,
  onSearch,
  onAgenda,
  onMessages,
  onProfile,
}: Props) {
  const items = [
    { title: 'Início', icon: 'home-outline', onPress: onHome, active: true },
    {
      title: 'Buscar',
      icon: 'search-outline',
      onPress: onSearch,
      active: false,
    },
    {
      title: 'Agenda',
      icon: 'calendar-outline',
      onPress: onAgenda,
      active: false,
    },
    {
      title: 'Mensagens',
      icon: 'chatbubble-outline',
      onPress: onMessages,
      active: false,
    },
    {
      title: 'Perfil',
      icon: 'person-outline',
      onPress: onProfile,
      active: false,
    },
  ] as const;
  return (
    <View style={styles.bar}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.title}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          accessibilityState={{ selected: item.title === activeTab }}
          onPress={item.onPress}
          style={styles.item}
        >
          <Ionicons
            name={item.icon}
            size={22}
            color={item.title === activeTab ? colors.surface : '#CFBECD'}
          />
          <Text
            style={[styles.text, item.title === activeTab && styles.active]}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.text,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  item: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  text: { color: '#CFBECD', fontSize: 10 },
  active: { color: colors.surface, fontWeight: '700' },
});
