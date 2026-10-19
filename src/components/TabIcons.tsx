import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

const stroke = {
  fill: 'none' as const,
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Pictos au trait — mêmes formes que frontend/TabIcons.tsx */
export function IconMatch({ color, size = 23 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x={3.5} y={5} width={17} height={15} rx={2.5} stroke={color} {...stroke} />
      <Path d="M3.5 9.5h17M8.5 3.5v3M15.5 3.5v3" stroke={color} {...stroke} />
      <Circle cx={12} cy={14.6} r={2.2} stroke={color} {...stroke} />
    </Svg>
  );
}

export function IconCard({ color, size = 23 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x={5.5} y={3} width={13} height={18} rx={2.5} stroke={color} {...stroke} />
      <Circle cx={12} cy={9.2} r={2.4} stroke={color} {...stroke} />
      <Path d="M8.6 16.6h6.8" stroke={color} {...stroke} />
    </Svg>
  );
}

export function IconProfile({ color, size = 23 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Circle cx={12} cy={8.4} r={3.6} stroke={color} {...stroke} />
      <Path d="M4.8 20c0-3.6 3.2-5.6 7.2-5.6s7.2 2 7.2 5.6" stroke={color} {...stroke} />
    </Svg>
  );
}

/** Trophée / votes For the Best */
export function IconVote({ color, size = 23 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M8 4.5h8v3.2c0 2.4-1.7 4.4-4 4.8-2.3-.4-4-2.4-4-4.8V4.5z"
        stroke={color}
        {...stroke}
      />
      <Path d="M8 5.2H5.8A2.3 2.3 0 0 1 5.8 9.8H8M16 5.2h2.2a2.3 2.3 0 0 1 0 4.6H16" stroke={color} {...stroke} />
      <Path d="M12 12.5v3.2M9 20.5h6M12 15.7h0a2.4 2.4 0 0 0-2.4 2.4V20.5h4.8v-2.4a2.4 2.4 0 0 0-2.4-2.4z" stroke={color} {...stroke} />
    </Svg>
  );
}
