import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

import './webCam.css';

import Typography from '@mui/material/Typography';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

const aspectRatio = 4 / 3;
const thresholdPercentFace = 0.75;
const thresholdFaceScore = 0.65;

const OVAL_GUIDE = {
  cx: 0.5,
  cy: 0.52,
  rx: 0.34,
  ry: 0.44,
};

function isPointInsideEllipse(px, py, ellipse) {
  const dx = (px - ellipse.cx) / ellipse.rx;
  const dy = (py - ellipse.cy) / ellipse.ry;
  return dx * dx + dy * dy <= 1;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function computeFrameBrightness(videoEl, canvasEl) {
  if (!videoEl || !canvasEl || videoEl.readyState < 2) return null;
  const w = 64;
  const h = 48;
  canvasEl.width = w;
  canvasEl.height = h;
  const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  const n = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return sum / n;
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowDimensions;
}

const WebcamCapture = ({ setImageSrc, embedded = false }) => {
  const { height: winH, width: winW } = useWindowDimensions();
  const MAX_CAM_HEIGHT = embedded ? 300 : 420;
  const MIN_CAM_HEIGHT = embedded ? 200 : 260;

  let camHeight = clamp(Math.round(winH * (embedded ? 0.36 : 0.55)), MIN_CAM_HEIGHT, MAX_CAM_HEIGHT);
  let camWidth = Math.round(camHeight / aspectRatio);

  const maxAllowedWidth = Math.round(winW * 0.96);
  if (camWidth > maxAllowedWidth) {
    camWidth = maxAllowedWidth;
    camHeight = Math.round(camWidth * aspectRatio);
  }

  const videoConstraints = {
    height: camHeight,
    width: camWidth,
    facingMode: 'user',
  };

  const webcamRef = useRef(null);
  const brightnessCanvasRef = useRef(null);
  const intervalRef = useRef(null);
  const processingRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const hasCapturedRef = useRef(false);
  const lastFaceAreaRatioRef = useRef(0);
  const lastFaceOkRef = useRef(false);

  const capture = useCallback(() => {
    if (hasCapturedRef.current) return;
    if (!lastFaceOkRef.current) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    hasCapturedRef.current = true;
    setImageSrc(imageSrc);
  }, [setImageSrc]);

  const [initialising, setInitialising] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URI = process.env.PUBLIC_URL + '/lexy-models';
      setInitialising(true);
      await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI)]);
      setModelsReady(true);
      setInitialising(false);
    };
    loadModels();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  const [lightingState, setLightingState] = useState('Not Good');
  const [lookStraightState, setLookStraightState] = useState('Not Good');
  const [facePositionState, setFacePositionState] = useState('Not Good');
  const [countdown, setCountdown] = useState(null);
  const [stableAllSet, setStableAllSet] = useState(false);

  const stableTimerRef = useRef(null);
  const isOkOrGood = (s) => s === 'Ok' || s === 'Good';
  const allSet = modelsReady && isOkOrGood(lightingState) && isOkOrGood(lookStraightState) && isOkOrGood(facePositionState);

  useEffect(() => {
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = null;
    }
    stableTimerRef.current = setTimeout(() => setStableAllSet(!!allSet), 650);
    return () => {
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
    };
  }, [allSet]);

  useEffect(() => {
    if (!stableAllSet) {
      setCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    if (hasCapturedRef.current) return;
    if (countdownTimerRef.current) return;
    if (countdown !== null) return;

    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setTimeout(() => capture(), 50);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stableAllSet, countdown, capture]);

  const handleVideoOnPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(async () => {
      if (!modelsReady) return;
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        let detections = [];
        const videoEl = webcamRef.current?.video;
        if (videoEl) {
          detections = await faceapi.detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));
        }

        const brightness = computeFrameBrightness(videoEl, brightnessCanvasRef.current);
        let nextLightingState = 'Ok';
        if (brightness == null) {
          nextLightingState = 'Ok';
        } else if (brightness < 45 || brightness > 240) {
          nextLightingState = 'Not Good';
        } else if (brightness < 70 || brightness > 220) {
          nextLightingState = 'Ok';
        } else {
          nextLightingState = 'Good';
        }
        setLightingState(nextLightingState);

        // Face position and straightness
        if (!detections || detections.length === 0) {
          setLookStraightState('Not Good');
          setFacePositionState('Not Good');
          return;
        }

        const det = detections[0];
        const box = det.box;
        const vw = videoEl?.videoWidth || 1;
        const vh = videoEl?.videoHeight || 1;
        const area = (box.width * box.height) / (vw * vh);
        const faceOk = area >= thresholdPercentFace && det.score >= thresholdFaceScore;

        lastFaceAreaRatioRef.current = area;
        lastFaceOkRef.current = faceOk;

        const centerX = (box.x + box.width / 2) / vw;
        const centerY = (box.y + box.height / 2) / vh;
        const inOval = isPointInsideEllipse(centerX, centerY, OVAL_GUIDE);

        setFacePositionState(inOval && faceOk ? 'Good' : inOval ? 'Ok' : 'Not Good');
        setLookStraightState(faceOk ? 'Good' : 'Ok');
      } catch {
        setLookStraightState('Ok');
        setFacePositionState('Ok');
        setLightingState('Ok');
      } finally {
        processingRef.current = false;
      }
    }, 450);
  };

  const pillClass = (state) =>
    state === 'Good' ? 'webcamStatusPill webcamStatusPill--good' : state === 'Ok' ? 'webcamStatusPill webcamStatusPill--ok' : 'webcamStatusPill webcamStatusPill--notgood';

  const validateFaceCoverageOnDataUrl = useCallback(
    async (dataUrl) => {
      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const det = await faceapi.detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        );

        if (!det) return { ok: false, reason: 'No face detected' };
        const vw = img.naturalWidth || img.width || 1;
        const vh = img.naturalHeight || img.height || 1;
        const area = (det.box.width * det.box.height) / (vw * vh);
        const ok = area >= thresholdPercentFace && det.score >= thresholdFaceScore;
        return { ok, areaRatio: area, score: det.score };
      } catch {
        return { ok: false, reason: 'Could not validate photo' };
      }
    },
    []
  );

  const handleUpload = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;

      setUploadError(null);
      setUploadBusy(true);

      try {
        if (!modelsReady) {
          setUploadError('Models are still loading. Please wait a moment and try again.');
          return;
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const result = await validateFaceCoverageOnDataUrl(dataUrl);
        if (!result.ok) {
          setUploadError(
            `Please upload a closer face photo (face must cover >75% of the image).`
          );
          return;
        }

        hasCapturedRef.current = true;
        setImageSrc(dataUrl);
      } catch {
        setUploadError('Upload failed. Please try another photo.');
      } finally {
        setUploadBusy(false);
      }
    },
    [modelsReady, setImageSrc, validateFaceCoverageOnDataUrl]
  );

  return (
    <div className="webcamCaptureRoot">
      <Typography variant="h6" textAlign="center" sx={{ mb: 1 }}>
        {initialising ? 'Starting camera…' : 'Camera'}
      </Typography>

      <div className="webcamStatusRow">
        <div className={pillClass(lightingState)}>
          <div>Lighting</div>
          <div>{lightingState}</div>
        </div>
        <div className={pillClass(lookStraightState)}>
          <div>Look straight</div>
          <div>{lookStraightState}</div>
        </div>
        <div className={pillClass(facePositionState)}>
          <div>Face position</div>
          <div>{facePositionState}</div>
        </div>
      </div>

      <div className="webcamFrame">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onPlay={handleVideoOnPlay}
          className="webcamVideo webcamVideo--mirrored"
        />

        <svg className="webcamOverlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ellipse
            cx={OVAL_GUIDE.cx * 100}
            cy={OVAL_GUIDE.cy * 100}
            rx={OVAL_GUIDE.rx * 100}
            ry={OVAL_GUIDE.ry * 100}
            fill="transparent"
            stroke={allSet ? '#2e7d32' : '#ffffff'}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>

        {countdown !== null ? <div className="webcamCountdown">{countdown}</div> : null}

        <canvas ref={brightnessCanvasRef} style={{ display: 'none' }} />
      </div>

      <Typography variant="body2" textAlign="center" className="webcamHelpText">
        Hold still, align your face inside the oval, and move closer until your face fills most of the frame.
      </Typography>

      <div style={{ marginTop: 10 }}>
        <Typography variant="body2" textAlign="center" sx={{ opacity: 0.9 }}>
          Don&apos;t want to use live camera? Upload a photo instead.
        </Typography>
        <div className="flex justify-center mt-2">
          <label className="inline-flex items-center justify-center rounded-full px-4 py-2 border border-[var(--lexy-maroon-25)] text-xs font-medium text-[var(--lexy-maroon)] bg-white hover:bg-[var(--lexy-maroon-5)] cursor-pointer">
            {uploadBusy ? 'Validating…' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploadBusy || !modelsReady} style={{ display: 'none' }} />
          </label>
        </div>
        {uploadError ? (
          <Typography variant="body2" textAlign="center" color="error" sx={{ mt: 1 }}>
            {uploadError}
          </Typography>
        ) : null}
      </div>
    </div>
  );
};

export default WebcamCapture;
