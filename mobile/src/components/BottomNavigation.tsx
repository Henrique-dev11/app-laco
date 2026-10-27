import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useMotionValue } from '../motion/useMotionValue';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';

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
  const styles = useStyles(criarStyles);
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
        <TabButton
          key={item.title}
          title={item.title}
          icon={item.icon}
          selected={item.title === activeTab}
          onPress={item.onPress}
        />
      ))}
    </View>
  );
}

function TabButton({
  title,
  icon,
  selected,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const progress = useMotionValue(selected ? 1 : 0);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.highlight, { opacity: progress }]}
      />
      <Animated.View
        style={{
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -2],
              }),
            },
          ],
        }}
      >
        <Ionicons
          name={icon}
          size={22}
          color={selected ? colors.surface : colors.tabInactive}
        />
      </Animated.View>
      <Text style={[styles.text, selected && styles.active]}>{title}</Text>
    </TouchableOpacity>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    bar: {
      backgroundColor: colors.header,
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
    text: { color: colors.tabInactive, fontSize: 10 },
    highlight: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 5,
      right: 5,
      borderRadius: 16,
      backgroundColor: colors.headerSoft,
    },
    active: { color: colors.surface, fontWeight: '700' },
  });
