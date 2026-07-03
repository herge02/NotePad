// Persistance locale des relevés : IndexedDB en priorité, repli localStorage.
// Tout est asynchrone pour garder une API unique.

import type { ReleveData, ReleveMeta } from "./types";

const DB_NAME = "releve-batiment";
const DB_VERSION = 1;
const STORE = "releves";
const LS_PREFIX = "releve:";
const LS_ACTIVE = "releve-active-id";

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function saveReleve(releve: ReleveData): Promise<void> {
  if (hasIndexedDB()) {
    try {
      await tx("readwrite", (s) => s.put(releve));
      return;
    } catch {
      // repli localStorage ci-dessous
    }
  }
  localStorage.setItem(LS_PREFIX + releve.id, JSON.stringify(releve));
}

export async function loadReleve(id: string): Promise<ReleveData | undefined> {
  if (hasIndexedDB()) {
    try {
      const r = await tx<ReleveData | undefined>("readonly", (s) => s.get(id) as IDBRequest<ReleveData | undefined>);
      if (r) return r;
    } catch {
      // repli localStorage ci-dessous
    }
  }
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_PREFIX + id) : null;
  return raw ? (JSON.parse(raw) as ReleveData) : undefined;
}

export async function listReleves(): Promise<ReleveMeta[]> {
  const metas: ReleveMeta[] = [];
  if (hasIndexedDB()) {
    try {
      const all = await tx<ReleveData[]>("readonly", (s) => s.getAll() as IDBRequest<ReleveData[]>);
      for (const r of all) {
        metas.push({ id: r.id, reference: r.reference, updatedAt: r.updatedAt });
      }
    } catch {
      // ignore, on complète avec localStorage
    }
  }
  if (typeof localStorage !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        try {
          const r = JSON.parse(localStorage.getItem(key)!) as ReleveData;
          if (!metas.some((m) => m.id === r.id)) {
            metas.push({ id: r.id, reference: r.reference, updatedAt: r.updatedAt });
          }
        } catch {
          // entrée corrompue : ignorée
        }
      }
    }
  }
  metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return metas;
}

export async function deleteReleve(id: string): Promise<void> {
  if (hasIndexedDB()) {
    try {
      await tx("readwrite", (s) => s.delete(id));
    } catch {
      // repli localStorage ci-dessous
    }
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LS_PREFIX + id);
  }
}

export function getActiveId(): string | null {
  return typeof localStorage !== "undefined" ? localStorage.getItem(LS_ACTIVE) : null;
}

export function setActiveId(id: string): void {
  localStorage.setItem(LS_ACTIVE, id);
}
