import React, { forwardRef, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { brand, fonts, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';

interface AuthFieldProps extends TextInputProps {
  label: string;
  nativeID: string;
}

/** Champ carré : bordure lime et ombre décalée lime quand il est actif. */
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, nativeID, style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const f = useRef(new Animated.Value(0)).current;

  const animate = (to: number) =>
    Animated.timing(f, { toValue: to, duration: dur(180), useNativeDriver }).start();

  return (
    <View style={styles.wrap}>
      <Text nativeID={`${nativeID}-label`} style={styles.label}>
        {label}
      </Text>
      <View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              opacity: f,
              transform: [
                { translateX: f.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
                { translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
              ],
            },
          ]}
        />
        <TextInput
          ref={ref}
          nativeID={nativeID}
          accessibilityLabel={label}
          aria-labelledby={`${nativeID}-label`}
          {...({ dataSet: { jfInput: 'true' } } as object)}
          placeholderTextColor={brand.placeholder}
          selectionColor={brand.lime}
          cursorColor={brand.lime}
          onFocus={(e) => {
            setFocused(true);
            animate(1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            animate(0);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            focused && styles.inputFocused,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            style,
          ]}
          {...props}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: brand.muted,
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brand.lime,
    zIndex: 0,
  },
  input: {
    // Positionné au-dessus de l'ombre lime : sans ça, sur le web, l'ombre
    // (en position absolue) recouvre le champ pendant la saisie.
    position: 'relative',
    zIndex: 1,
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: 0,
    backgroundColor: brand.field,
    color: brand.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: brand.lime,
    backgroundColor: brand.fieldFocus,
  },
});
