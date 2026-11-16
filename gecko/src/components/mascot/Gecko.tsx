import { useEffect, useId, useMemo, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { GeckoMood } from '@/domain/gamification';
import { geckoSvg } from './geckoArt';

interface Props {
  mood?: GeckoMood;
  /** Altura en puntos. El ancho es 3/4 de la altura. */
  size?: number;
  /** Balanceo suave en reposo. */
  animated?: boolean;
}

const LABELS: Record<GeckoMood, string> = {
  neutral: 'Gecko guiñando un ojo con el pulgar arriba',
  happy: 'Gecko celebrando',
  motivated: 'Gecko motivado',
  disappointed: 'Gecko decepcionado',
  proud: 'Gecko orgulloso',
};

/** Mascota de Gecko: personaje de cuerpo entero con cinco estados de ánimo. */
export function Gecko({ mood = 'neutral', size = 180, animated = true }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const xml = useMemo(() => geckoSvg(mood, `gk${id}`), [mood, id]);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const step = (toValue: number) =>
      Animated.timing(bob, {
        toValue,
        duration: 1600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: Platform.OS !== 'web',
      });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [animated, bob]);

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABELS[mood]}
      style={{
        width: size * 0.75,
        height: size,
        transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.02] }) }],
      }}
    >
      <SvgXml xml={xml} width="100%" height="100%" />
    </Animated.View>
  );
}
