import { createContext, useContext, useEffect, useId, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import type { GeckoMood } from '@/domain/gamification';

interface Props {
  mood?: GeckoMood;
  size?: number;
  /** Balanceo suave en reposo. */
  animated?: boolean;
}

/** Prefijo único de los gradientes de cada instancia: en web, ids repetidos entre SVG colisionan. */
const GradientId = createContext('g');
const useFill = (name: string) => `url(#${useContext(GradientId)}-${name})`;

const INK = '#1B2E00';
const SKIN_DARK = '#7FB800';

const LABELS: Record<GeckoMood, string> = {
  neutral: 'Gecko tranquilo',
  happy: 'Gecko feliz',
  motivated: 'Gecko motivado',
  disappointed: 'Gecko decepcionado',
  proud: 'Gecko orgulloso',
};

function Eye({ cx, mood, side }: { cx: number; mood: GeckoMood; side: 1 | -1 }) {
  const skin = useFill('skin');
  const eye = useFill('eye');
  const cy = 62;
  const closed = mood === 'happy';
  const pupilRx = mood === 'motivated' ? 9 : 6.5;
  const pupilDy = mood === 'disappointed' ? 6 : 0;

  return (
    <G>
      {/* cuenca: sobresale por encima de la cabeza, rasgo típico del gecko */}
      <Circle cx={cx} cy={cy} r={27} fill={skin} />
      {closed ? (
        <>
          <Circle cx={cx} cy={cy} r={21} fill="#D4F75A" />
          <Path d={`M${cx - 14} ${cy + 5} Q${cx} ${cy - 13} ${cx + 14} ${cy + 5}`} stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Circle cx={cx} cy={cy} r={21} fill={eye} />
          <Ellipse cx={cx} cy={cy + pupilDy} rx={pupilRx} ry={14} fill={INK} />
          <Circle cx={cx - 5} cy={cy - 7 + pupilDy} r={4} fill="#FFFFFF" />
          {mood === 'disappointed' || mood === 'proud' ? (
            // párpado superior caído
            <Path
              d={`M${cx - 21.5} ${cy + (mood === 'proud' ? -4 : 1)} A21.5 21.5 0 0 1 ${cx + 21.5} ${cy + (mood === 'proud' ? -4 : 1)} Z`}
              fill={SKIN_DARK}
            />
          ) : null}
        </>
      )}
      {mood === 'motivated' ? (
        <Path d={`M${cx - 20 * side} ${cy - 30} L${cx + 16 * side} ${cy - 19}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      ) : null}
      {mood === 'disappointed' ? (
        <Path d={`M${cx - 18 * side} ${cy - 20} L${cx + 14 * side} ${cy - 29}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      ) : null}
    </G>
  );
}

function Mouth({ mood }: { mood: GeckoMood }) {
  switch (mood) {
    case 'happy':
      return (
        <G>
          <Path d="M74 103 Q100 136 126 103 Z" fill={INK} />
          <Ellipse cx={100} cy={119} rx={10} ry={6} fill="#FF7A8A" />
        </G>
      );
    case 'disappointed':
      return <Path d="M83 117 Q100 105 117 117" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    case 'motivated':
      return <Path d="M80 107 Q102 124 124 102" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    case 'proud':
      return <Path d="M76 105 Q100 126 124 105" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    default:
      return <Path d="M82 108 Q100 120 118 108" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
  }
}

function Hand({ x, y }: { x: number; y: number }) {
  const skin = useFill('skin');
  return (
    <G>
      <Circle cx={x} cy={y} r={9} fill={skin} />
      <Circle cx={x - 8} cy={y - 7} r={4.5} fill="#C9F53A" />
      <Circle cx={x} cy={y - 11} r={4.5} fill="#C9F53A" />
      <Circle cx={x + 8} cy={y - 7} r={4.5} fill="#C9F53A" />
    </G>
  );
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill="#F4FFC9"
    />
  );
}

/** Mascota de Gecko. Ilustración vectorial con volumen (gradientes y brillos) y cinco estados de ánimo. */
export function Gecko({ mood = 'neutral', size = 160, animated = true }: Props) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, bob]);

  const handsUp = mood === 'happy' || mood === 'proud';
  const handY = handsUp ? 128 : 150;

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABELS[mood]}
      style={{
        width: size,
        height: size,
        transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.025] }) }],
      }}
    >
      <GradientId.Provider value={gid}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={`${gid}-skin`} cx="38%" cy="28%" r="80%">
            <Stop offset="0" stopColor="#E4FF7A" />
            <Stop offset="0.5" stopColor="#B9F020" />
            <Stop offset="1" stopColor="#6FA500" />
          </RadialGradient>
          <RadialGradient id={`${gid}-belly`} cx="50%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#FAFFE0" />
            <Stop offset="1" stopColor="#CFF25E" />
          </RadialGradient>
          <RadialGradient id={`${gid}-eye`} cx="40%" cy="32%" r="75%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#DDE6CC" />
          </RadialGradient>
        </Defs>

        <Ellipse cx={100} cy={190} rx={56} ry={7} fill="#000000" opacity={0.35} />

        {/* cola */}
        <Path d="M124 166 C160 174 180 152 168 132 C161 120 146 124 149 135" stroke="#86C000" strokeWidth={15} strokeLinecap="round" fill="none" />
        <Path d="M128 163 C158 168 172 150 163 135" stroke="#C9F53A" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.8} />

        {/* pies */}
        <Ellipse cx={78} cy={184} rx={15} ry={8} fill={SKIN_DARK} />
        <Ellipse cx={122} cy={184} rx={15} ry={8} fill={SKIN_DARK} />

        {/* cuerpo */}
        <Ellipse cx={100} cy={152} rx={37} ry={35} fill={`url(#${gid}-skin)`} />
        <Ellipse cx={100} cy={159} rx={23} ry={24} fill={`url(#${gid}-belly)`} />

        <Hand x={64} y={handY} />
        <Hand x={136} y={handY} />

        {/* cabeza */}
        <Ellipse cx={100} cy={88} rx={64} ry={48} fill={`url(#${gid}-skin)`} />
                {/* cinta deportiva con la G de Gecko */}
        <Path d="M40 60 Q100 30 160 60 L158 74 Q100 46 42 74 Z" fill="#141614" />
        <Path d="M105.5 52.5 A6 6 0 1 0 105.5 61.5 L105.5 57.5 L101 57.5" stroke="#C5F82A" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        <Eye cx={58} mood={mood} side={1} />
        <Eye cx={142} mood={mood} side={-1} />

        <Circle cx={93} cy={97} r={2} fill={INK} opacity={0.7} />
        <Circle cx={107} cy={97} r={2} fill={INK} opacity={0.7} />
        <Mouth mood={mood} />

        {mood === 'proud' ? (
          <>
            <Sparkle x={22} y={40} s={9} />
            <Sparkle x={180} y={30} s={7} />
            <Sparkle x={170} y={96} s={5} />
          </>
        ) : null}
      </Svg>
      </GradientId.Provider>
    </Animated.View>
  );
}
