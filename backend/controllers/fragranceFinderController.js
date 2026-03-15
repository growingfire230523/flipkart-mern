const https = require('https');
const Product = require('../models/productModel');
const ErrorHandler = require('../utils/errorHandler');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');

const PERFUME_SUBCATEGORIES = new Set(['Premium Perfumes', 'Mens Perfumes', 'Womens Perfumes']);
const OPENAI_HOST = 'api.openai.com';
const OPENAI_PATH = '/v1/chat/completions';

const shouldAllowInsecureTls = () => {
  const flag = process.env.OPENAI_INSECURE_TLS || process.env.VOICE_TRANSCRIBE_INSECURE_TLS;
  return String(flag || '').trim().toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
};

const normalizeText = (value) => String(value || '').toLowerCase();

const getAzureOpenAIConfig = () => {
  const endpointRaw = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

  if (!endpointRaw || !apiKey || !deployment || !apiVersion) return null;

  let endpointUrl;
  try {
    endpointUrl = new URL(String(endpointRaw).trim());
  } catch (_) {
    try {
      endpointUrl = new URL(`https://${String(endpointRaw).trim().replace(/^https?:\/\//i, '')}`);
    } catch (__){
      return null;
    }
  }

  const origin = endpointUrl.origin;
  const hostname = endpointUrl.hostname;
  const path = `/openai/deployments/${encodeURIComponent(String(deployment).trim())}/chat/completions?api-version=${encodeURIComponent(
    String(apiVersion).trim()
  )}`;

  return {
    origin,
    hostname,
    path,
    apiKey: String(apiKey).trim(),
  };
};

const productHaystack = (product) => {
  const parts = [
    product?.name,
    product?.category,
    product?.subCategory,
    product?.brand?.name,
    product?.description,
    ...(Array.isArray(product?.highlights) ? product.highlights : []),
    ...(Array.isArray(product?.specifications)
      ? product.specifications.flatMap((s) => [s?.title, s?.description])
      : []),
  ];

  return normalizeText(parts.filter(Boolean).join(' '));
};

const includesAny = (haystack, keywords) => {
  if (!haystack) return false;
  return keywords.some((k) => haystack.includes(k));
};

const countMatches = (haystack, keywords) => {
  if (!haystack || !Array.isArray(keywords)) return 0;
  return keywords.reduce((count, k) => (haystack.includes(k) ? count + 1 : count), 0);
};

const GENDER_HINTS = {
  feminine: ['women', 'womens', 'female', 'feminine', 'for her', 'lady', 'ladies'],
  masculine: ['men', 'mens', 'male', 'masculine', 'for him', 'gentleman', 'gents'],
};

const TYPE_KEYWORDS = {
  woody: ['woody', 'cedar', 'sandalwood', 'vetiver', 'oud'],
  fresh: ['fresh', 'citrus', 'marine', 'aquatic', 'green'],
  warmSpicy: ['spicy', 'amber', 'vanilla', 'cinnamon', 'warm'],
  aromaticSensual: ['aromatic', 'musk', 'sensual', 'lavender'],
  brightFruity: ['fruity', 'bright', 'berry', 'pear', 'apple', 'citrus'],
  floralLuminous: ['floral', 'jasmine', 'rose', 'lily', 'white floral'],
  warmSensual: ['warm', 'sensual', 'vanilla', 'amber', 'musk'],
};

const OCCASION_KEYWORDS = {
  special: ['special occasion', 'party', 'evening', 'celebration', 'intense'],
  date: ['date', 'romantic', 'night', 'sensual'],
  work: ['office', 'work', 'clean', 'soft', 'fresh'],
  everyday: ['everyday', 'daily', 'signature', 'fresh'],
  vacation: ['summer', 'beach', 'tropical', 'fresh', 'citrus'],
};

const INTENSITY_KEYWORDS = {
  discreet: ['eau de toilette', 'edt', 'light', 'soft', 'fresh'],
  personal: ['eau de parfum', 'edp', 'balanced'],
  outgoing: ['intense', 'strong', 'long lasting', 'projection'],
  bold: ['parfum', 'elixir', 'extrait', 'very long lasting', 'bold'],
};

const GIFT_KEYWORDS = ['gift', 'gift set', 'present', 'gifting'];

const inferGender = (product, haystack) => {
  const sub = normalizeText(product?.subCategory);

  if (sub.includes('women')) return 'feminine';
  if (sub.includes('men')) return 'masculine';

  const femHits = countMatches(haystack, GENDER_HINTS.feminine);
  const masHits = countMatches(haystack, GENDER_HINTS.masculine);

  if (femHits > masHits && femHits > 0) return 'feminine';
  if (masHits > femHits && masHits > 0) return 'masculine';
  return 'unisex';
};

