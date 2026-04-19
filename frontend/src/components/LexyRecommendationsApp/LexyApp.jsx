import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { getLexyRecommendations } from './lexyRecommender';
import LexyForm from './Form';
import Recommendations from './Recommendations';
import WebcamCapture from './Components/webCam';
import FaceIssuesPreview from './Components/FaceIssuesPreview';
import { analyzeLexyFace } from './lexyFaceAnalyzer';

const LexyApp = ({ embedded = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!imageSrc) return;
      setAnalysing(true);
      setAnalysisError(null);
      try {
        const data = await analyzeLexyFace(imageSrc);
        if (!cancelled) setPrefill(data);
      } catch (e) {
        if (!cancelled) {
          setPrefill(null);
          setAnalysisError(e?.message || 'Face analysis failed');
        }
      } finally {
        if (!cancelled) setAnalysing(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  const handleSubmit = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLexyRecommendations(payload);
      setResult(data);
    } catch (e) {
      setError(e?.message || 'Failed to generate recommendations');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Container maxWidth={false} sx={{ pt: embedded ? 0.5 : 2, pb: embedded ? 1.5 : 2 }}>
      {!embedded ? (
        <>
          <Typography variant="h5" component="div" textAlign="center" sx={{ mt: 0 }}>
            Milaari Recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 0.5 }}>
            Fill your skin details to get personalized skincare & makeup picks.
          </Typography>
        </>
      ) : null}

      {error ? (
        <Typography variant="body2" color="error" textAlign="center" sx={{ mt: 1 }}>
          {error}
        </Typography>
      ) : null}

      <Container maxWidth="lg" sx={{ mt: embedded ? 1 : 2, px: embedded ? 0.5 : 1 }}>
        <Grid container spacing={embedded ? 1.25 : 2} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            {imageSrc ? (
              <>
                <FaceIssuesPreview imageSrc={imageSrc} metrics={prefill} showAnnotations={false} />
                <div className="flex justify-center gap-2 mt-3">
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setImageSrc(null);
                      setPrefill(null);
                      setAnalysisError(null);
                      setResult(null);
                    }}
                  >
                    Retake
                  </Button>
                </div>
              </>
            ) : (
              <WebcamCapture setImageSrc={setImageSrc} embedded={embedded} />
            )}

            {analysisError ? (
              <Typography variant="body2" color="error" textAlign="center" sx={{ mt: 1 }}>
                {analysisError}
              </Typography>
            ) : null}
            {analysing ? (
              <div className="flex items-center justify-center py-2">
                <CircularProgress size={22} />
              </div>
            ) : null}
          </Grid>

          <Grid item xs={12} md={6}>
            <LexyForm
              title="Your Details"
              maxWidth={embedded ? 'sm' : false}
              compact={embedded}
              disableSubmit={loading || analysing}
              prefillData={prefill}
              onSubmit={handleSubmit}
            />
          </Grid>
        </Grid>
      </Container>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <CircularProgress size={26} />
        </div>
      ) : null}

      {result ? (
        <>
          <div className="flex justify-center mt-2">
            <Button variant="outlined" onClick={() => setResult(null)}>
              Edit details
            </Button>
          </div>
          <Recommendations data={result} />
        </>
      ) : null}
    </Container>
  );
};

export default LexyApp;
