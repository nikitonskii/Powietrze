import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { colors, type as typeScale } from '../tokens';

export interface TextProps extends RNTextProps {
  variant: keyof typeof typeScale;
  color?: string;
}

export function Text({ variant, color, style, ...rest }: TextProps) {
  const t = typeScale[variant];
  return (
    <RNText
      style={[
        {
          fontSize: t.size,
          fontWeight: t.weight,
          letterSpacing: t.letterSpacing,
          color: color ?? colors.text.primary,
        },
        style,
      ]}
      {...rest}
    />
  );
}
