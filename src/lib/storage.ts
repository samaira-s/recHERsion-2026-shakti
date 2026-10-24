import { openDB, DBSchema } from 'idb';

interface ShaktiDB extends DBSchema {
  vaultMeta: {
    key: string;
    value: {
      salt: string;
      checkCiphertext: string;
      checkIv: string;
      duressSalt?: string;
      duressCheckCiphertext?: string;
      duressCheckIv?: string;
    };
  };
  encryptedCases: {
    key: string;
    value: {
      id: string;
      ciphertext: string;
      iv: string;
      isDuress?: boolean;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'shakti_secure_vault_db';
const DB_VERSION = 1;

export async function getDb() {
  return openDB<ShaktiDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('vaultMeta')) {
        db.createObjectStore('vaultMeta');
      }
      if (!db.objectStoreNames.contains('encryptedCases')) {
        db.createObjectStore('encryptedCases', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    },
  });
}

export async function saveVaultMeta(meta: any) {
  const db = await getDb();
  await db.put('vaultMeta', meta, 'meta');
}

export async function getVaultMeta() {
  const db = await getDb();
  return db.get('vaultMeta', 'meta');
}

export async function saveEncryptedCase(id: string, ciphertext: string, iv: string, isDuress = false) {
  const db = await getDb();
  await db.put('encryptedCases', { id, ciphertext, iv, isDuress });
}

export async function getEncryptedCases() {
  const db = await getDb();
  return db.getAll('encryptedCases');
}

export async function getEncryptedCase(id: string) {
  const db = await getDb();
  return db.get('encryptedCases', id);
}

export async function deleteEncryptedCase(id: string) {
  const db = await getDb();
  await db.delete('encryptedCases', id);
}

export async function saveAppSettings(settings: any) {
  const db = await getDb();
  await db.put('settings', settings, 'appSettings');
}

export async function getAppSettings() {
  const db = await getDb();
  return db.get('settings', 'appSettings');
}

export async function wipeAllVaultData() {
  const db = await getDb();
  await db.clear('vaultMeta');
  await db.clear('encryptedCases');
  await db.clear('settings');
}