const getMatchCounts = (haystack, answers) => {
  const typeKeywords = TYPE_KEYWORDS[answers.type] || [];
  const occasionKeywords = OCCASION_KEYWORDS[answers.occasion] || [];
  const intensityKeywords = INTENSITY_KEYWORDS[answers.intensity] || [];

  return {
    typeCount: countMatches(haystack, typeKeywords),
    occasionCount: countMatches(haystack, occasionKeywords),
    intensityCount: countMatches(haystack, intensityKeywords),
  };
};

const answerToSearchTokens = ({ preference, occasion, type, intensity, forWhom }) => {
  const tokens = ['perfume', 'fragrance', 'eau', 'parfum'];

  if (preference === 'feminine') tokens.push('women', 'womens', 'female', 'feminine', 'for her');
  if (preference === 'masculine') tokens.push('men', 'mens', 'male', 'masculine', 'for him');

  if (forWhom === 'gift') tokens.push('gift', 'gift set', 'present');

  if (occasion === 'special') tokens.push('party', 'evening', 'special occasion', 'celebration');
  if (occasion === 'date') tokens.push('date', 'romantic', 'night');
  if (occasion === 'work') tokens.push('office', 'day', 'clean', 'soft');
  if (occasion === 'everyday') tokens.push('everyday', 'daily', 'signature');
  if (occasion === 'vacation') tokens.push('summer', 'beach', 'tropical', 'fresh');

  if (type === 'woody') tokens.push('woody', 'cedar', 'sandalwood', 'vetiver', 'oud');
  if (type === 'fresh') tokens.push('fresh', 'citrus', 'marine', 'aquatic', 'green');
  if (type === 'warmSpicy') tokens.push('spicy', 'amber', 'vanilla', 'cinnamon', 'warm');
  if (type === 'aromaticSensual') tokens.push('aromatic', 'musk', 'sensual', 'lavender');
  if (type === 'brightFruity') tokens.push('fruity', 'bright', 'berry', 'pear', 'apple');
  if (type === 'floralLuminous') tokens.push('floral', 'jasmine', 'rose', 'lily', 'white floral');
  if (type === 'warmSensual') tokens.push('warm', 'sensual', 'vanilla', 'amber', 'musk');

  if (intensity === 'discreet') tokens.push('light', 'subtle', 'soft', 'edt');
  if (intensity === 'personal') tokens.push('everyday', 'balanced', 'edp');
  if (intensity === 'outgoing') tokens.push('intense', 'projection', 'strong');
  if (intensity === 'bold') tokens.push('bold', 'parfum', 'elixir', 'intense');

  return tokens;
};

const scoreProduct = (product, answers) => {
  const hay = productHaystack(product);
  const reasons = [];

  let score = 0;

  // Always prefer actual perfume items.
  if (product?.category === 'FRAGRANCES') score += 25;
  if (PERFUME_SUBCATEGORIES.has(product?.subCategory)) score += 20;

  // Gender alignment matters for brand perception.
  const inferredGender = inferGender(product, hay);
  if (answers.preference === 'feminine') {
    if (inferredGender === 'feminine') {
      score += 24;
      reasons.push('Women-focused');
    } else if (inferredGender === 'masculine') {
      score -= 28;
    }
  }

  if (answers.preference === 'masculine') {
    if (inferredGender === 'masculine') {
      score += 24;
      reasons.push('Men-focused');
    } else if (inferredGender === 'feminine') {
      score -= 28;
    }
  }

  // Preference-based boosting.
  if (answers.preference === 'feminine') {
    if (normalizeText(product?.subCategory).includes('women')) {
      score += 10;
    }
    if (includesAny(hay, ['for her', 'women', 'womens', 'female', 'feminine'])) {
      score += 6;
      reasons.push('Matches feminine preference');
    }
  }

  if (answers.preference === 'masculine') {
    if (normalizeText(product?.subCategory).includes('men')) {
      score += 10;
    }
    if (includesAny(hay, ['for him', 'men', 'mens', 'male', 'masculine'])) {
      score += 6;
      reasons.push('Matches masculine preference');
    }
  }

  const { typeCount: typeMatchCount, occasionCount: occasionMatchCount, intensityCount: intensityMatchCount } =
    getMatchCounts(hay, answers);

  // Type keywords.
  const typeKeywords = TYPE_KEYWORDS[answers.type] || [];
  if (typeKeywords.length && typeMatchCount > 0) {
    score += 12 + typeMatchCount * 3;
    reasons.push('Matches fragrance type');
  } else if (typeKeywords.length) {
    score -= 8;
  }

  // Occasion keywords.
  const occasionKeywords = OCCASION_KEYWORDS[answers.occasion] || [];
  if (occasionKeywords.length && occasionMatchCount > 0) {
    score += 8 + occasionMatchCount * 2;
    reasons.push('Fits your occasion');
  } else if (occasionKeywords.length) {
    score -= 5;
  }

  // Intensity: use common concentration hints.
  const intensityKeywords = INTENSITY_KEYWORDS[answers.intensity] || [];
  if (intensityKeywords.length && intensityMatchCount > 0) {
    score += 6 + intensityMatchCount * 2;
    reasons.push('Matches intensity');
  } else if (intensityKeywords.length) {
    score -= 4;
  }

  if (answers.forWhom === 'gift') {
    const giftMatchCount = countMatches(hay, GIFT_KEYWORDS);
    if (giftMatchCount > 0) {
      score += 6 + giftMatchCount * 2;
      reasons.push('Great for gifting');
    }
  }

  // Popularity/quality tie-breakers.
  const ratings = Number(product?.ratings || 0);
  const orderCount = Number(product?.orderCount || 0);

  score += ratings * 2.5;
  score += Math.min(16, orderCount / 30);

  return { score, reasons: Array.from(new Set(reasons)).slice(0, 4) };
};

