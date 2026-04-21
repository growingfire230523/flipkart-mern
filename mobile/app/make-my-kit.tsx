import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, Switch, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { getMakeKitApi } from '../src/api/endpoints/products';
import { addToCart } from '../src/store/slices/cartSlice';
import { saveCartItemsToStorage, getActiveUserId } from '../src/utils/cartStorage';
import { AppDispatch, RootState } from '../src/store';
import Toast from 'react-native-toast-message';

const BROWN = '#875c43';
const CREAM = '#fbf6f2';
const DARK = '#24171a';
const GREY = '#7b6f6a';

export default function MakeMyKitScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { cartItems } = useSelector((state: RootState) => state.cart);

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const fetchKit = async () => {
    const q = query.trim();
    if (!q) {
      setError('Please describe all your needs in one line.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await getMakeKitApi(q, 7);
      const list: any[] = Array.isArray(data?.products) ? data.products : [];
      if (!list.length) {
        setError('Could not build a kit right now. Please try again.');
        return;
      }
      setProducts(list);
      setCheckedIds(new Set(list.map((p: any) => String(p._id)).filter(Boolean)));
      setStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToCartAll = async () => {
    if (working) return;
    const toAdd = products.filter((p) => checkedIds.has(String(p._id)));
    if (!toAdd.length) {
      Toast.show({ type: 'error', text1: 'Select at least one product' });
      return;
    }
    setWorking(true);
    try {
      const userId = await getActiveUserId();
      const updated = [...cartItems];
      for (const p of toAdd) {
        const cartItemId = `${p._id}:::`;
        const idx = updated.findIndex((i) => i.cartItemId === cartItemId);
        const item = {
          cartItemId,
          product: p._id,
          name: p.name,
          seller: p.brand?.name || '',
          price: p.price,
          cuttedPrice: p.cuttedPrice,
          image: p.images?.[0]?.url,
          stock: p.stock,
          quantity: idx >= 0 ? updated[idx].quantity + 1 : 1,
          volume: '', size: '', colorName: '', colorHex: '',
        };
        if (idx >= 0) updated[idx] = item; else updated.push(item);
        dispatch(addToCart(item));
      }
      await saveCartItemsToStorage(userId, updated);
      router.push('/cart');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Could not add to cart' });
    } finally {
      setWorking(false);
    }
  };

  const toggleId = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const primaryProducts = products.filter((p) => p?.tier === 'primary');
  const secondaryProducts = products.filter((p) => p?.tier !== 'primary');
  const stepLabel = step === 0 ? 1 : step === 1 ? 2 : 3;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Make My Kit</Text>
          <Text style={styles.headerSub}>A quick 3-step flow to build a kit tailored to all your needs.</Text>
        </View>
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        <Text style={styles.stepLabel}>Step {stepLabel} of 3</Text>
        {loading && <Text style={styles.stepBuilding}>Building your kit…</Text>}
      </View>
      <View style={styles.headerDivider} />

      {/* ── Step 0: Intro ── */}
      {step === 0 && (
        <View style={styles.body}>
          <Text style={styles.bodyText}>
            Tell us everything you want in your routine, and we'll put together a kit across categories that fits you.
          </Text>
          <View style={{ marginTop: 12, marginBottom: 20 }}>
            {[
              "We'll pick top-rated essentials from different categories.",
              "Perfect when you don't want to think about every single product.",
              'You can review everything before it goes to your cart.',
            ].map((t, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => setStep(1)}>
            <Text style={styles.primaryBtnText}>Start</Text>
          </Pressable>
        </View>
      )}

      {/* ── Step 1: Input ── */}
      {step === 1 && (
        <View style={styles.body}>
          <Text style={styles.inputHeading}>Define all your needs in one line</Text>
          <Text style={styles.inputExample}>
            For example: "Dry sensitive skin, daily office wear makeup, fragrance-free, acne-prone, budget friendly."
          </Text>
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setError(''); }}
            placeholder="Describe everything you want your kit to solve in a single line."
            placeholderTextColor={GREY}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textArea}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.btnRow}>
            <Pressable style={styles.outlineBtn} onPress={() => setStep(0)} disabled={loading}>
              <Text style={styles.outlineBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.7 }]}
              onPress={fetchKit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.primaryBtnText}>Show my kit</Text>}
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Step 2: Results ── */}
      {step === 2 && (
        <>
          <ScrollView contentContainerStyle={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Your curated kit</Text>
            <Text style={styles.resultsSub}>
              Toggle items on/off — only checked items will be added to your cart.
            </Text>

            {products.length === 0 ? (
              <Text style={styles.errorText}>{error || 'Could not build a kit right now. Please try again.'}</Text>
            ) : (
              <>
                {/* What you need */}
                {primaryProducts.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionLabel, { color: '#6b4226' }]}>WHAT YOU NEED</Text>
                      <View style={[styles.sectionLine, { backgroundColor: '#e8cdb5' }]} />
                    </View>
                    {primaryProducts.map((p) => (
                      <KitProductCard
                        key={p._id}
                        product={p}
                        isChecked={checkedIds.has(String(p._id))}
                        onToggle={() => toggleId(String(p._id))}
                        bgColor="#fdf3e7"
                        borderColor="#f0d9b5"
                        onView={() => router.push(`/product/${p._id}`)}
                      />
                    ))}
                  </>
                )}

                {/* Goes well with */}
                {secondaryProducts.length > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                      <Text style={[styles.sectionLabel, { color: '#8b5e6b' }]}>GOES WELL WITH</Text>
                      <View style={[styles.sectionLine, { backgroundColor: '#edc9d1' }]} />
                    </View>
                    {secondaryProducts.map((p) => (
                      <KitProductCard
                        key={p._id}
                        product={p}
                        isChecked={checkedIds.has(String(p._id))}
                        onToggle={() => toggleId(String(p._id))}
                        bgColor="#fdf0f3"
                        borderColor="#f2d0d9"
                        onView={() => router.push(`/product/${p._id}`)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Bottom action bar */}
          <View style={styles.bottomBar}>
            <Pressable
              style={styles.outlineBtn}
              onPress={() => { setStep(1); setProducts([]); setCheckedIds(new Set()); }}
              disabled={working}
            >
              <Text style={styles.outlineBtnText}>Start over</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }, (!checkedIds.size || working) && { opacity: 0.6 }]}
              onPress={addToCartAll}
              disabled={working || !checkedIds.size}
            >
              {working
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.primaryBtnText}>
                    Add {checkedIds.size} item{checkedIds.size !== 1 ? 's' : ''} to cart
                  </Text>}
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Kit Product Card ──────────────────────────────────────────────────────────
type KitProductCardProps = {
  product: any;
  isChecked: boolean;
  onToggle: () => void;
  bgColor: string;
  borderColor: string;
  onView: () => void;
};

const KitProductCard = ({
  product: p, isChecked, onToggle, bgColor, borderColor, onView,
}: KitProductCardProps) => (
  <View style={[styles.card, { backgroundColor: bgColor, borderColor }, !isChecked && { opacity: 0.5 }]}>
    <Pressable onPress={onView} style={styles.cardImage}>
      {p.images?.[0]?.url ? (
        <Image source={{ uri: p.images[0].url }} style={{ width: 56, height: 56 }} contentFit="contain" />
      ) : (
        <View style={styles.cardImagePlaceholder} />
      )}
    </Pressable>
    <View style={styles.cardInfo}>
      <Text style={styles.cardCategory}>{String(p.category || '').toUpperCase()}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
      <Text style={styles.cardPrice}>₹{Number(p.price || 0).toLocaleString()}</Text>
    </View>
    <View style={styles.cardActions}>
      <Pressable onPress={onView}>
        <Text style={styles.viewLink}>View</Text>
      </Pressable>
      <Switch
        value={isChecked}
        onValueChange={onToggle}
        trackColor={{ false: '#d1d5db', true: BROWN }}
        thumbColor="#ffffff"
        ios_backgroundColor="#d1d5db"
        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
      />
    </View>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backBtn: { paddingRight: 14, paddingTop: 3 },
  backText: { fontSize: 22, color: GREY },
  headerTitle: { fontSize: 17, fontFamily: 'CormorantGaramond-Bold', color: DARK },
  headerSub: { fontSize: 12, color: GREY, marginTop: 2, fontFamily: 'Roboto', lineHeight: 17 },
  headerDivider: { height: 1, backgroundColor: '#f0e4d8', marginHorizontal: 20 },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  stepLabel: { fontSize: 12, color: GREY, fontFamily: 'Roboto' },
  stepBuilding: { fontSize: 12, color: DARK, fontFamily: 'Roboto' },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  bodyText: { fontSize: 14, color: DARK, fontFamily: 'Roboto', lineHeight: 22 },
  bulletRow: { flexDirection: 'row', marginTop: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 13, color: GREY, marginRight: 6, marginTop: 1 },
  bulletText: { fontSize: 13, color: GREY, fontFamily: 'Roboto', flex: 1, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: BROWN,
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Roboto-Medium' },
  outlineBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#c4a08e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: BROWN, fontSize: 13, fontFamily: 'Roboto-Medium' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  inputHeading: { fontSize: 15, fontFamily: 'Roboto-Medium', color: DARK, marginBottom: 4 },
  inputExample: { fontSize: 12, color: GREY, fontFamily: 'Roboto', marginBottom: 10, lineHeight: 18 },
  textArea: {
    borderWidth: 1,
    borderColor: '#e8cdb5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: DARK,
    fontFamily: 'Roboto',
    minHeight: 100,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  errorText: { fontSize: 12, color: '#dc2626', fontFamily: 'Roboto', marginTop: 4, marginBottom: 8 },
  resultsContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  resultsTitle: { fontSize: 15, fontFamily: 'Roboto-Medium', color: DARK, marginBottom: 4 },
  resultsSub: { fontSize: 12, color: GREY, fontFamily: 'Roboto', marginBottom: 16, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: 'Roboto-Medium', letterSpacing: 1, marginRight: 8 },
  sectionLine: { flex: 1, height: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  cardImagePlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardCategory: { fontSize: 10, color: GREY, fontFamily: 'Roboto', letterSpacing: 0.5 },
  cardName: { fontSize: 13, color: DARK, fontFamily: 'Roboto-Medium', marginTop: 2, lineHeight: 18 },
  cardPrice: { fontSize: 13, fontFamily: 'Roboto-Medium', color: DARK, marginTop: 2 },
  cardActions: { alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginLeft: 8, flexShrink: 0 },
  viewLink: { fontSize: 11, color: BROWN, fontFamily: 'Roboto-Medium', textDecorationLine: 'underline' },
  bottomBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#f0e4d8',
    backgroundColor: CREAM,
  },
});
