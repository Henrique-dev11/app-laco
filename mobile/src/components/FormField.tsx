import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { useState } from 'react';
import {
  Image,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { useMotionValue } from '../motion/useMotionValue';
import { MotionView } from '../motion/MotionView';
import { motionDurations } from '../motion/policy';

type Props = TextInputProps & {
  label: string;
  error?: string;
  password?: boolean;
};

export function FormField({
  label,
  error,
  password = false,
  style,
  ...props
}: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const focus = useMotionValue(focused ? 1 : 0, motionDurations.focus);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, !!error && styles.invalid]}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.focus,
            {
              opacity: focus,
              borderColor: error ? colors.error : colors.primary,
            },
          ]}
        />
        <TextInput
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          secureTextEntry={password ? hidden : props.secureTextEntry}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          autoCorrect={password ? false : props.autoCorrect}
          style={[styles.input, style]}
        />
        {password && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            onPress={() => setHidden((value) => !value)}
            style={styles.eye}
          >
            <Image
              source={
                hidden
                  ? require('../../assets/laco/password-hidden.png')
                  : require('../../assets/laco/password-visible.png')
              }
              style={styles.icon}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <MotionView key={error} preset="fade">
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        </MotionView>
      )}
    </View>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    group: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
    field: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.input,
    },
    input: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    invalid: { borderColor: colors.error },
    focus: { borderWidth: 2, borderRadius: 12 },
    error: { fontSize: 12, color: colors.error },
    eye: {
      minHeight: 44,
      width: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: { width: 22, height: 22, resizeMode: 'contain' },
  });
