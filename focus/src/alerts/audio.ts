let ctx: AudioContext | null = null;

/** AudioContext compartido. Hay que "desbloquearlo" dentro de un toque del usuario. */
export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export async function unlockAudio() {
  const c = getAudioContext();
  if (c.state !== 'running') await c.resume().catch(() => {});
}
