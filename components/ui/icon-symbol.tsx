// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'mic.fill': 'mic',
  'stop.fill': 'stop',
  'book.fill': 'menu-book',
  'chart.bar.fill': 'bar-chart',
  'gearshape.fill': 'settings',
  'folder.fill': 'folder',
  'arrow.up.doc': 'upload-file',
  'arrow.down.doc': 'file-download',
  'tray.and.arrow.down.fill': 'system-update-alt',
  'hammer.fill': 'construction',
  'doc.text.fill': 'description',
  'list.bullet.rectangle': 'fact-check',
  waveform: 'graphic-eq',
  'exclamationmark.triangle.fill': 'warning',
  'person.crop.circle': 'account-circle',
  'camera.fill': 'photo-camera',
  'square.and.pencil': 'edit',
  'arrow.clockwise': 'refresh',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'shield.fill': 'shield',
  'icloud.and.arrow.down': 'cloud-download',
  iphone: 'smartphone',
  'externaldrive.fill': 'storage',
  'info.circle.fill': 'info',
  'line.3.horizontal.decrease.circle': 'filter-list',
  magnifyingglass: 'search',
  'circle.fill': 'circle',
  'checkmark.seal.fill': 'verified',
  'location.fill': 'location-on',
  'tag.fill': 'sell',
  'flag.fill': 'flag',
  'person.2.fill': 'groups',
  'paperclip': 'attach-file',
  timer: 'timer',
  stopwatch: 'timer',
  'clock.arrow.circlepath': 'history',
  checkmark: 'check',
  'checkmark.circle': 'check-circle',
  xmark: 'close',
  globe: 'language',
  cpu: 'memory',
} satisfies Record<string, MaterialIconName>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
