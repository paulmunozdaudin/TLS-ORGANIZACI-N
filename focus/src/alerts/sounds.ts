import { getAudioContext } from './audio';

export type BuiltinSoundId = 'bell' | 'gong' | 'beep' | 'double-ding' | 'rise' | 'chime' | 'breath';
export type SoundId = BuiltinSoundId | 'custom';

type Synth = (ctx: AudioContext, out: AudioNode, t: number) => number;

/** Un tono con envolvente: ataque corto y caída exponencial. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  { freq, start, attack = 0.005, decay, gain = 1, type = 'sine' as OscillatorType, endFreq }: {
    freq: number; start: number; attack?: number; decay: number; gain?: number; type?: OscillatorType; endFreq?: number;
  },
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + attack + decay * 0.6);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + attack + decay + 0.05);
}

const SYNTHS: Record<BuiltinSoundId, Synth> = {
  bell: (ctx, out, t) => {
    tone(ctx, out, { freq: 880, start: t, decay: 1.6, gain: 0.5 });
    tone(ctx, out, { freq: 880 * 2.76, start: t, decay: 0.7, gain: 0.12 });
    return 1.7;
  },
  gong: (ctx, out, t) => {
    const partials: [number, number, number][] = [[1, 0.6, 3.5], [1.48, 0.3, 2.6], [2.1, 0.18, 2], [2.92, 0.1, 1.4]];
    for (const [ratio, gain, decay] of partials) {
      tone(ctx, out, { freq: 98 * ratio, start: t, attack: 0.03, decay, gain });
    }
    return 3.6;
  },
  beep: (ctx, out, t) => {
    tone(ctx, out, { freq: 1046, start: t, attack: 0.01, decay: 0.28, gain: 0.35, type: 'triangle' });
    return 0.35;
  },
  'double-ding': (ctx, out, t) => {
    tone(ctx, out, { freq: 1318, start: t, decay: 0.5, gain: 0.4 });
    tone(ctx, out, { freq: 1568, start: t + 0.18, decay: 0.7, gain: 0.4 });
    return 0.95;
  },
  rise: (ctx, out, t) => {
    tone(ctx, out, { freq: 440, endFreq: 880, start: t, attack: 0.08, decay: 0.8, gain: 0.35 });
    return 0.95;
  },
  chime: (ctx, out, t) => {
    [523.25, 659.25, 783.99].forEach((f, i) => tone(ctx, out, { freq: f, start: t + i * 0.16, decay: 1.1, gain: 0.32 }));
    return 1.5;
  },
  breath: (ctx, out, t) => {
    tone(ctx, out, { freq: 330, start: t, attack: 0.6, decay: 1.2, gain: 0.3, type: 'triangle' });
    return 1.9;
  },
};

export const BUILTIN_SOUNDS: { id: BuiltinSoundId; label: string }[] = [
  { id: 'bell', label: 'Campanita suave' },
  { id: 'chime', label: 'Carillón' },
  { id: 'double-ding', label: 'Ding doble' },
  { id: 'rise', label: 'Tono ascendente' },
  { id: 'breath', label: 'Respiro' },
  { id: 'gong', label: 'Gong' },
  { id: 'beep', label: 'Pitido' },
];

/** Reproduce un sonido integrado o un AudioBuffer propio. Devuelve la duración aproximada (s). */
export function playSound(sound: BuiltinSoundId | AudioBuffer, volume: number): number {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);
  const t = ctx.currentTime + 0.02;
  if (typeof sound === 'string') return SYNTHS[sound](ctx, master, t);
  const src = ctx.createBufferSource();
  src.buffer = sound;
  src.connect(master);
  src.start(t);
  return sound.duration;
}
