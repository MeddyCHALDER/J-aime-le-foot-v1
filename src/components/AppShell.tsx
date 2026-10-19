import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { brand } from '../theme/brand';

/**
 * Coquille téléphone (max 440px), comme frontend AppShell.
 * Sur mobile : plein écran. Sur grand écran web : cadre arrondi centré.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 640;

  return (
    <View style={[styles.root, { backgroundColor: brand.shellBg }]}>
      <View
        style={[
          styles.phone,
          desktop && {
            maxHeight: Math.min(880, height - 48),
            height: Math.min(880, height - 48),
            marginVertical: 24,
            borderRadius: 44,
            overflow: 'hidden',
            ...(Platform.OS === 'web'
              ? ({
                  boxShadow:
                    '0 40px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(198,255,0,.10)',
                } as object)
              : null),
          },
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
    height: Platform.OS === 'web' ? ('100%' as unknown as number) : undefined,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    backgroundColor: brand.ink,
  },
});
