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
      <Path d="M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0V4z" stroke={color} {...stroke} />
      <Path
        d="M7.5 6H5.6a1.9 1.9 0 0 0 0 3.8h2.1M16.5 6h1.9a1.9 1.9 0 0 1 0 3.8h-2.1"
        stroke={color}
        {...stroke}
      />
      <Path d="M12 13v3.6M8.5 20.3h7M9.8 20.3c.2-2.2 1-3.7 2.2-3.7s2 1.5 2.2 3.7" stroke={color} {...stroke} />
    </Svg>
  );
}
