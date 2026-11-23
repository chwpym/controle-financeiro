import type { Category, Company, Contact, SyncMutation, Transaction, UserProfile } from '../types';

const DB_NAME = 'fluxoclaro_offline_db';
const DB_VERSION = 1;

const STORE_SNAPSHOTS = 'snapshots';
const STORE_QUEUE = 'sync_queue';

export interface UserSnapshotCache {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  transactions: Transaction[];
  companies?: Company[];
  lastSyncedAt: string | null;
}

const SESSION_KEY = 'fluxoclaro_session_v1';

export interface SavedSession {
  token: string;
  user: UserProfile;
}

export function getSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    if (!parsed?.token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: SavedSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        store.createIndex('by_user', 'userId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshotCache(userId: string): Promise<UserSnapshotCache | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const req = tx.objectStore(STORE_SNAPSHOTS).get(userId);
      req.onsuccess = () => resolve((req.result as UserSnapshotCache) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveSnapshotCache(cache: UserSnapshotCache): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).put(cache);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IDB errors
  }
}

export async function enqueueSyncMutation(mutation: SyncMutation): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPendingMutations(userId: string): Promise<SyncMutation[]> {
  try {
    const db = await openDB();
    const rows = await new Promise<SyncMutation[]>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const idx = tx.objectStore(STORE_QUEUE).index('by_user');
      const req = idx.getAll(userId);
      req.onsuccess = () => resolve((req.result as SyncMutation[]) || []);
      req.onerror = () => reject(req.error);
    });
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function removeSyncMutation(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
