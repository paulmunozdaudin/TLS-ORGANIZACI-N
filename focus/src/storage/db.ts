import { openDB, type DBSchema } from 'idb';
import type { SessionRecord } from '../session/types';

interface FocusDB extends DBSchema {
  sessions: { key: string; value: SessionRecord; indexes: { startedAt: number } };
  files: { key: string; value: { blob: Blob; name: string } };
}

const dbPromise = openDB<FocusDB>('focus', 1, {
  upgrade(db) {
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('startedAt', 'startedAt');
    db.createObjectStore('files');
  },
});

export async function saveSession(session: SessionRecord) {
  await (await dbPromise).put('sessions', session);
}

export async function listSessions(): Promise<SessionRecord[]> {
  return (await dbPromise).getAllFromIndex('sessions', 'startedAt');
}

export async function saveFile(key: string, blob: Blob, name: string) {
  await (await dbPromise).put('files', { blob, name }, key);
}

export async function getFile(key: string) {
  return (await dbPromise).get('files', key);
}

export async function deleteFile(key: string) {
  await (await dbPromise).delete('files', key);
}

export async function clearAll() {
  const db = await dbPromise;
  await Promise.all([db.clear('sessions'), db.clear('files')]);
}
