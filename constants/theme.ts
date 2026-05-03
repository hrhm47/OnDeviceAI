/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const FieldColors = {
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F4',
  surfaceWarm: '#FBFAF7',
  text: '#111827',
  textMuted: '#374151',
  textSubtle: '#5B6472',
  border: '#C9D1D8',
  borderStrong: '#9BA8B4',
  primary: '#0F6CBD',
  primaryPressed: '#084C8D',
  primarySoft: '#E7F0FA',
  teal: '#0F766E',
  tealSoft: '#E6F3F1',
  success: '#147D4C',
  successSoft: '#E7F4EC',
  warning: '#B45309',
  warningSoft: '#FFF4DB',
  danger: '#B42318',
  dangerSoft: '#FDECEC',
  neutral: '#E6E8EB',
  neutralDark: '#2F3A45',
};

export const FieldType = {
  eyebrow: 12,
  body: 15,
  bodyLarge: 17,
  title: 28,
  section: 18,
  metric: 32,
};
