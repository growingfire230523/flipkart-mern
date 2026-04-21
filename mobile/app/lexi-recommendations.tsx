import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  Dimensions, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFaceApi } from '../src/api/endpoints/lexyAnalyzer';
import { getLexyRecommendationsApi } from '../src/api/endpoints/lexyRecommendations';
import { addToCart } from '../src/store/slices/cartSlice';
import { AppDispatch } from '../src/store';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const BROWN = '#875c43';
const CREAM = '#fbf6f2';
const DARK = '#24171a';
const GREY = '#7b6f6a';

const skinToneValues = [1, 2, 3, 4, 5, 6];
const skinToneColors = [
  'rgb(249, 245, 236)', 'rgb(250, 245, 234)', 'rgb(240, 227, 171)',
  'rgb(206, 172, 104)', 'rgb(105, 59, 41)', 'rgb(33, 28, 40)',
];
const skinTypes = ['All', 'Oily', 'Normal', 'Dry', 'Combination'];
const acneLevels = ['Low', 'Moderate', 'Severe'];
const otherConcerns = [
  'sensitive', 'fine lines', 'wrinkles', 'redness', 'dull', 'pore',
  'pigmentation', 'blackheads', 'whiteheads', 'blemishes', 'dark circles',
  'eye bags', 'dark spots',
];

const BADGE_BG = { Good: '#4a7c3f', Ok: '#d6b36a', 'Not Good': '#c0392b' };

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={[s.badge, { backgroundColor: BADGE_BG[value as keyof typeof BADGE_BG] || '#c0392b' }]}>
      <Text style={s.badgeLabel}>{label}</Text>
      <Text style={s.badgeValue}>{value}</Text>
    </View>
  );
}

