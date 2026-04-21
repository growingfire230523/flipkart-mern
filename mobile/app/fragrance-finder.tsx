import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { getFragranceRecommendationApi } from '../src/api/endpoints/fragranceFinder';
import PriceDisplay from '../src/components/ui/PriceDisplay';
import Toast from 'react-native-toast-message';

// ─── Assets ───────────────────────────────────────────────────────────────────
const heroImg = require('../assets/images/fragrance-finder/find_my_fragrance.jpg');

const FEMININE_TYPES = [
  { label: 'WARM & SENSUAL',   value: 'warmSensual',    image: require('../assets/images/fragrance-finder/WARM_AND_SENSATIONAL_fmf.webp') },
  { label: 'BRIGHT & FRUITY',  value: 'brightFruity',   image: require('../assets/images/fragrance-finder/BRIGHT_AND_FRUITY_fmf.jpg') },
  { label: 'FLORAL & LUMINOUS',value: 'floralLuminous', image: require('../assets/images/fragrance-finder/FLORAL_AND_LUMINOUS_fmf.jpg') },
];

const MASCULINE_TYPES = [
  { label: 'AROMATIC & SENSUAL', value: 'aromaticSensual', image: require('../assets/images/fragrance-finder/AROMATIC_AND_SENSUAL_fmfm.png') },
  { label: 'WOODY',              value: 'woody',           image: require('../assets/images/fragrance-finder/WOODY_fmfm.png') },
  { label: 'WARM & SPICY',       value: 'warmSpicy',       image: require('../assets/images/fragrance-finder/WARMY_AND_SPICY_fmfm.png') },
  { label: 'FRESH',              value: 'fresh',           image: require('../assets/images/fragrance-finder/FRESH_fmfm.png') },
];

const INTENSITIES = [
  { label: 'DISCREET', value: 'discreet', image: require('../assets/images/fragrance-finder/DISCREET_fmf.png') },
  { label: 'PERSONAL', value: 'personal', image: require('../assets/images/fragrance-finder/PERSONAL_fmf.png') },
  { label: 'OUTGOING', value: 'outgoing', image: require('../assets/images/fragrance-finder/OUTGOING_fmf.png') },
  { label: 'BOLD',     value: 'bold',     image: require('../assets/images/fragrance-finder/BOLD_fmf.png') },
];

const OCCASIONS = [
  { label: 'SPECIAL OCCASION',    value: 'special' },
  { label: 'DATE NIGHT',          value: 'date' },
  { label: 'DESK TO DRINKS',      value: 'work' },
  { label: 'EVERYDAY SIGNATURE',  value: 'everyday' },
  { label: 'VACATION',            value: 'vacation' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, i < currentStep ? styles.progressActive : styles.progressInactive]}
        />
      ))}
    </View>
  );
}

function OptionBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.optionBtn}>
      <Text style={styles.optionBtnText}>{label}</Text>
    </Pressable>
  );
}

