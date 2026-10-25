/**
 * Web Crypto AES-GCM and PBKDF2 encryption utilities.
 * 310,000 iterations for PBKDF2.
 */

export async function generateSalt(): Promise<Uint8Array> {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 310000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(key: CryptoKey, data: any): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const encoded = enc.encode(JSON.stringify(data));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptData(key: CryptoKey, ciphertextStr: string, ivStr: string): Promise<any> {
  const decodedCiph = Uint8Array.from(atob(ciphertextStr), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    decodedCiph
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Buffer(buffer: ArrayBuffer | ArrayBufferView): Promise<string> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