const summarizeCandidate = (product) => ({
  id: String(product?._id || ''),
  name: String(product?.name || '').trim(),
  brand: String(product?.brand?.name || '').trim(),
  subCategory: String(product?.subCategory || '').trim(),
  description: String(product?.description || '').slice(0, 380),
  highlights: Array.isArray(product?.highlights) ? product.highlights.slice(0, 6) : [],
  fragranceMeta: product?.fragranceMeta
    ? {
      gender: product.fragranceMeta.gender,
      smellFamilies: Array.isArray(product.fragranceMeta.smellFamilies) ? product.fragranceMeta.smellFamilies.slice(0, 8) : [],
      intensity: product.fragranceMeta.intensity,
      notes: Array.isArray(product.fragranceMeta.notes) ? product.fragranceMeta.notes.slice(0, 10) : [],
      occasions: Array.isArray(product.fragranceMeta.occasions) ? product.fragranceMeta.occasions.slice(0, 8) : [],
      tags: Array.isArray(product.fragranceMeta.tags) ? product.fragranceMeta.tags.slice(0, 10) : [],
    }
    : null,
  inferredGender: inferGender(product, productHaystack(product)),
});

const callGptPicker = async ({ answers, candidates }) => {
  const azureConfig = getAzureOpenAIConfig();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = String(process.env.LEXY_FRAGRANCE_MODEL || 'gpt-4o-mini').trim();

  if (!azureConfig && !apiKey) return null;

  const system =
    'You are a fragrance expert for a beauty e-commerce store. ' +
    'Pick the best single product for the customer based ONLY on the provided candidates (do not invent products). ' +
    'Use: name + description + subCategory + fragranceMeta (gender/smellFamilies/intensity/notes/occasions/tags). ' +
    'Strongly respect the customer preference (feminine/masculine/unisex) and intensity/occasion/type. ' +
    'Return JSON only: {"productId": string, "reasons": [string, string, string], "matched": {"gender": string, "smell": string, "intensity": string}}.';

  const user = {
    answers,
    candidates,
  };

  const payload = {
    model: azureConfig ? undefined : model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) },
    ],
  };

  const body = Buffer.from(JSON.stringify(payload));

  return new Promise((resolve, reject) => {
    const hostname = azureConfig ? azureConfig.hostname : OPENAI_HOST;
    const path = azureConfig ? azureConfig.path : OPENAI_PATH;
    const headers = azureConfig
      ? { 'api-key': azureConfig.apiKey, 'Content-Type': 'application/json', 'Content-Length': body.length }
      : { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': body.length };

    const req = https.request(
      {
        method: 'POST',
        hostname,
        path,
        headers,
        ...(shouldAllowInsecureTls() ? { rejectUnauthorized: false } : null),
        timeout: 30_000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            return reject(new Error('GPT response was not valid JSON.'));
          }

          if (res.statusCode >= 400) {
            const msg = parsed?.error?.message || `GPT error: HTTP ${res.statusCode}`;
            return reject(new Error(msg));
          }

          const content = parsed?.choices?.[0]?.message?.content;
          if (!content) return reject(new Error('GPT returned empty content.'));

          try {
            resolve(JSON.parse(content));
          } catch {
            reject(new Error('GPT returned non-JSON content.'));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('GPT request timed out')));
    req.write(body);
    req.end();
  });
};

const safeTrimReasons = (reasons) =>
  Array.isArray(reasons)
    ? reasons.map((r) => String(r || '').trim()).filter(Boolean).slice(0, 3)
    : [];

