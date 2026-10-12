import { getAudioContext } from './audio';
import { deleteFile, getFile, saveFile } from '../storage/db';

const KEY = 'custom-sound';
export const MAX_CUSTOM_BYTES = 3 * 1024 * 1024;

let cached: AudioBuffer | null = null;

/** Guarda el archivo en este dispositivo (IndexedDB). Nunca sale del navegador. */
export async function setCustomSound(file: File): Promise<AudioBuffer> {
  if (file.size > MAX_CUSTOM_BYTES) throw new Error('too-big');
  const buffer = await decode(file);
  await saveFile(KEY, file, file.name);
  cached = buffer;
  return buffer;
}

export async function loadCustomSound(): Promise<{ buffer: AudioBuffer; name: string } | null> {
  const entry = await getFile(KEY);
  if (!entry) return null;
  cached ??= await decode(entry.blob);
  return { buffer: cached, name: entry.name };
}

export async function removeCustomSound() {
  cached = null;
  await deleteFile(KEY);
}

export function forgetCustomSoundCache() {
  cached = null;
}

async function decode(blob: Blob) {
  try {
    return await getAudioContext().decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error('unsupported');
  }
}
