function skinToneToToneValue(skinTone) {
  const v = String(skinTone || '').trim().toLowerCase();
  if (v === 'fair') return 1;
  if (v === 'light') return 2;
  if (v === 'medium') return 3;
  if (v === 'tan') return 4;
  if (v === 'deep') return 5;
  return 3;
}

async function estimateToneLocally(imageDataUrl) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const w = Math.max(1, img.naturalWidth || img.width || 1);
          const h = Math.max(1, img.naturalHeight || img.height || 1);
          canvas.width = Math.min(320, w);
          canvas.height = Math.min(320, h);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return resolve(3);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Sample the central region where the face usually is.
          const rx = Math.floor(canvas.width * 0.28);
          const ry = Math.floor(canvas.height * 0.22);
          const rw = Math.floor(canvas.width * 0.44);
          const rh = Math.floor(canvas.height * 0.52);

          const { data } = ctx.getImageData(rx, ry, rw, rh);
          let sum = 0;
          let n = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Skip very dark pixels (hair/background) and very bright pixels (glare)
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luma < 25 || luma > 245) continue;
            sum += luma;
            n++;
          }

          const avg = n ? sum / n : 140;

          // Map average luma to 1..6 tone scale (rough heuristic).
          if (avg >= 200) return resolve(1);
          if (avg >= 175) return resolve(2);
          if (avg >= 150) return resolve(3);
          if (avg >= 125) return resolve(4);
          if (avg >= 100) return resolve(5);
          return resolve(6);
        } catch {
          resolve(3);
        }
      };
      img.onerror = () => resolve(3);
      img.src = imageDataUrl;
    } catch {
      resolve(3);
    }
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = String(dataUrl || '').split(',');
  const mime = /data:(.*?);base64/.exec(meta || '')?.[1] || 'image/jpeg';
  const bytes = atob(b64 || '');
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function analyzeLexyFace(imageDataUrl) {
  try {
    const form = new FormData();
    form.append('image', dataUrlToBlob(imageDataUrl), 'lexy.jpg');

    const res = await fetch('/api/v1/lexy/analyze-face', {
      method: 'POST',
      body: form,
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.message || data?.error || `Face analysis failed (${res.status})`;
      throw new Error(msg);
    }

    return {
      tone: skinToneToToneValue(data?.skinTone),
      type: 'Normal',
      acne: 'Low',
      _raw: data,
    };
  } catch {
    const tone = await estimateToneLocally(imageDataUrl);
    return {
      tone,
      type: 'Normal',
      acne: 'Low',
      _raw: null,
      _localEstimate: true,
    };
  }
}
