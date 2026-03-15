import { useEffect, useMemo, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

import Typography from '@mui/material/Typography';

import './FaceIssuesPreview.css';

function acneDots(count, box) {
  const pts = [];
  const rng = (i) => {
    const x = Math.sin(i * 999) * 10000;
    return x - Math.floor(x);
  };

  const regions = [
    { x0: 0.18, y0: 0.52, x1: 0.42, y1: 0.78 },
    { x0: 0.58, y0: 0.52, x1: 0.82, y1: 0.78 },
    { x0: 0.32, y0: 0.18, x1: 0.68, y1: 0.38 },
    { x0: 0.46, y0: 0.42, x1: 0.54, y1: 0.62 },
  ];

  for (let i = 0; i < count; i++) {
    const r = regions[i % regions.length];
    const u = rng(i + 1);
    const v = rng(i + 17);
    pts.push({
      x: box.x + box.w * (r.x0 + (r.x1 - r.x0) * u),
      y: box.y + box.h * (r.y0 + (r.y1 - r.y0) * v),
      radius: 2.5 + 3.5 * rng(i + 33),
    });
  }
  return pts;
}

const FaceIssuesPreview = ({ imageSrc, metrics, showAnnotations = true }) => {
  const imgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [faceBox, setFaceBox] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const MODEL_URI = process.env.PUBLIC_URL + '/lexy-models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI);
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFaceBox(null);
  }, [imageSrc]);

  const onImgLoad = async () => {
    const imgEl = imgRef.current;
    if (!imgEl) return;

    setImgSize({ w: imgEl.naturalWidth || imgEl.width || 1, h: imgEl.naturalHeight || imgEl.height || 1 });

    try {
      const det = await faceapi.detectSingleFace(
        imgEl,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
      );
      if (!det) {
        setFaceBox(null);
        return;
      }
      setFaceBox({ x: det.box.x, y: det.box.y, w: det.box.width, h: det.box.height });
    } catch {
      setFaceBox(null);
    }
  };

  const skinType = metrics?.type ? String(metrics.type).toLowerCase() : null;
  const acne = metrics?.acne ? String(metrics.acne).toLowerCase() : null;

  const overlay = useMemo(() => {
    if (!faceBox) return null;
    const box = faceBox;

    const tzone = [
      `M ${box.x + box.w * 0.32} ${box.y + box.h * 0.16}`,
      `L ${box.x + box.w * 0.68} ${box.y + box.h * 0.16}`,
      `L ${box.x + box.w * 0.62} ${box.y + box.h * 0.42}`,
      `L ${box.x + box.w * 0.38} ${box.y + box.h * 0.42}`,
      'Z',
      `M ${box.x + box.w * 0.46} ${box.y + box.h * 0.42}`,
      `L ${box.x + box.w * 0.54} ${box.y + box.h * 0.42}`,
      `L ${box.x + box.w * 0.56} ${box.y + box.h * 0.70}`,
      `L ${box.x + box.w * 0.44} ${box.y + box.h * 0.70}`,
      'Z',
    ].join(' ');

    const leftCheek = `M ${box.x + box.w * 0.18} ${box.y + box.h * 0.56}
      C ${box.x + box.w * 0.14} ${box.y + box.h * 0.70}, ${box.x + box.w * 0.20} ${box.y + box.h * 0.84}, ${box.x + box.w * 0.36} ${box.y + box.h * 0.86}
      C ${box.x + box.w * 0.50} ${box.y + box.h * 0.86}, ${box.x + box.w * 0.48} ${box.y + box.h * 0.66}, ${box.x + box.w * 0.38} ${box.y + box.h * 0.56}
      Z`;

    const rightCheek = `M ${box.x + box.w * 0.82} ${box.y + box.h * 0.56}
      C ${box.x + box.w * 0.86} ${box.y + box.h * 0.70}, ${box.x + box.w * 0.80} ${box.y + box.h * 0.84}, ${box.x + box.w * 0.64} ${box.y + box.h * 0.86}
      C ${box.x + box.w * 0.50} ${box.y + box.h * 0.86}, ${box.x + box.w * 0.52} ${box.y + box.h * 0.66}, ${box.x + box.w * 0.62} ${box.y + box.h * 0.56}
      Z`;

    const foreheadBlob = `M ${box.x + box.w * 0.26} ${box.y + box.h * 0.14}
      C ${box.x + box.w * 0.34} ${box.y + box.h * 0.06}, ${box.x + box.w * 0.66} ${box.y + box.h * 0.06}, ${box.x + box.w * 0.74} ${box.y + box.h * 0.14}
      C ${box.x + box.w * 0.82} ${box.y + box.h * 0.24}, ${box.x + box.w * 0.76} ${box.y + box.h * 0.38}, ${box.x + box.w * 0.62} ${box.y + box.h * 0.40}
      C ${box.x + box.w * 0.50} ${box.y + box.h * 0.41}, ${box.x + box.w * 0.50} ${box.y + box.h * 0.36}, ${box.x + box.w * 0.38} ${box.y + box.h * 0.40}
      C ${box.x + box.w * 0.24} ${box.y + box.h * 0.38}, ${box.x + box.w * 0.18} ${box.y + box.h * 0.24}, ${box.x + box.w * 0.26} ${box.y + box.h * 0.14}
      Z`;

    const overlays = [];

    if (skinType === 'oil' || skinType === 'oily') {
      overlays.push({ d: tzone, className: 'issueRegion issueRegion--shine' });
    }

    if (skinType === 'dry') {
      overlays.push({ d: leftCheek, className: 'issueRegion issueRegion--dry' });
      overlays.push({ d: rightCheek, className: 'issueRegion issueRegion--dry' });
    }

    if (acne === 'moderate' || acne === 'severe') {
      overlays.push({ d: leftCheek, className: 'issueRegion issueRegion--acne' });
      overlays.push({ d: rightCheek, className: 'issueRegion issueRegion--acne' });
      overlays.push({ d: foreheadBlob, className: 'issueRegion issueRegion--acne' });
    }

    return overlays;
  }, [faceBox, skinType, acne]);

  const dots = useMemo(() => {
    if (!faceBox) return [];
    if (acne === 'low') return acneDots(6, faceBox);
    if (acne === 'moderate') return acneDots(14, faceBox);
    if (acne === 'severe') return acneDots(22, faceBox);
    return [];
  }, [faceBox, acne]);

  const viewBox = `0 0 ${imgSize.w} ${imgSize.h}`;

  return (
    <div className="facePreviewRoot">
      <Typography variant="h6" textAlign="center" sx={{ mb: 1 }}>
        {loading ? 'Analysing photo…' : 'Captured photo'}
      </Typography>

      <div className="facePreviewFrame">
        <img ref={imgRef} src={imageSrc} alt="Captured" className="facePreviewImg" onLoad={onImgLoad} />

        {showAnnotations ? (
          <svg className="facePreviewOverlay" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
            {overlay && overlay.map((o, idx) => <path key={idx} d={o.d} className={o.className} />)}

            {dots.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r={p.radius} className="issueDot" />
            ))}
          </svg>
        ) : null}
      </div>

      {showAnnotations ? (
        <div className="facePreviewLegend">
          <div className="legendItem">
            <span className="swatch swatch--acne" />Acne: {metrics?.acne || '—'}
          </div>
          <div className="legendItem">
            <span className="swatch swatch--shine" />Skin type: {metrics?.type || '—'}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FaceIssuesPreview;