// ─── Camera section ───────────────────────────────────────────────────────────
function CameraCapture({ tone, onCapture, onUpload }: {
  tone: number; onCapture: (uri: string) => void; onUpload: (uri: string) => void;
}) {
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lighting, setLighting] = useState('Not Good');
  const [lookStraight, setLookStraight] = useState('Not Good');
  const [facePos, setFacePos] = useState('Not Good');
  const [countdown, setCountdown] = useState<number | null>(null);
  const hasCaptured = useRef(false);
  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOk = (s: string) => s === 'Ok' || s === 'Good';
  const allSet = isOk(lighting) && isOk(lookStraight) && isOk(facePos);

  useEffect(() => {
    if (!cameraReady) return;
    const t1 = setTimeout(() => setLighting('Ok'), 500);
    const t2 = setTimeout(() => setLighting('Good'), 1500);
    const t3 = setTimeout(() => setLookStraight('Ok'), 1200);
    const t4 = setTimeout(() => setFacePos('Ok'), 2000);
    const t5 = setTimeout(() => setFacePos('Good'), 3000);
    const t6 = setTimeout(() => setLookStraight('Good'), 3500);
    return () => { [t1, t2, t3, t4, t5, t6].forEach(clearTimeout); };
  }, [cameraReady]);

  useEffect(() => {
    if (!allSet || hasCaptured.current) {
      if (cdTimer.current) { clearInterval(cdTimer.current); cdTimer.current = null; }
      setCountdown(null);
      return;
    }
    const stable = setTimeout(() => {
      if (hasCaptured.current) return;
      setCountdown(3);
      cdTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            if (cdTimer.current) { clearInterval(cdTimer.current); cdTimer.current = null; }
            hasCaptured.current = true;
            setTimeout(() => doCapture(), 50);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }, 650);
    return () => {
      clearTimeout(stable);
      if (cdTimer.current) { clearInterval(cdTimer.current); cdTimer.current = null; }
    };
  }, [allSet]);

  const doCapture = useCallback(async () => {
    if (!cameraRef) return;
    try {
      const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
      onCapture(photo.uri);
    } catch {
      Toast.show({ type: 'error', text1: 'Capture failed' });
    }
  }, [cameraRef, onCapture]);

  const handleUpload = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      hasCaptured.current = true;
      onUpload(res.assets[0].uri);
    }
  };

  return (
    <View>
      {/* Status badges */}
      <View style={s.badgeRow}>
        <StatusBadge label="Lighting" value={lighting} />
        <StatusBadge label="Look straight" value={lookStraight} />
        <StatusBadge label="Face position" value={facePos} />
      </View>

      {/* Camera + oval */}
      <View style={s.cameraBox}>
        <CameraView
          ref={(r: any) => setCameraRef(r)}
          facing="front"
          style={StyleSheet.absoluteFillObject}
          onCameraReady={() => setCameraReady(true)}
        />
        {/* Oval overlay */}
        <View style={s.ovalWrapper} pointerEvents="none">
          <View style={[s.oval, { borderColor: allSet ? '#2e7d32' : '#ffffff' }]} />
        </View>
        {/* Countdown / tone circle */}
        <View style={s.countdownWrapper} pointerEvents="none">
          <View style={s.countdownCircle}>
            <Text style={s.countdownText}>{countdown !== null ? countdown : tone}</Text>
          </View>
        </View>
      </View>

      {/* Instructions */}
      <Text style={s.instruction}>
        Hold still, align your face inside the oval, and move closer until your face fills most of the frame.
      </Text>

      {/* Capture + upload */}
      <View style={s.captureRow}>
        <Pressable
          onPress={() => { hasCaptured.current = true; doCapture(); }}
          style={s.captureBtn}
        >
          <View style={s.captureBtnInner} />
        </Pressable>
      </View>
      <Text style={s.autoCapHint}>
        {countdown !== null ? `Auto-capturing in ${countdown}...` : 'Tap to capture or wait for auto-capture'}
      </Text>

      <Text style={s.uploadPrompt}>Don't want to use live camera? Upload a photo instead.</Text>
      <View style={s.uploadBtnRow}>
        <Pressable onPress={handleUpload} style={s.uploadBtn}>
          <Text style={s.uploadBtnText}>Upload photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LexiRecommendationsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [permission, requestPermission] = useCameraPermissions();

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  // Form
  const [tone, setTone] = useState(3);
  const [skinType, setSkinType] = useState('Normal');
  const [acne, setAcne] = useState('Low');
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  // Results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  const analyzePhoto = useCallback(async (uri: string) => {
    setAnalysing(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri, type: 'image/jpeg', name: 'selfie.jpg' } as any);
      const { data } = await analyzeFaceApi(formData);
      if (data?.tone) setTone(parseInt(String(data.tone), 10) || 3);
      if (data?.type) setSkinType(data.type);
      if (data?.acne) setAcne(data.acne);
    } catch {
      Toast.show({ type: 'error', text1: 'Face analysis failed. Fill details manually.' });
    } finally {
      setAnalysing(false);
    }
  }, []);

  const handleCapture = useCallback(async (uri: string) => {
    setCapturedUri(uri);
    await analyzePhoto(uri);
  }, [analyzePhoto]);

  const handleUpload = useCallback(async (uri: string) => {
    setCapturedUri(uri);
    await analyzePhoto(uri);
  }, [analyzePhoto]);

  const toggleConcern = (c: string) =>
    setFeatures((prev) => ({ ...prev, [c]: !prev[c] }));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = { ...features };
      if (skinType === 'All') {
        next.normal = true; next.dry = true; next.oily = true; next.combination = true;
      } else {
        next[skinType.toLowerCase()] = true;
      }
      if (acne !== 'Low') next.acne = true;
      const numericFeatures = Object.fromEntries(
        Object.entries(next).map(([k, v]) => [k, v ? 1 : 0])
      );
      const { data } = await getLexyRecommendationsApi({ features: numericFeatures, type: skinType, tone });
      setRecommendations(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (p: any) => {
    dispatch(addToCart({
      cartItemId: `${p._id}:::`, product: p._id, name: p.name,
      seller: p.brand?.name || '', price: p.price, cuttedPrice: p.cuttedPrice,
      image: Array.isArray(p.images) ? p.images?.[0]?.url : p.image,
      stock: p.stock || 10, quantity: 1,
      volume: '', size: '', colorName: '', colorHex: '',
    }));
    Toast.show({ type: 'success', text1: 'Added to Cart' });
  };

  const renderProductCard = (prod: any, key: string) => {
    const img = Array.isArray(prod?.images) ? prod.images?.[0]?.url : prod?.image;
    const brand = prod?.brand?.name || prod?.brand || '';
    const price = typeof prod?.price === 'number' ? prod.price : null;
    const concerns: string[] = Array.from(new Set((prod?.concern || []).filter(Boolean)));
    return (
      <Pressable
        key={key}
        onPress={() => prod?._id && router.push(`/product/${prod._id}`)}
        style={[s.productCard, { width: CARD_WIDTH }]}
      >
        <Image
          source={{ uri: img }}
          style={{ width: CARD_WIDTH, height: CARD_WIDTH * 0.85 }}
          contentFit="cover"
          transition={200}
        />
        <View style={s.productInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.productBrand}>{brand}</Text>
            {price !== null && <Text style={s.productPrice}>₹{price.toLocaleString()}</Text>}
          </View>
          <Text style={s.productName} numberOfLines={2}>{prod?.name}</Text>
          {concerns.length > 0 && (
            <View style={s.tagRow}>
              {concerns.slice(0, 3).map((c: string) => (
                <View key={c} style={s.tag}><Text style={s.tagText}>{c}</Text></View>
              ))}
            </View>
          )}
          <Pressable onPress={() => handleAddToCart(prod)} style={s.addBtn}>
            <Text style={s.addBtnText}>ADD TO BAG</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // ── Results view ───────────────────────────────────────────────────────────
  if (recommendations) {
    const general = recommendations.general || {};
    const makeup = recommendations.makeup || [];
    const generalKeys = Object.keys(general);
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={() => setRecommendations(null)} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>MILAARI Recommendations</Text>
            <Text style={s.headerSub}>Your personalised picks</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {capturedUri && (
            <View style={s.thumbRow}>
              <Image source={{ uri: capturedUri }} style={s.thumb} contentFit="cover" />
            </View>
          )}
          <Pressable onPress={() => setRecommendations(null)} style={s.editBtn}>
            <Text style={s.editBtnText}>Edit details</Text>
          </Pressable>

          {generalKeys.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Skin Care</Text>
              {generalKeys.map((type) => (
                <View key={type}>
                  <Text style={s.sectionSub}>{type}</Text>
                  <View style={s.productGrid}>
                    {(general[type] || []).slice(0, 4).map((p: any, i: number) =>
                      renderProductCard(p, `${type}-${p?._id || i}`)
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {makeup.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>Make Up</Text>
              <View style={s.productGrid}>
                {makeup.slice(0, 6).map((p: any, i: number) =>
                  renderProductCard(p, `makeup-${p?._id || i}`)
                )}
              </View>
            </>
          )}

          {!generalKeys.length && !makeup.length && recommendations.products?.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recommended for You</Text>
              <View style={s.productGrid}>
                {recommendations.products.map((p: any, i: number) =>
                  renderProductCard(p, `flat-${p?._id || i}`)
                )}
              </View>
            </>
          )}

          <Pressable
            onPress={() => {
              setRecommendations(null);
              setCapturedUri(null);
              setFeatures({});
              setTone(3);
              setSkinType('Normal');
              setAcne('Low');
            }}
            style={s.startOverBtn}
          >
            <Text style={s.startOverText}>Start Over</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main: camera + form on one screen ─────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>MILAARI Recommendations</Text>
          <Text style={s.headerSub}>Fill your skin details to get personalized skincare & makeup picks.</Text>
        </View>
      </View>
      <View style={s.headerDivider} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Camera / photo section */}
        <View style={s.cameraSection}>
          {capturedUri ? (
            /* Captured photo */
            <View>
              <Image source={{ uri: capturedUri }} style={s.capturedPhoto} contentFit="cover" />
              {analysing ? (
                <View style={s.analysingRow}>
                  <ActivityIndicator size="small" color={BROWN} />
                  <Text style={s.analysingText}>Analysing your photo…</Text>
                </View>
              ) : (
                <Text style={s.analysisDone}>✓ Details pre-filled from photo</Text>
              )}
              <View style={s.retakeRow}>
                <Pressable
                  onPress={() => { setCapturedUri(null); setFeatures({}); setTone(3); setSkinType('Normal'); setAcne('Low'); }}
                  style={s.retakeBtn}
                >
                  <Text style={s.retakeBtnText}>Retake</Text>
                </Pressable>
              </View>
            </View>
          ) : permission?.granted ? (
            /* Live camera */
            <CameraCapture tone={tone} onCapture={handleCapture} onUpload={handleUpload} />
          ) : (
            /* No permission */
            <View style={s.noPermBox}>
              <Text style={s.noPermText}>Camera permission required for face analysis.</Text>
              <Pressable onPress={requestPermission} style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>Grant Camera Permission</Text>
              </Pressable>
              <Text style={s.uploadPrompt}>Or upload a photo:</Text>
              <Pressable
                onPress={async () => {
                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
                  if (!res.canceled && res.assets?.[0]) handleUpload(res.assets[0].uri);
                }}
                style={s.uploadBtn}
              >
                <Text style={s.uploadBtnText}>Upload photo</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Your Details form ── */}
        <View style={s.formSection}>
          <Text style={s.formTitle}>Your Details</Text>

          {/* Tone */}
          <View style={s.toneRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Tone</Text>
              <View style={s.toneSwatches}>
                {skinToneValues.map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setTone(v)}
                    style={[
                      s.toneSwatch,
                      { backgroundColor: skinToneColors[v - 1] },
                      tone === v && s.toneSwatchSelected,
                    ]}
                  >
                    <Text style={[s.toneNum, { color: v >= 5 ? '#fff' : '#444' }]}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {/* Color block matching web */}
            <View style={[s.toneSwatch, s.tonePreview, { backgroundColor: skinToneColors[tone - 1] }]} />
          </View>

          {/* Skin Type */}
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Type</Text>
          <View style={s.radioGroup}>
            {skinTypes.map((t) => (
              <Pressable key={t} onPress={() => setSkinType(t)} style={s.radioRow}>
                <View style={[s.radio, skinType === t && s.radioSelected]}>
                  {skinType === t && <View style={s.radioDot} />}
                </View>
                <Text style={[s.radioLabel, skinType === t && { color: BROWN, fontFamily: 'Roboto-Medium' }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {/* Acne */}
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Acne</Text>
          <View style={s.radioGroup}>
            {acneLevels.map((a) => (
              <Pressable key={a} onPress={() => setAcne(a)} style={s.radioRow}>
                <View style={[s.radio, acne === a && s.radioSelected]}>
                  {acne === a && <View style={s.radioDot} />}
                </View>
                <Text style={[s.radioLabel, acne === a && { color: BROWN, fontFamily: 'Roboto-Medium' }]}>{a}</Text>
              </Pressable>
            ))}
          </View>

          {/* Other concerns */}
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Other Skin Concerns</Text>
          <View style={s.concernGrid}>
            {otherConcerns.map((c) => (
              <Pressable key={c} onPress={() => toggleConcern(c)} style={[s.concern, features[c] && s.concernActive]}>
                <View style={[s.checkbox, features[c] && s.checkboxActive]}>
                  {features[c] && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={[s.concernText, features[c] && { color: BROWN }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading || analysing}
            style={[s.primaryBtn, { marginTop: 20 }, (loading || analysing) && { opacity: 0.6 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Get Recommendations</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  backBtn: { paddingRight: 12, paddingTop: 3 },
  backText: { fontSize: 22, color: GREY },
  headerTitle: { fontSize: 16, fontFamily: 'CormorantGaramond-Bold', color: DARK },
  headerSub: { fontSize: 12, color: GREY, marginTop: 2, fontFamily: 'Roboto', lineHeight: 17 },
  headerDivider: { height: 1, backgroundColor: '#f0e4d8', marginHorizontal: 16 },

  // Camera section
  cameraSection: { backgroundColor: '#000' },
  cameraBox: { height: 320, position: 'relative', overflow: 'hidden' },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  badge: { alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  badgeLabel: { color: '#fff', fontSize: 10, fontFamily: 'Roboto-Medium' },
  badgeValue: { color: '#fff', fontSize: 11, fontFamily: 'Roboto-Bold' },
  ovalWrapper: {
    position: 'absolute', top: '8%', left: '15%', right: '15%', bottom: '15%',
    alignItems: 'center', justifyContent: 'center',
  },
  oval: { width: '100%', height: '100%', borderRadius: 999, borderWidth: 3, borderStyle: 'dashed' },
  countdownWrapper: { position: 'absolute', bottom: '18%', left: 0, right: 0, alignItems: 'center' },
  countdownCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#fff', fontSize: 20, fontFamily: 'Roboto-Bold' },
  instruction: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center', paddingHorizontal: 24, marginTop: 8, fontFamily: 'Roboto' },
  captureRow: { alignItems: 'center', marginTop: 16 },
  captureBtn: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  autoCapHint: { color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'center', marginTop: 6, fontFamily: 'Roboto' },
  uploadPrompt: { color: 'rgba(255,255,255,0.65)', fontSize: 12, textAlign: 'center', marginTop: 12, fontFamily: 'Roboto' },
  uploadBtnRow: { alignItems: 'center', marginTop: 8, paddingBottom: 20 },
  uploadBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 8 },
  uploadBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Roboto-Medium' },

  // Captured photo
  capturedPhoto: { width: '100%', height: 280 },
  analysingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  analysingText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginLeft: 8, fontFamily: 'Roboto' },
  analysisDone: { color: '#4a7c3f', fontSize: 13, textAlign: 'center', paddingVertical: 8, fontFamily: 'Roboto-Medium' },
  retakeRow: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 12, paddingTop: 4 },
  retakeBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 7 },
  retakeBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Roboto-Medium' },

  // No permission
  noPermBox: { padding: 24, alignItems: 'center', gap: 12 },
  noPermText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', fontFamily: 'Roboto' },

  // Form
  formSection: { backgroundColor: CREAM, paddingHorizontal: 16, paddingTop: 20 },
  formTitle: { fontSize: 16, fontFamily: 'Roboto-Medium', color: DARK, textAlign: 'center', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: GREY, fontFamily: 'Roboto-Medium', marginBottom: 8 },
  toneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  toneSwatches: { flexDirection: 'row', gap: 6 },
  toneSwatch: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  toneSwatchSelected: { borderColor: BROWN, shadowColor: BROWN, shadowRadius: 4, shadowOpacity: 0.4, elevation: 3 },
  toneNum: { fontSize: 12, fontFamily: 'Roboto-Bold' },
  tonePreview: { width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', marginLeft: 4 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5d6cc', backgroundColor: '#fff', marginBottom: 2 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  radioSelected: { borderColor: BROWN },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BROWN },
  radioLabel: { fontSize: 13, color: DARK, fontFamily: 'Roboto' },
  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  concern: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#e5d6cc', backgroundColor: '#fff' },
  concernActive: { borderColor: BROWN, backgroundColor: 'rgba(135,92,67,0.08)' },
  checkbox: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 6, backgroundColor: '#fff' },
  checkboxActive: { backgroundColor: BROWN, borderColor: BROWN },
  checkmark: { color: '#fff', fontSize: 9, fontFamily: 'Roboto-Bold' },
  concernText: { fontSize: 12, color: DARK, fontFamily: 'Roboto' },
  errorText: { fontSize: 13, color: '#dc2626', textAlign: 'center', marginTop: 8 },
  primaryBtn: { backgroundColor: BROWN, borderRadius: 50, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Roboto-Medium' },

  // Results
  thumbRow: { alignItems: 'center', marginBottom: 12 },
  thumb: { width: 100, height: 100, borderRadius: 50 },
  editBtn: { borderWidth: 1, borderColor: '#c4a08e', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 20, alignItems: 'center', marginBottom: 16 },
  editBtnText: { color: BROWN, fontSize: 13, fontFamily: 'Roboto-Medium' },
  sectionTitle: { fontSize: 20, fontFamily: 'CormorantGaramond-Bold', color: DARK, textAlign: 'center', marginBottom: 8 },
  sectionSub: { fontSize: 14, color: GREY, fontFamily: 'Roboto-Medium', marginBottom: 8, marginTop: 12 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  productInfo: { padding: 8 },
  productBrand: { fontSize: 10, color: GREY, fontFamily: 'Roboto' },
  productPrice: { fontSize: 12, color: DARK, fontFamily: 'Roboto-Bold' },
  productName: { fontSize: 11, color: DARK, fontFamily: 'Roboto-Medium', marginTop: 2, lineHeight: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 3 },
  tag: { backgroundColor: 'rgba(135,92,67,0.75)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 9 },
  addBtn: { borderWidth: 1, borderColor: 'rgba(135,92,67,0.35)', borderRadius: 4, paddingVertical: 6, alignItems: 'center', marginTop: 6 },
  addBtnText: { fontSize: 9, fontFamily: 'Roboto-Bold', color: DARK, letterSpacing: 0.5 },
  startOverBtn: { borderWidth: 1, borderColor: '#c4a08e', borderRadius: 50, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  startOverText: { color: BROWN, fontSize: 13, fontFamily: 'Roboto-Medium' },
});
