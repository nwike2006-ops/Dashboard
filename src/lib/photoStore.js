// Minimal IndexedDB wrapper for storing photo blobs (odometer photos, oil-change stickers).
// localStorage is string-only with a ~5-10MB total quota, which a handful of photos would
// blow through; IndexedDB is built for exactly this (blobs, much higher quota).

const DB_NAME = 'life-dashboard';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(blob) {
  const id = crypto.randomUUID();
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, blob, createdAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function getPhotoBlob(id) {
  if (!id) return null;
  const db = await openDB();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record ? record.blob : null;
}

// Convenience: blob -> object URL for use in <img src>. Caller should revoke it
// (URL.revokeObjectURL) when the image unmounts to avoid piling up memory.
export async function getPhotoURL(id) {
  const blob = await getPhotoBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deletePhoto(id) {
  if (!id) return;
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
