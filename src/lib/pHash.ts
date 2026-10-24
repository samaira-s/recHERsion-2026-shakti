/**
 * Simple perceptual hashing (pHash) simulation / calculation for image comparison.
 */

export async function computeImagePHash(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('0000000000000000');
        return;
      }
      ctx.drawImage(img, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      const pixels = imgData.data;
      
      let totalGrayscale = 0;
      const gray = new Array(32 * 32);
      for (let i = 0; i < pixels.length; i += 4) {
        const g = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        const idx = i / 4;
        gray[idx] = g;
        totalGrayscale += g;
      }

      const avg = totalGrayscale / (32 * 32);
      let hash = '';
      for (let i = 0; i < gray.length; i++) {
        hash += gray[i] >= avg ? '1' : '0';
      }

      // Compress binary string to hex or smaller hash representation
      let hexHash = '';
      for (let i = 0; i < hash.length; i += 4) {
        const nibble = hash.slice(i, i + 4);
        hexHash += parseInt(nibble, 2).toString(16);
      }

      resolve(hexHash);
    };
    img.onerror = () => {
      resolve('ffffffffffffffff');
    };
    img.src = imageSrc;
  });
}

export function comparePHashes(hash1: string, hash2: string): { distance: number; matchType: string } {
  let distance = 0;
  const len = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < len; i++) {
    const v1 = parseInt(hash1[i], 16);
    const v2 = parseInt(hash2[i], 16);
    const xor = v1 ^ v2;
    // count set bits in xor
    let bits = xor;
    while (bits > 0) {
      if (bits & 1) distance++;
      bits >>= 1;
    }
  }

  let matchType = 'different';
  if (distance <= 4) {
    matchType = 'likely the same image (cropped or recompressed)';
  } else if (distance <= 12) {
    matchType = 'similar image or slight modification';
  }

  return { distance, matchType };
}
