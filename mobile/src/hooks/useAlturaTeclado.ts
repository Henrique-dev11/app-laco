import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * Altura atual do teclado (0 quando fechado).
 *
 * No Android atual o app desenha sob as barras do sistema (edge-to-edge) e a
 * janela não encolhe quando o teclado abre, então o `KeyboardAvoidingView` não
 * levanta o campo de texto. Aqui a altura vem direto dos eventos do teclado e
 * a tela aplica como `paddingBottom`.
 */
export function useAlturaTeclado() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';
    const mostrar = Keyboard.addListener(
      ios ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      ({ endCoordinates }) =>
        setAltura(
          ios
            ? Math.max(
                0,
                Dimensions.get('window').height - endCoordinates.screenY,
              )
            : endCoordinates.height,
        ),
    );
    const esconder = Keyboard.addListener(
      ios ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setAltura(0),
    );
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);
  return altura;
}