exports.recommendFragrance = asyncErrorHandler(async (req, res, next) => {
  const {
    forWhom = 'self',
    preference,
    occasion,
    type,
    intensity,
  } = req.body || {};

  if (!preference || !occasion || !type || !intensity) {
    return next(new ErrorHandler('Missing required answers for fragrance recommendation', 400));
  }

  const answers = {
    forWhom,
    preference,
    occasion,
    type,
    intensity,
  };

  const searchTokens = answerToSearchTokens(answers);
  const searchQuery = searchTokens.join(' ');

  const baseFilter = { category: 'FRAGRANCES' };
  if (answers.preference === 'feminine') {
    baseFilter.subCategory = { $in: ['Womens Perfumes', 'Premium Perfumes'] };
  } else if (answers.preference === 'masculine') {
    baseFilter.subCategory = { $in: ['Mens Perfumes', 'Premium Perfumes'] };
  } else {
    baseFilter.subCategory = { $in: Array.from(PERFUME_SUBCATEGORIES) };
  }

  let candidates = [];

  // Prefer text search if possible (index exists on Product).
  try {
    candidates = await Product.find(
      { ...baseFilter, $text: { $search: searchQuery } },
      {
        score: { $meta: 'textScore' },
        name: 1,
        description: 1,
        highlights: 1,
        specifications: 1,
        price: 1,
        cuttedPrice: 1,
        images: 1,
        brand: 1,
        category: 1,
        subCategory: 1,
        fragranceMeta: 1,
        ratings: 1,
        numOfReviews: 1,
        orderCount: 1,
        createdAt: 1,
      }
    )
      .sort({ score: { $meta: 'textScore' }, orderCount: -1, ratings: -1, createdAt: -1 })
      .limit(40);
  } catch (err) {
    // Fallback: no $text support in some Mongo configs.
    candidates = await Product.find(baseFilter)
      .select('name description highlights specifications price cuttedPrice images brand category subCategory fragranceMeta ratings numOfReviews orderCount createdAt')
      .sort({ orderCount: -1, ratings: -1, createdAt: -1 })
      .limit(80);
  }

  // If we still have no candidates, relax subCategory (but stay in FRAGRANCES).
  if (!candidates.length) {
    candidates = await Product.find({ category: 'FRAGRANCES' })
      .select('name description highlights specifications price cuttedPrice images brand category subCategory fragranceMeta ratings numOfReviews orderCount createdAt')
      .sort({ orderCount: -1, ratings: -1, createdAt: -1 })
      .limit(80);
  }

  if (!candidates.length) {
    return next(new ErrorHandler('No fragrance products found in the store', 404));
  }

  const filteredCandidates = candidates.filter((product) => {
    const hay = productHaystack(product);
    const inferredGender = inferGender(product, hay);
    const metaGender = normalizeText(product?.fragranceMeta?.gender);
    const effectiveGender = metaGender && metaGender !== 'unknown' ? metaGender : inferredGender;

    if (answers.preference === 'feminine' && effectiveGender === 'masculine') return false;
    if (answers.preference === 'masculine' && effectiveGender === 'feminine') return false;

    const { typeCount, occasionCount, intensityCount } = getMatchCounts(hay, answers);
    return typeCount + occasionCount + intensityCount > 0;
  });

  const candidatesToRank = filteredCandidates.length >= 6 ? filteredCandidates : candidates;

  const ranked = candidatesToRank
    .map((product) => {
      const { score, reasons } = scoreProduct(product, answers);
      const textScore = typeof product?.score === 'number' ? product.score : 0;
      const finalScore = score + textScore * 5;
      return { product, finalScore, reasons };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  let picked = ranked[0]?.product || candidates[0];
  let pickedReasons = ranked[0]?.reasons || [];

  const gptCandidateLimit = Math.max(6, Math.min(25, Number(process.env.LEXY_FRAGRANCE_GPT_CANDIDATE_LIMIT || 18)));
  const topCandidates = ranked.slice(0, gptCandidateLimit).map((r) => r.product);

  if (topCandidates.length >= 2) {
    try {
      const pickedByGpt = await callGptPicker({
        answers,
        candidates: topCandidates.map((p) => summarizeCandidate(p)),
      });

      const productId = String(pickedByGpt?.productId || '').trim();
      if (productId) {
        const found = topCandidates.find((p) => String(p?._id) === productId);
        if (found) {
          picked = found;
        }
      }

      const gptReasons = safeTrimReasons(pickedByGpt?.reasons);
      if (gptReasons.length) pickedReasons = gptReasons;
    } catch {
      // Silent fallback to deterministic scoring.
    }
  }

  res.status(200).json({
    success: true,
    answers,
    recommendation: {
      product: picked,
      reasons: pickedReasons,
    },
  });
});
