import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { brand } from '../theme/brand';

/**
 * Coquille téléphone (max 440px), comme frontend AppShell.
 * Sur mobile : plein écran (100dvh). Sur grand écran web : cadre arrondi centré.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 640;

  return (
    <View style={[styles.root, { backgroundColor: brand.shellBg }]}>
      <View
        style={[
          styles.phone,
          desktop
            ? {
                flexGrow: 0,
                flexShrink: 0,
                height: Math.min(880, height - 48),
                maxHeight: Math.min(880, height - 48),
                marginVertical: 24,
                borderRadius: 44,
                overflow: 'hidden',
                ...(Platform.OS === 'web'
                  ? ({
                      boxShadow:
                        '0 40px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(198,255,0,.10)',
                    } as object)
                  : null),
              }
            : styles.phoneMobile,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100dvh', height: '100dvh' } as object)
      : null),
  },
  phone: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: brand.ink,
    overflow: 'hidden',
  },
  phoneMobile: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100dvh', height: '100dvh' } as object)
      : null),
  },
});