function TileOption({ label, image, onPress }: { label: string; image: any; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <Image source={image} style={styles.tileImage} contentFit="cover" />
      <View style={styles.tileLabelRow}>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type Answers = {
  forWhom: string;
  preference: string;
  occasion: string;
  type: string;
  intensity: string;
};

export default function FragranceFinderScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const totalSteps = 5;

  const currentProgressStep = useMemo(() => {
    if (step <= 0) return 0;
    if (step >= 6) return 5;
    return step;
  }, [step]);

  const goBack = () => {
    if (loading) return;
    if (step === 0) { router.back(); return; }
    if (step === 6) { setResult(null); setError(''); setStep(5); return; }
    setStep((s) => Math.max(0, s - 1));
  };

  const pick = (key: keyof Answers, value: string, nextStep: number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError('');
    setStep(nextStep);
  };

  const submit = async (intensity: string) => {
    const payload = { ...answers, intensity };
    setAnswers((prev) => ({ ...prev, intensity }));
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await getFragranceRecommendationApi(payload as Answers);
      setResult(data?.recommendation ?? null);
      setStep(6);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Unable to find a fragrance match. Please try again.');
      setStep(6);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setResult(null);
    setError('');
    setStep(0);
  };

  const typeOptions = useMemo(
    () => (answers.preference === 'feminine' ? FEMININE_TYPES : MASCULINE_TYPES),
    [answers.preference]
  );

  // ── Header shared across quiz steps ─────────────────────────────────────────
  const quizHeader = (
    <View style={styles.header}>
      <Pressable onPress={goBack} hitSlop={12}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <ProgressBar currentStep={currentProgressStep} />
      </View>
      <View style={{ width: 36 }} />
    </View>
  );

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        {quizHeader}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#875c43" />
          <Text style={styles.loadingText}>Finding your perfect match…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Intro (step 0) ───────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <ProgressBar currentStep={0} />
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Hero image */}
          <Image source={heroImg} style={styles.heroImage} contentFit="cover" />

          {/* Text + CTA */}
          <View style={styles.introPad}>
            <Text style={styles.introTitle}>FRAGRANCE{'\n'}FINDER</Text>
            <Text style={styles.introSubtitle}>
              In 5 quick questions, discover the perfect fragrance from our store.
            </Text>
            <Pressable onPress={() => setStep(1)} style={styles.startBtn}>
              <Text style={styles.startBtnText}>START</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Results (step 6) ────────────────────────────────────────────────────
  if (step === 6) {
    const product = result?.product;
    const reasons: string[] = result?.reasons || [];

    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        {quizHeader}
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultTitle}>YOUR FRAGRANCE{'\n'}MATCH</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {product && (
            <View style={styles.resultCard}>
              <Image
                source={{ uri: product.images?.[0]?.url }}
                style={styles.resultImage}
                contentFit="contain"
              />
              <View style={styles.resultBody}>
                <Text style={styles.resultCategory}>{product.subCategory || product.category}</Text>
                <Text style={styles.resultName}>{product.name}</Text>
                <View style={{ marginTop: 8 }}>
                  <PriceDisplay price={product.price} cuttedPrice={product.cuttedPrice} size="lg" />
                </View>
                {reasons.length > 0 && (
                  <Text style={styles.resultReasons}>{reasons.join(' • ')}</Text>
                )}
                <Pressable
                  onPress={() => router.push(`/product/${product._id}`)}
                  style={styles.viewBtn}
                >
                  <Text style={styles.viewBtnText}>View Product</Text>
                </Pressable>
                <Pressable onPress={restart} style={styles.startOverBtn}>
                  <Text style={styles.startOverText}>Start Over</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!product && !error && (
            <Text style={styles.noMatch}>No recommendation returned.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Quiz Steps ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {quizHeader}
      <ScrollView contentContainerStyle={styles.quizScroll}>

        {step === 1 && (
          <>
            <Text style={styles.questionText}>I AM LOOKING FOR A{'\n'}FRAGRANCE:</Text>
            <OptionBtn label="FOR MYSELF"  onPress={() => pick('forWhom', 'self', 2)} />
            <OptionBtn label="AS A GIFT"   onPress={() => pick('forWhom', 'gift', 2)} />
            <Text style={styles.stepCounter}>1 of 5</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.questionText}>I PREFER FRAGRANCES{'\n'}THAT ARE:</Text>
            <OptionBtn label="MORE FEMININE"  onPress={() => pick('preference', 'feminine', 3)} />
            <OptionBtn label="MORE MASCULINE" onPress={() => pick('preference', 'masculine', 3)} />
            <Text style={styles.stepCounter}>2 of 5</Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.questionText}>WHERE WILL YOU BE{'\n'}WEARING THIS{'\n'}FRAGRANCE:</Text>
            {OCCASIONS.map((o) => (
              <OptionBtn key={o.value} label={o.label} onPress={() => pick('occasion', o.value, 4)} />
            ))}
            <Text style={styles.stepCounter}>3 of 5</Text>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.questionText}>CHOOSE YOUR FAVORITE{'\n'}TYPE OF FRAGRANCE:</Text>
            {typeOptions.map((o) => (
              <TileOption
                key={o.value}
                label={o.label}
                image={o.image}
                onPress={() => pick('type', o.value, 5)}
              />
            ))}
            <Text style={styles.stepCounter}>4 of 5</Text>
          </>
        )}

        {step === 5 && (
          <>
            <Text style={styles.questionText}>HOW INTENSE DO YOU{'\n'}LIKE YOUR FRAGRANCE{'\n'}TO BE?</Text>
            {INTENSITIES.map((o) => (
              <TileOption
                key={o.value}
                label={o.label}
                image={o.image}
                onPress={() => submit(o.value)}
              />
            ))}
            <Text style={styles.stepCounter}>5 of 5</Text>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backText: {
    fontSize: 15,
    color: '#24171a',
    fontFamily: 'Roboto-Medium',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 7,
    borderRadius: 4,
  },
  progressActive: {
    backgroundColor: '#875c43',
  },
  progressInactive: {
    backgroundColor: 'rgba(135,92,67,0.22)',
  },
  // Intro
  heroImage: {
    width: '100%',
    height: 240,
  },
  introPad: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 48,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 38,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#24171a',
    textAlign: 'center',
    letterSpacing: 3,
    lineHeight: 46,
    marginBottom: 14,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#7b6f6a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'Roboto-Regular',
  },
  startBtn: {
    backgroundColor: '#875c43',
    paddingHorizontal: 48,
    paddingVertical: 16,
    width: '100%',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  // Quiz
  quizScroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 60,
  },
  questionText: {
    fontSize: 26,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#24171a',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 34,
    marginBottom: 28,
  },
  optionBtn: {
    width: '100%',
    backgroundColor: '#875c43',
    paddingVertical: 16,
    marginBottom: 12,
  },
  optionBtnText: {
    color: '#ffffff',
    fontFamily: 'Roboto-Bold',
    fontSize: 13,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  stepCounter: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: '#875c43',
    fontFamily: 'Roboto-Regular',
  },
  // Tiles
  tile: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e0da',
    backgroundColor: '#ffffff',
    marginBottom: 16,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    aspectRatio: 3,
  },
  tileLabelRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tileLabel: {
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
    color: '#24171a',
    letterSpacing: 1,
    textAlign: 'center',
  },
  // Loading
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#7b6f6a',
    fontFamily: 'Roboto-Regular',
  },
  // Results
  resultScroll: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    paddingTop: 4,
  },
  resultTitle: {
    fontSize: 30,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#24171a',
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 38,
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e0da',
  },
  resultImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#f5f0eb',
  },
  resultBody: {
    padding: 20,
  },
  resultCategory: {
    fontSize: 12,
    color: '#7b6f6a',
    fontFamily: 'Roboto-Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#24171a',
    lineHeight: 28,
  },
  resultReasons: {
    marginTop: 12,
    fontSize: 13,
    color: '#7b6f6a',
    fontFamily: 'Roboto-Regular',
    lineHeight: 20,
  },
  viewBtn: {
    backgroundColor: '#875c43',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  viewBtnText: {
    color: '#ffffff',
    fontFamily: 'Roboto-Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  startOverBtn: {
    borderWidth: 1,
    borderColor: '#c4b5a8',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  startOverText: {
    color: '#24171a',
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
  },
  noMatch: {
    textAlign: 'center',
    color: '#7b6f6a',
    fontSize: 14,
    marginTop: 40,
    fontFamily: 'Roboto-Regular',
  },
});

