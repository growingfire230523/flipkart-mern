import { useMemo, useState } from 'react';

import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

const skinToneValues = [1, 2, 3, 4, 5, 6];
const skinToneColors = [
  'rgb(249, 245, 236)',
  'rgb(250, 245, 234)',
  'rgb(240, 227, 171)',
  'rgb(206, 172, 104)',
  'rgb(105, 59, 41)',
  'rgb(33, 28, 40)',
];

const skinTypes = ['All', 'Oily', 'Normal', 'Dry', 'Combination'];
const acnes = ['Low', 'Moderate', 'Severe'];
const otherConcerns = [
  'sensitive',
  'fine lines',
  'wrinkles',
  'redness',
  'dull',
  'pore',
  'pigmentation',
  'blackheads',
  'whiteheads',
  'blemishes',
  'dark circles',
  'eye bags',
  'dark spots',
];

const DEFAULT_PREFILL = {
  tone: 3,
  type: 'Normal',
  acne: 'Low',
};

const DEFAULT_FEATURES = {
  normal: false,
  dry: false,
  oily: false,
  combination: false,
  acne: false,
  sensitive: false,
  'fine lines': false,
  wrinkles: false,
  redness: false,
  dull: false,
  pore: false,
  pigmentation: false,
  blackheads: false,
  whiteheads: false,
  blemishes: false,
  'dark circles': false,
  'eye bags': false,
  'dark spots': false,
};

const LexyForm = ({
  prefillData = null,
  title = 'Your Details',
  maxWidth = 'xs',
  sx = null,
  compact = false,
  disableSubmit = false,
  onSubmit,
}) => {
  const effectivePrefill = useMemo(() => {
    if (prefillData) return prefillData;
    return DEFAULT_PREFILL;
  }, [prefillData]);

  const sectionMt = compact ? 1.25 : 2;
  const controlSize = compact ? 'small' : 'medium';

  const [currType, setCurrType] = useState(effectivePrefill.type);
  const [currTone, setCurrTone] = useState(parseInt(effectivePrefill.tone, 10));
  const [currAcne, setCurrAcne] = useState(effectivePrefill.acne);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);

  const handleConcernToggle = (event) => {
    const { name, checked } = event.target;
    setFeatures((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async () => {
    const next = { ...features };

    // Skin type flags
    if (currType === 'All') {
      next.normal = true;
      next.dry = true;
      next.oily = true;
      next.combination = true;
    } else {
      const key = String(currType).toLowerCase();
      if (key === 'normal' || key === 'dry' || key === 'oily' || key === 'combination') next[key] = true;
    }

    if (currAcne !== 'Low') next.acne = true;

    const numericFeatures = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v ? 1 : 0]));

    if (typeof onSubmit === 'function') {
      await onSubmit({ features: numericFeatures, type: currType, tone: currTone });
    }
  };

  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        mt: compact ? 1 : 2,
        ...(sx || {}),
        ...(compact
          ? {
              '& .MuiTypography-root': { lineHeight: 1.2 },
              '& .MuiFormLabel-root': { fontSize: '0.85rem' },
              '& .MuiInputLabel-root': { fontSize: '0.85rem' },
              '& .MuiFormControlLabel-label': { fontSize: '0.85rem' },
              '& .MuiSvgIcon-root': { fontSize: '1.05rem' },
            }
          : null),
      }}
    >
      <Typography variant={compact ? 'subtitle1' : 'h6'} component="div" textAlign="center">
        {title}
      </Typography>

      <FormControl component="fieldset" sx={{ mt: compact ? 1 : 2, width: '100%' }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={9}>
            <InputLabel id="lexy-tone">Tone</InputLabel>
            <Select
              labelId="lexy-tone"
              value={currTone}
              label="Tone"
              size={controlSize}
              onChange={(e) => setCurrTone(e.target.value)}
              fullWidth
            >
              {skinToneValues.map((v) => (
                <MenuItem value={v} key={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={3}>
            <div
              style={{
                height: compact ? '2.5rem' : '3rem',
                width: compact ? '2.5rem' : '3rem',
                backgroundColor: skinToneColors[(currTone || 1) - 1],
                margin: '0 auto',
                borderRadius: '10%',
                border: '1px solid rgba(0,0,0,0.12)',
              }}
            />
          </Grid>
        </Grid>

        <Grid mt={sectionMt}>
          <FormLabel component="legend">Type</FormLabel>
          <RadioGroup row value={currType} onChange={(e) => setCurrType(e.target.value)}>
            <Grid container>
              {skinTypes.map((t) => (
                <Grid item xs={6} key={t}>
                  <FormControlLabel value={t} control={<Radio size={controlSize} />} label={t} />
                </Grid>
              ))}
            </Grid>
          </RadioGroup>
        </Grid>

        <Grid mt={sectionMt}>
          <FormLabel component="legend">Acne</FormLabel>
          <RadioGroup row value={currAcne} onChange={(e) => setCurrAcne(e.target.value)}>
            <Grid container>
              {acnes.map((ac) => (
                <Grid item key={ac}>
                  <FormControlLabel value={ac} control={<Radio size={controlSize} />} label={ac} />
                </Grid>
              ))}
            </Grid>
          </RadioGroup>
        </Grid>

        <Grid mt={sectionMt}>
          <FormLabel component="legend">Specify other skin concerns</FormLabel>
          <Grid container>
            {otherConcerns.map((c) => (
              <Grid item xs={6} key={c}>
                <FormControlLabel
                  control={<Checkbox size={controlSize} checked={!!features[c]} onChange={handleConcernToggle} name={c} />}
                  label={c.charAt(0).toUpperCase() + c.slice(1)}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid mt={sectionMt} item xs={12}>
          <Button onClick={handleSubmit} variant="contained" disabled={disableSubmit} fullWidth>
            Submit
          </Button>
        </Grid>
      </FormControl>
    </Container>
  );
};

export default LexyForm;
