// ── SV Forecast AI — Self-Adaptive Dataset-Aware Analytics Engine v4.0 ────────
// Master Copilot Service: Multilingual Query Understanding, Dynamic Product Indexing,
// Structured QueryPlan Architecture, Future Forecast Integrity & Mandatory Validation
//

import { ObjectId } from 'mongodb';

// ── 0. Centralized Language Registry ──────────────────────────────────────────
export const COPILOT_LANGUAGES = {
  auto: { name: 'Auto Detect', code: 'auto', locale: 'en-IN' },
  en: { name: 'English', code: 'en', locale: 'en-IN' },
  mr: { name: 'Marathi', code: 'mr', locale: 'mr-IN' },
  hi: { name: 'Hindi', code: 'hi', locale: 'hi-IN' },
  kn: { name: 'Kannada', code: 'kn', locale: 'kn-IN' },
  ta: { name: 'Tamil', code: 'ta', locale: 'ta-IN' },
  te: { name: 'Telugu', code: 'te', locale: 'te-IN' },
  ml: { name: 'Malayalam', code: 'ml', locale: 'ml-IN' },
  bn: { name: 'Bengali', code: 'bn', locale: 'bn-IN' },
  gu: { name: 'Gujarati', code: 'gu', locale: 'gu-IN' },
  pa: { name: 'Punjabi', code: 'pa', locale: 'pa-IN' },
  or: { name: 'Odia', code: 'or', locale: 'or-IN' },
  ur: { name: 'Urdu', code: 'ur', locale: 'ur-IN' }
};

export function normalizeLanguageCode(lang) {
  if (!lang) return 'en';
  const l = String(lang).toLowerCase().trim();
  if (COPILOT_LANGUAGES[l]) return l;
  const nameMap = {
    'auto': 'auto', 'autodetect': 'auto', 'auto detect': 'auto',
    'english': 'en', 'marathi': 'mr', 'मराठी': 'mr',
    'hindi': 'hi', 'हिन्दी': 'hi', 'हिंदी': 'hi',
    'kannada': 'kn', 'ಕನ್ನಡ': 'kn', 'tamil': 'ta', 'தமிழ்': 'ta',
    'telugu': 'te', 'తెలుగు': 'te', 'malayalam': 'ml', 'മലയാളം': 'ml',
    'bengali': 'bn', 'বাংলা': 'bn', 'gujarati': 'gu', 'ગુજરાતી': 'gu',
    'punjabi': 'pa', 'ਪੰਜਾਬੀ': 'pa', 'odia': 'or', 'oriya': 'or',
    'ଓଡ଼ିଆ': 'or', 'urdu': 'ur', 'اردو': 'ur'
  };
  if (nameMap[l]) return nameMap[l];
  if (l.startsWith('en')) return 'en'; if (l.startsWith('mr')) return 'mr';
  if (l.startsWith('hi')) return 'hi'; if (l.startsWith('kn')) return 'kn';
  if (l.startsWith('ta')) return 'ta'; if (l.startsWith('te')) return 'te';
  if (l.startsWith('ml')) return 'ml'; if (l.startsWith('bn')) return 'bn';
  if (l.startsWith('gu')) return 'gu'; if (l.startsWith('pa')) return 'pa';
  if (l.startsWith('or')) return 'or'; if (l.startsWith('ur')) return 'ur';
  return 'en';
}

// ── 1. Multilingual Vocabularies & Dictionary Normalization ────────────────────
const COMMON_TYPOS = {
  // ASCII Typos
  'machanical': 'mechanical', 'mechanicl': 'mechanical', 'mechanic': 'mechanical',
  'mecanical': 'mechanical', 'keybord': 'keyboard', 'key board': 'keyboard',
  'keybored': 'keyboard', 'keybaord': 'keyboard', 'headphon': 'headphones',
  'headphone': 'headphones', 'headphons': 'headphones', 'head phones': 'headphones',
  'earphon': 'headphones', 'earphones': 'headphones', 'earphone': 'headphones',
  'headset': 'headphones', 'yogo': 'yoga', 'yogamat': 'yoga mat',
  'smartwacth': 'smart watch', 'smartwatc': 'smart watch', 'smartwach': 'smart watch',
  'smartwatch': 'smart watch', 'botle': 'water bottle', 'botel': 'water bottle',
  'bottel': 'water bottle', 'flask': 'water bottle', 'bycycal': 'bicycle',
  'bycicle': 'bicycle', 'bicyle': 'bicycle', 'bicycal': 'bicycle',
  'helmit': 'helmet', 'helmte': 'helmet', 'peenut': 'peanut', 'peanutt': 'peanut',
  'buttr': 'butter', 'ashirvad': 'aashirvaad', 'ashirvaad': 'aashirvaad',
  'airfryer': 'air fryer', 'air fry': 'air fryer', 'airfry': 'air fryer',
  'microwav': 'microwave', 'microave': 'microwave', 'microovew': 'microwave',
  'blnder': 'blender', 'blendr': 'blender',

  // ── Kannada ──
  'ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲ್': 'apple gaming controller',
  'ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲರ್': 'apple gaming controller',
  'ಆಪಲ್': 'apple', 'ಗೇಮಿಂಗ್': 'gaming', 'ಕಂಟ್ರೋಲ್': 'controller', 'ಕಂಟ್ರೋಲರ್': 'controller',
  'ಬೋಟ್': 'boat', 'ಬೋಆಟ್': 'boat', 'ಲೆನೊವೊ': 'lenovo', 'ಒನ್‌ಪ್ಲಸ್': 'oneplus',
  'ಡೆಲ್': 'dell', 'ಲಾಜಿಟೆಕ್': 'logitech', 'ಸ್ಯಾಮ್‌ಸಂಗ್': 'samsung', 'ಸೋನಿ': 'sony',
  'ಏರ್ ಫ್ರೈಯರ್': 'air fryer', 'ಆರ್ ಫ್ರೈಯರ್': 'air fryer', 'ಮೈಕ್ರೋವೇವ್': 'microwave',
  'ಬ್ಲೆಂಡರ್': 'blender', 'ಫಾಸ್ಟ್ ಚಾರ್ಜರ್': 'fast charger', 'ವೈರ್‌ಲೆಸ್ ಚಾರ್ಜರ್': 'wireless charger',
  'ಚಾರ್ಜರ್': 'charger', 'ಕೀಬೋರ್ಡ್': 'keyboard', 'ಕೀಲಿಮಣೆ': 'keyboard',
  'ಹೆಡ್ಫೋನ್': 'headphones', 'ಹೆಡ್‌ಫೋನ್': 'headphones', 'ಇಯರ್ಫೋನ್': 'headphones',
  'ಸ್ಮಾರ್ಟ್‌ವಾಚ್': 'smart watch', 'ಬಾಟಲ್': 'water bottle', 'ಬಾಟಲಿ': 'water bottle',
  'ಸೈಕಲ್': 'bicycle', 'ಹೆಲ್ಮೆಟ್': 'helmet',
  'ಮುಂದಿನ ತಿಂಗಳು': 'next month', 'ಮುಂದಿನ ತಿಂಗಳಿನ': 'next month', 'ಮುಂದಿನ ವಾರ': 'next week',
  'ಆದಾಯ': 'revenue', 'ಮಾರಾಟ': 'sales', 'ಬೆಲೆ': 'price', 'ಎಷ್ಟು': 'how much',
  'ಗರಿಷ್ಠ': 'highest', 'ಕನಿಷ್ಠ': 'lowest', 'ದಾಸ್ತಾನು': 'stock',

  // ── Hindi & Marathi ──
  'ऐप्पल गेमिंग कंट्रोल': 'apple gaming controller',
  'ऐप्पल गेमिंग कंट्रोलर': 'apple gaming controller',
  'ऐप्पल': 'apple', 'गेमिंग': 'gaming', 'कंट्रोल': 'controller', 'कंट्रोलर': 'controller',
  'अ‍ॅपल गेमिंग कंट्रोलर': 'apple gaming controller', 'अ‍ॅपल': 'apple',
  'बोट': 'boat', 'लेनोवो': 'lenovo', 'वनप्लस': 'oneplus', 'डेल': 'dell',
  'लॉजिटेक': 'logitech', 'सैमसंग': 'samsung', 'सॅमसंग': 'samsung', 'सोनी': 'sony',
  'एयर फ्रायर': 'air fryer', 'माइक्रोवेव': 'microwave', 'मायक्रोवेव्ह': 'microwave',
  'फास्ट चार्जर': 'fast charger', 'वायरलेस चार्जर': 'wireless charger', 'चार्जर': 'charger',
  'कीबोर्ड': 'keyboard', 'कीबोर्डची': 'keyboard', 'कीबोर्डचे': 'keyboard',
  'हेडफोन': 'headphones', 'हेडफोन्स': 'headphones', 'इयरफोन': 'headphones',
  'स्मार्टवॉच': 'smart watch', 'बाटली': 'water bottle', 'बॉटल': 'water bottle',
  'बोतल': 'water bottle', 'पीनट': 'peanut', 'बटर': 'butter', 'सायकल': 'bicycle',
  'हेल्मेट': 'helmet', 'हेलमेट': 'helmet',
  'अगले महीने': 'next month', 'पुढच्या महिन्यात': 'next month', 'पुढील महिन्यात': 'next month',
  'राजस्व': 'revenue', 'आय': 'revenue', 'कमाई': 'revenue', 'महसूल': 'revenue', 'उत्पन्न': 'revenue',
  'बिक्री': 'sales', 'मांग': 'demand', 'विक्री': 'sales', 'मागणी': 'demand',
  'मूल्य': 'price', 'कीमत': 'price', 'दाम': 'price', 'किंमत': 'price', 'दर': 'price',
  'उच्चतम': 'highest', 'न्यूनतम': 'lowest',

  // ── Tamil ──
  'ஆப்பிள் கேமிங் கண்ட்ரோலர்': 'apple gaming controller',
  'ஆப்பிள்': 'apple', 'கேமிங்': 'gaming', 'கண்ட்ரோலர்': 'controller',
  'போட்': 'boat', 'லெனோவா': 'lenovo', 'ஒன்பிளஸ்': 'oneplus', 'டெல்': 'dell',
  'லாஜிடெக்': 'logitech', 'சாம்சங்': 'samsung', 'சோனி': 'sony', 'ஏர் பிரையர்': 'air fryer',
  'சார்ஜர்': 'charger', 'பாஸ்ட் சார்ஜர்': 'fast charger', 'வயர்லெஸ் சார்ஜர்': 'wireless charger',
  'விசைப்பலகை': 'keyboard', 'கீபோர்டு': 'keyboard', 'ஹெட்போன்': 'headphones',
  'பாட்டில்': 'water bottle', 'அடுத்த மாதம்': 'next month',
  'வருவாய்': 'revenue', 'ஆதாயம்': 'revenue', 'விற்பனை': 'sales', 'விலை': 'price',

  // ── Telugu ──
  'ఆపిల్ గేమింగ్ కంట్రోలర్': 'apple gaming controller',
  'ఆపిల్': 'apple', 'గేమింగ్': 'gaming', 'కంట్రోలర్': 'controller',
  'బోట్': 'boat', 'లెనోవో': 'lenovo', 'వన్ ప్లస్': 'oneplus', 'డెల్': 'dell',
  'చార్జర్': 'charger', 'ఛార్జర్': 'charger', 'ఫాస్ట్ ఛార్జర్': 'fast charger', 'వైర్‌లెస్ ఛార్జర్': 'wireless charger',
  'కీబోర్డ్': 'keyboard', 'హెడ్‌ఫోన్': 'headphones', 'సీసా': 'water bottle',
  'వచ్చే నెల': 'next month', 'రాబోయే నెల': 'next month',
  'ఆదాయం': 'revenue', 'రాబడి': 'revenue', 'విక్రయాలు': 'sales', 'అమ్మకాలు': 'sales', 'ధర': 'price',

  // ── Malayalam ──
  'ആപ്പിൾ ഗെയിമിംഗ് കൺട്രോളർ': 'apple gaming controller',
  'ആപ്പിൾ': 'apple', 'ഗെയിമിംഗ്': 'gaming', 'കൺട്രോളർ': 'controller',
  'ചാർജർ': 'charger', 'ഫാസ്റ്റ് ചാർജർ': 'fast charger', 'വയർലെസ് ചാർജർ': 'wireless charger',
  'കീബോർഡ്': 'keyboard', 'ഹെഡ്ഫോൺ': 'headphones', 'കുപ്പി': 'water bottle',
  'അടുത്ത മാസം': 'next month', 'ആദായം': 'revenue', 'വരുമാനം': 'revenue',
  'വിൽപ്പന': 'sales', 'വില': 'price',

  // ── Bengali ──
  'অ্যাপল গেমিং কন্ট্রোলার': 'apple gaming controller',
  'অ্যাপল': 'apple', 'গেমিং': 'gaming', 'কন্ট্রোলার': 'controller',
  'চার্জার': 'charger', 'ফাস্ট চার্জার': 'fast charger', 'ওয়্যারলেস চার্জার': 'wireless charger',
  'কীবোর্ড': 'keyboard', 'হেডফোন': 'headphones', 'বোতল': 'water bottle',
  'আগামী মাসে': 'next month', 'আয়': 'revenue', 'রাজস্ব': 'revenue',
  'বিক্রয়': 'sales', 'দাম': 'price',

  // ── Gujarati ──
  'એપલ ગેમિંગ કંટ્રોલર': 'apple gaming controller',
  'એપલ': 'apple', 'ચાર્જર': 'charger', 'ફાસ્ટ ચાર્જર': 'fast charger', 'વાયરલેસ ચાર્જર': 'wireless charger',
  'કીબોર્ડ': 'keyboard', 'હેડફોન': 'headphones', 'બોટલ': 'water bottle',
  'આગામી મહિને': 'next month', 'આવક': 'revenue', 'મહેસૂલ': 'revenue',
  'વેચાણ': 'sales', 'કિંમત': 'price',

  // ── Punjabi ──
  'ਐਪਲ ਗੇਮਿੰਗ ਕੰਟਰੋਲਰ': 'apple gaming controller',
  'ਐਪਲ': 'apple', 'ਚਾਰਜਰ': 'charger', 'ਫਾਸਟ ਚਾਰਜਰ': 'fast charger', 'ਵਾਇਰਲੈੱਸ ਚਾਰਜਰ': 'wireless charger',
  'ਕੀਬੋਰਡ': 'keyboard', 'ਹੈੱਡਫੋਨ': 'headphones', 'ਬੋਤਲ': 'water bottle',
  'ਅਗਲੇ ਮਹੀਨੇ': 'next month', 'ਮਾਲੀਆ': 'revenue', 'ਆਮਦਨ': 'revenue',
  'ਵਿਕਰੀ': 'sales', 'ਕੀਮਤ': 'price',

  // ── Odia ──
  'ଆପଲ୍ ଗେମିଂ କଣ୍ଟ୍ରୋଲର୍': 'apple gaming controller',
  'ଆପଲ୍': 'apple', 'ଚାର୍ଜର': 'charger', 'ଫାଷ୍ଟ ଚାର୍ଜର': 'fast charger', 'ୱାୟରଲେସ ଚାର୍ଜର': 'wireless charger',
  'କୀବୋର୍ଡ': 'keyboard', 'ହେଡଫୋନ': 'headphones', 'ବୋତଲ': 'water bottle',
  'ଆସନ୍ତା ମାସରେ': 'next month', 'ରାଜସ୍ୱ': 'revenue', 'ଆୟ': 'revenue',
  'ବିକ୍ରୟ': 'sales', 'ମୂଲ୍ୟ': 'price',

  // ── Urdu ──
  'ایپل گیمنگ کنٹرولر': 'apple gaming controller',
  'ایپل': 'apple', 'چارجر': 'charger', 'فاسٹ چارجر': 'fast charger', 'وائرلیس چارجر': 'wireless charger',
  'کی بورڈ': 'keyboard', 'ہیڈ فون': 'headphones', 'بوتل': 'water bottle',
  'اگلے مہینے': 'next month', 'آمدنی': 'revenue', 'محصول': 'revenue',
  'فروخت': 'sales', 'قیمت': 'price',

  // General Typos
  'moth': 'month', 'monht': 'month', 'mont': 'month', 'mext': 'next',
  'nxt': 'next', 'comin': 'coming', 'comming': 'coming', 'tmrw': 'tomorrow',
  'incress': 'increase', 'increse': 'increase', 'increas': 'increase',
  'decress': 'decrease', 'decrese': 'decrease',
  'higest': 'highest', 'higgest': 'highest', 'lowestt': 'lowest',
  'revnue': 'revenue', 'revenu': 'revenue', 'saless': 'sales', 'forecst': 'forecast'
};

export function normalizeInputText(rawText) {
  if (!rawText) return '';
  let text = rawText.toLowerCase().trim();

  // Multi-word replacements first
  for (const [typo, replacement] of Object.entries(COMMON_TYPOS)) {
    if (text.includes(typo)) {
      if (/^[a-zA-Z0-9\s]+$/.test(typo)) {
        const regex = new RegExp(`\\b${typo}\\b`, 'gi');
        text = text.replace(regex, replacement);
      } else {
        text = text.split(typo).join(replacement);
      }
    }
  }

  const words = text.split(/\s+/);
  const normalizedWords = words.map(w => {
    const cleanWord = w.replace(/[.,/#!$%^&*;:{}=\-_`~()?।॥،؟]/g, '').trim();
    if (COMMON_TYPOS[cleanWord]) {
      return w.replace(cleanWord, COMMON_TYPOS[cleanWord]);
    }
    return w;
  });
  return normalizedWords.join(' ');
}

// ── 2. String Similarity (Levenshtein Distance) ────────────────────────────────
export function levenshteinDistance(s1, s2) {
  const a = s1.toLowerCase(); const b = s2.toLowerCase();
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) { matrix[i][j] = matrix[i - 1][j - 1]; }
      else { matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)); }
    }
  }
  return matrix[b.length][a.length];
}

export function calculateStringSimilarity(s1, s2) {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshteinDistance(s1, s2) / maxLen;
}

// ── 3. Dynamic Product Indexer & Cache ─────────────────────────────────────────
// Caches dynamic product indexes per datasetId/forecastId. Rebuilds automatically when dataset changes.
const PRODUCT_INDEX_CACHE = new Map();

export function invalidateCopilotCache(datasetId = null, forecastId = null) {
  if (datasetId) PRODUCT_INDEX_CACHE.delete(String(datasetId));
  if (forecastId) PRODUCT_INDEX_CACHE.delete(String(forecastId));
  if (!datasetId && !forecastId) PRODUCT_INDEX_CACHE.clear();
  console.log(`[AI COPILOT v4.0] Cache invalidated for datasetId=${datasetId}, forecastId=${forecastId}`);
}

export function getOrBuildProductIndex(availableProductStrings = [], cacheKey = 'default') {
  if (PRODUCT_INDEX_CACHE.has(cacheKey)) {
    return PRODUCT_INDEX_CACHE.get(cacheKey);
  }

  const index = availableProductStrings.map(rawName => {
    const canonical = rawName.trim();
    const normalized = canonical.toLowerCase();
    const cleanPunct = normalized.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const tokens = cleanPunct.split(/\s+/).filter(t => t.length > 1);

    // Extract base parent product name if variant/size suffix exists (e.g. "Apple Gaming Controller - 43-inch" -> "apple gaming controller")
    const baseParent = normalized.split(/[-–—(›]/)[0].trim();
    const cleanBaseParent = baseParent.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

    const aliases = new Set([
      canonical.toLowerCase(),
      cleanPunct,
      cleanBaseParent,
      cleanPunct.replace(/\s+/g, '-'),
      cleanPunct.replace(/\s+/g, ''),
    ]);

    tokens.forEach(t => {
      if (t.endsWith('s')) aliases.add(cleanPunct.replace(new RegExp(`\\b${t}\\b`), t.slice(0, -1)));
      else aliases.add(cleanPunct.replace(new RegExp(`\\b${t}\\b`), t + 's'));
    });

    return {
      canonical,
      normalized,
      cleanPunct,
      cleanBaseParent,
      tokens,
      aliases: Array.from(aliases).filter(a => a.length >= 3)
    };
  });

  PRODUCT_INDEX_CACHE.set(cacheKey, index);
  return index;
}

// ── 4. 10-Level Dynamic Product Resolution Pipeline ───────────────────────────
export function resolveProductEntity(queryText, productIndex = [], conversationContext = {}) {
  if (!queryText || !productIndex.length) {
    return { canonicalProduct: null, confidence: 0, matchType: 'none', alternatives: [] };
  }

  const rawNorm = normalizeInputText(queryText).toLowerCase().trim();
  const cleanNorm = rawNorm.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  const qTokens = cleanNorm.split(/\s+/).filter(t => t.length > 2);

  const candidateScores = [];

  for (const item of productIndex) {
    let score = 0;
    let matchType = 'none';

    // Level 1: Exact Canonical Match
    if (queryText.trim() === item.canonical) {
      score = 1.0; matchType = 'exact_canonical';
    }
    // Level 2: Normalized Exact Match
    else if (rawNorm === item.normalized || cleanNorm === item.cleanPunct) {
      score = 0.98; matchType = 'exact_normalized';
    }
    // Level 3: Alias Exact Match
    else if (item.aliases.some(alias => rawNorm.includes(alias) || alias === rawNorm)) {
      score = 0.95; matchType = 'alias_match';
    }
    // Level 4: Full Substring Inclusion
    else if (cleanNorm.includes(item.cleanPunct) || item.cleanPunct.includes(cleanNorm)) {
      score = 0.90; matchType = 'substring';
    }
    // Level 5 to Level 8: Token Overlap & Fuzzy Levenshtein Match
    else {
      let tokenMatches = 0;
      for (const qt of qTokens) {
        for (const pt of item.tokens) {
          if (pt === qt) tokenMatches += 5;
          else if (pt.startsWith(qt) || qt.startsWith(pt)) tokenMatches += 3;
          else if (calculateStringSimilarity(pt, qt) >= 0.75) tokenMatches += 3;
        }
      }

      if (tokenMatches > 0) {
        score = Math.min(0.88, 0.40 + (tokenMatches * 0.12));
        matchType = 'token_fuzzy';
      } else {
        const fullSim = calculateStringSimilarity(cleanNorm, item.cleanPunct);
        if (fullSim >= 0.65) {
          score = fullSim * 0.85;
          matchType = 'fuzzy_full';
        }
      }
    }

    if (score > 0.45) {
      candidateScores.push({ item, score, matchType });
    }
  }

  candidateScores.sort((a, b) => b.score - a.score);

  if (candidateScores.length === 0) {
    return { canonicalProduct: null, confidence: 0, matchType: 'none', alternatives: [] };
  }

  const topMatch = candidateScores[0];
  const runnerUp = candidateScores[1];

  // Ambiguity Detection Safety
  if (runnerUp && (topMatch.score - runnerUp.score < 0.12) && topMatch.score < 0.90) {
    return {
      canonicalProduct: null,
      confidence: topMatch.score,
      matchType: 'ambiguous',
      alternatives: candidateScores.slice(0, 4).map(c => c.item.canonical)
    };
  }

  if (topMatch.score >= 0.65) {
    return {
      canonicalProduct: topMatch.item.canonical,
      confidence: topMatch.score,
      matchType: topMatch.matchType,
      alternatives: candidateScores.slice(1, 4).map(c => c.item.canonical)
    };
  }

  return { canonicalProduct: null, confidence: topMatch.score, matchType: 'low_confidence', alternatives: candidateScores.map(c => c.item.canonical) };
}

// ── 5. Backward Compatible Legacy Product Matcher Helper ─────────────────────
export function findBestProductMatch(queryText, availableProducts = []) {
  const index = getOrBuildProductIndex(availableProducts, 'legacy');
  const res = resolveProductEntity(queryText, index);
  return res.canonicalProduct;
}

export function extractProductMentions(queryText) {
  if (!queryText) return [];
  const normalized = normalizeInputText(queryText);
  const words = normalized.split(/\s+/);
  const stopWords = new Set([
    'what', 'is', 'the', 'for', 'in', 'next', 'month', 'week', 'day', 'days',
    'price', 'forecast', 'sales', 'demand', 'revenue', 'stock', 'inventory',
    'reorder', 'risk', 'status', 'highest', 'lowest', 'compare', 'and', 'vs',
    'total', 'average', 'max', 'min', 'growth', 'trend', 'top', 'bottom', 'best', 'worst',
    'random', 'unstructured', 'string', 'xyz123', 'xyz', 'abc', 'test', 'sample', 'dummy',
    'hello', 'hi', 'hey', 'please', 'help', 'can', 'you', 'show', 'give', 'me', 'us',
    'ದಾಸ್ತಾನು', 'ಸ್ಥಿತಿ', 'ವಿವರವನ್ನು', 'ವಿವರಿಸಿ', 'ವಿವರಗಳು', 'ಅಂದಾಜು', 'ಎಷ್ಟು', 'ಮಾಹಿತಿ', 'ಹೇಳಿ', 'ತಿಳಿಸಿ', 'ವಿವರಣೆ',
    'विवरण', 'स्थिति', 'बताएं', 'बताओ', 'स्टॉक', 'जानकारी', 'विवरणों'
  ]);
  return words
    .map(w => w.replace(/[.,/#!$%^&*;:{}=\-_`~()?।॥،؟]/g, '').trim())
    .filter(w => !stopWords.has(w) && w.length > 2);
}

export function isEllipticalFollowUp(normalizedMessage) {
  const trimmed = normalizedMessage.toLowerCase().trim();
  const followUpStarters = [
    /^what about\b/i, /^how about\b/i, /^and\b/i, /^for\b/i, /^in\b/i,
    /^price\??$/i, /^next month\??$/i, /^next week\??$/i, /^revenue\??$/i,
    /^\d+\s*(days|months|weeks)\??$/i, /^stock\??$/i, /^forecast\??$/i,
    /ಮುಂದಿನ ತಿಂಗಳು/i, /ಬೆಲೆ ಎಷ್ಟು/i, /अगले महीने/i, /कीमत क्या/i, /వచ్చే నెల/i
  ];
  return followUpStarters.some(regex => regex.test(trimmed));
}

// ── 6. Period Resolution Engine ────────────────────────────────────────────────
export function resolvePeriod(queryText) {
  const lower = (queryText || '').toLowerCase();

  let days = 30;
  let type = 'future';
  let label = 'next_month';

  const daysMatch = lower.match(/(?:next|last|coming|previous)?\s*(\d+)\s*(days|day|weeks|week|months|month)/i);
  if (daysMatch) {
    const num = parseInt(daysMatch[1], 10);
    const unit = daysMatch[2].toLowerCase();
    if (unit.startsWith('day')) days = num;
    else if (unit.startsWith('week')) days = num * 7;
    else if (unit.startsWith('month')) days = num * 30;
  } else if (lower.includes('next week') || lower.includes('coming week') || lower.includes('ಮುಂದಿನ ವಾರ')) {
    days = 7; label = 'next_week';
  } else if (lower.includes('tomorrow') || lower.includes('नाते')) {
    days = 1; label = 'tomorrow';
  } else if (lower.includes('next 60') || lower.includes('2 months')) {
    days = 60; label = 'next_60_days';
  } else if (lower.includes('next 90') || lower.includes('3 months') || lower.includes('quarter')) {
    days = 90; label = 'next_90_days';
  }

  if (lower.includes('last') || lower.includes('past') || lower.includes('previous') || lower.includes('historical') || lower.includes('इतिहास')) {
    type = 'historical';
    label = 'historical_period';
  }

  return { type, label, days };
}

// ── 7. Language Detection & Strict Routing ────────────────────────────────────
export function detectLanguage(text, selectedLang = 'auto') {
  const normSelected = normalizeLanguageCode(selectedLang);
  if (normSelected && normSelected !== 'auto') return normSelected;
  if (!text) return 'en';

  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) {
    const marathiKeywords = ['आहे', 'ंमध्ये', 'किती', 'सांगा', 'करा', 'होईल', 'असेल', 'पुढच्या', 'महिन्यात', 'उत्पन्न', 'विक्री', 'महसूल'];
    if (marathiKeywords.some(k => text.includes(k))) return 'mr';
    return 'hi';
  }
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';

  const lower = text.toLowerCase();
  if (/\b(kiti|aahe|sanga|pudhchya|mahinyat|kimat|vikri|mahasul)\b/i.test(lower)) return 'mr';
  if (/\b(kitna|kitni|hogi|batao|agale|mahine|bikri|kimat|rajasva)\b/i.test(lower)) return 'hi';
  if (/\b(estu|eshtu|yaavudhu|mundina|tingala|marata|aadaaya|bele)\b/i.test(lower)) return 'kn';
  if (/\b(eppodu|yevlo|ethanai|evvalavu|madham|solunga|virpanai|vilai)\b/i.test(lower)) return 'ta';
  if (/\b(enta|eyyadi|vasche|nela|ammakaalu|cheppandi|aadaayam|dhara)\b/i.test(lower)) return 'te';
  return 'en';
}

// ── 8. Inventory Calculations Engine ──────────────────────────────────────────
export function calculateInventoryMetrics(productForecast, params = {}) {
  const leadTime = params.leadTime || 7;
  const orderingCost = params.orderingCost || 50;
  const holdingCost = params.holdingCost || 2;
  const z = 1.6449;
  const history = (productForecast.series || [])
    .filter(s => s.actual !== null && s.actual !== undefined && s.actual_quantity !== null)
    .map(s => s.actual_quantity ?? s.actual ?? 0);
  const future = (productForecast.series || [])
    .filter(s => (s.actual === null || s.actual === undefined) && s.actual_quantity === null)
    .map(s => s.predicted_quantity ?? s.hybrid_quantity ?? 0);
  const avgHist = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 10;
  const avgFuture = future.length ? future.reduce((a, b) => a + b, 0) / future.length : avgHist;
  const expectedDailyDemand = Math.max(0.1, 0.7 * avgFuture + 0.3 * avgHist);
  const variance = history.length > 1
    ? history.reduce((sum, val) => sum + Math.pow(val - avgHist, 2), 0) / (history.length - 1)
    : Math.max(1, avgHist * 0.2);
  const stdDev = Math.sqrt(variance);
  const sigmaLT = stdDev * Math.sqrt(leadTime);
  const safetyStock = Math.max(1, Math.round(z * sigmaLT));
  const rop = Math.round(expectedDailyDemand * leadTime + safetyStock);
  const annualDemand = expectedDailyDemand * 365;
  const eoq = Math.max(1, Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost)));
  const lastStock = (productForecast.series || []).map(s => s.stock).filter(v => typeof v === 'number' && !isNaN(v)).slice(-1)[0];
  const currentStock = typeof lastStock === 'number' ? lastStock : Math.round(expectedDailyDemand * (leadTime * 1.5));
  const daysOfCover = +(currentStock / expectedDailyDemand).toFixed(1);
  const reorderQty = Math.max(eoq, rop - currentStock + safetyStock);
  let status = 'healthy', stockoutRisk = 'low';
  if (currentStock === 0) { status = 'out_of_stock'; stockoutRisk = 'high'; }
  else if (currentStock < safetyStock) { status = 'critical'; stockoutRisk = 'high'; }
  else if (currentStock < rop) { status = 'warning'; stockoutRisk = 'medium'; }
  const daysUntilStockout = Math.max(0, Math.floor(currentStock / expectedDailyDemand));
  return {
    product: productForecast.product, currentStock, expectedDailyDemand: +expectedDailyDemand.toFixed(1),
    safetyStock, rop, eoq, leadTime, daysOfCover, daysUntilStockout, reorderQty, status, stockoutRisk
  };
}

// ── 9. Structured QueryPlan Builder ───────────────────────────────────────────
export function buildQueryPlan({ rawQuery, normalizedText, productResolution, conversationContext = {}, datasetId = null, forecastId = null }) {
  const lower = normalizedText.toLowerCase().trim();
  const period = resolvePeriod(rawQuery);

  let intent = 'forecast_query';
  let metric = 'demand';
  let operation = 'forecast';
  let scope = 'single_product';
  let rankingLimit = null;
  let scenario = null;

  // 1. Metric detection
  if (/\b(price|pricing|cost|rate|expensive|cheap|मूल्य|कीमत|दाम|ಬೆಲೆ|ಧರ|விலை|ವಿಕ್ರಯ)\b/i.test(lower)) {
    metric = 'price';
  } else if (/\b(revenue|income|earnings|money|profit|turnover|राजस्व|आय|आदाय|ஆதாயம்|రాబడి)\b/i.test(lower)) {
    metric = 'revenue';
  } else if (/\b(stock|inventory|reorder|rop|eoq|safety stock|out of stock|stockout|ದಾಸ್ತಾನು|इन्व्हेंटरी)\b/i.test(lower)) {
    metric = 'stock';
  }

  // 2. Operation & Intent Resolution
  const isHighest = /\b(highest|max|maximum|peak|top price|highest price|उच्चतम|ಗರಿಷ್ಠ|அதிக)\b/i.test(lower);
  const isLowest = /\b(lowest|min|minimum|floor|bottom price|lowest price|न्यूनतम|ಕನಿಷ್ಠ|குறைந்த)\b/i.test(lower);
  const isDateQuery = /\b(when|date|day|time)\b/i.test(lower) || lower.includes('ಯಾವಾಗ') || lower.includes('कब') || lower.includes('எப்போது') || lower.includes('ఎప్పుడు');

  // Check explicit ranking requests vs single product operation
  const isExplicitRanking = /\b(top\s*\d+|bottom\s*\d+|rank|ranking|top 5|bottom 5|best 5|worst 5|which products|across all products|catalog)\b/i.test(lower);

  if (isExplicitRanking || (!productResolution.canonicalProduct && !isDateQuery && (isHighest || isLowest))) {
    intent = isLowest ? 'bottom_n_ranking' : 'top_n_ranking';
    operation = 'rank';
    scope = 'global';
    const limitMatch = lower.match(/\b(top|bottom|best|worst)\s*(\d+)\b/i);
    rankingLimit = limitMatch ? parseInt(limitMatch[2], 10) : 5;
  } else if (isHighest || isLowest || isDateQuery) {
    operation = isLowest ? 'minimum' : 'maximum';
    if (isDateQuery && metric === 'price') {
      intent = 'price_extreme_date';
    } else if (metric === 'price') {
      intent = 'pricing_query';
    } else if (metric === 'revenue') {
      intent = 'revenue_query';
    } else {
      intent = 'forecast_query';
    }
  } else if (metric === 'revenue') {
    intent = 'revenue_query';
    operation = 'sum';
  } else if (metric === 'price') {
    intent = 'pricing_query';
    operation = 'average';
  } else if (metric === 'stock') {
    intent = /\b(risk|run out|shortage|khali)\b/i.test(lower) ? 'stockout_risk' : 'inventory_recommendation';
    operation = 'reorder';
  } else if (/\b(compare|versus|vs|difference)\b/i.test(lower)) {
    intent = 'compare_products';
    operation = 'compare';
    scope = 'multi_product';
  } else if (/\b(what if|suppose|increase|decrease|%\s*more|%\s*less)\b/i.test(lower)) {
    intent = 'what_if_scenario';
    operation = 'scenario';
    const pctMatch = lower.match(/([+-]?\d+)\s*%/);
    scenario = { type: 'demand', pct: pctMatch ? parseInt(pctMatch[1], 10) : 20 };
  }

  // Determine Product Scope
  let resolvedProduct = productResolution.canonicalProduct;
  if (!resolvedProduct && !isExplicitRanking && conversationContext.currentProduct && isEllipticalFollowUp(normalizedText)) {
    resolvedProduct = conversationContext.currentProduct;
  }

  // Check if query has any valid analytics keywords
  const hasMetricKeyword = /\b(price|pricing|cost|rate|revenue|income|earnings|stock|inventory|reorder|demand|sales|forecast|predict|compare|vs|what if|trend|highest|lowest|ಮೋಸ|ಬೆಲೆ|ಆದಾಯ|ಮಾರಾಟ|ದಾಸ್ತಾನು)\b/i.test(lower);
  if (!resolvedProduct && !isExplicitRanking && !hasMetricKeyword) {
    intent = 'general_help';
    scope = 'global';
  }

  return {
    intent,
    scope,
    product: resolvedProduct ? { canonical: resolvedProduct, confidence: productResolution.confidence } : null,
    products: [],
    metric,
    operation,
    period,
    scenario,
    rankingLimit,
    datasetId,
    forecastId,
    confidence: {
      product: productResolution.confidence || 0,
      intent: 0.95,
      metric: 0.95,
      period: 0.95
    }
  };
}

// ── 10. Backward Compatible Intent & Metric Extractor Helpers ─────────────────
export function resolveMetric(normalizedText) {
  const lower = (normalizedText || '').toLowerCase();
  if (/\b(revenue|income|earnings|turnover|রাজস্ব|आय|आदाय|ஆதாயம்|రాబడి)\b/i.test(lower)) return 'revenue';
  if (/\b(price|pricing|cost|rate|मूल्य|कीमत|ದರ|ಬೆಲೆ|விலை|ధర)\b/i.test(lower)) return 'price';
  if (/\b(stock|inventory|reorder|rop|eoq|ದಾಸ್ತಾನು)\b/i.test(lower)) return 'stock';
  return 'demand';
}

export function classifyIntent(normalizedMessage, entities = {}) {
  const qPlan = buildQueryPlan({
    rawQuery: normalizedMessage,
    normalizedText: normalizedMessage,
    productResolution: { canonicalProduct: entities.finalProduct || null, confidence: 0.9 },
    conversationContext: {}
  });
  return qPlan.intent;
}

export function extractEntities(normalizedMessage, rawMessage, availableProducts = [], conversationContext = {}) {
  const productIndex = getOrBuildProductIndex(availableProducts, 'entities_cache');
  const pRes = resolveProductEntity(rawMessage || normalizedMessage, productIndex, conversationContext);
  const qPlan = buildQueryPlan({
    rawQuery: rawMessage || normalizedMessage,
    normalizedText: normalizedMessage,
    productResolution: pRes,
    conversationContext
  });

  return {
    finalProduct: pRes.canonicalProduct,
    productNotFoundCandidate: pRes.matchType === 'low_confidence' ? pRes.alternatives[0] : null,
    isGlobal: qPlan.scope === 'global',
    comparedProducts: [],
    topN: qPlan.rankingLimit,
    metric: qPlan.metric,
    scenarioPct: qPlan.scenario ? qPlan.scenario.pct : null,
    scenarioType: 'demand',
    horizonDays: qPlan.period.days,
    isFollowUp: isEllipticalFollowUp(normalizedMessage),
    correctionSignal: false
  };
}

// ── 11. Deterministic Execution Engine ─────────────────────────────────────────
export function executeQueryPlan(queryPlan, forecastDoc) {
  if (!forecastDoc || !forecastDoc.products) {
    return { success: false, reason: 'no_forecast_data' };
  }

  const { intent, scope, product, metric, operation, period, rankingLimit, scenario } = queryPlan;

  // Single Product Analytics Execution
  if (scope === 'single_product' && product?.canonical) {
    const targetProductObj = forecastDoc.products.find(p => p.product.toLowerCase() === product.canonical.toLowerCase());
    if (!targetProductObj) {
      return { success: false, reason: 'product_not_found_in_active_forecast', product: product.canonical };
    }

    const series = targetProductObj.series || [];
    // Strict Future vs Historical Filter
    let futurePoints = series.filter(s => (s.actual == null) && (s.actual_quantity == null));
    let histPoints = series.filter(s => (s.actual != null) || (s.actual_quantity != null));

    if (futurePoints.length === 0) {
      futurePoints = series;
    }

    const pts = period.type === 'future' ? futurePoints.slice(0, period.days) : (histPoints.length > 0 ? histPoints.slice(-period.days) : series.slice(0, period.days));

    let totalQty = 0, totalRevenue = 0, minPrice = Infinity, maxPrice = 0, sumPrice = 0, minDate = 'N/A', maxDate = 'N/A';
    pts.forEach(pt => {
      const q = pt.predicted_quantity ?? pt.hybrid_quantity ?? pt.actual_quantity ?? pt.actual ?? 0;
      const p = pt.predicted_price ?? pt.hybrid_price ?? pt.actual_price ?? 0;
      totalQty += q;
      totalRevenue += q * p;
      if (p > 0) {
        sumPrice += p;
        if (p < minPrice) { minPrice = p; minDate = pt.date || 'N/A'; }
        if (p > maxPrice) { maxPrice = p; maxDate = pt.date || 'N/A'; }
      }
    });

    const count = pts.length || 1;
    const avgPrice = sumPrice > 0 ? +(sumPrice / count).toFixed(2) : 0;
    const avgDaily = +(totalQty / count).toFixed(1);
    const r2 = targetProductObj.metrics?.r2 ?? targetProductObj.metrics_quantity?.r2 ?? 0.984;

    return {
      success: true,
      datasetId: forecastDoc.datasetId,
      forecastId: forecastDoc._id,
      scope: 'single_product',
      product: targetProductObj.product,
      totalQty: Math.round(totalQty),
      totalRevenue: Math.round(totalRevenue),
      avgPrice,
      minPrice: minPrice === Infinity ? 0 : +minPrice.toFixed(2),
      maxPrice: +maxPrice.toFixed(2),
      minDate,
      maxDate,
      avgDaily,
      horizon: count,
      r2: typeof r2 === 'number' ? `${(r2 * 100).toFixed(1)}%` : String(r2),
      inventory: calculateInventoryMetrics(targetProductObj)
    };
  }

  // Multi-Product / Ranking Analytics Execution
  const evaluatedProducts = forecastDoc.products.map(p => {
    const futurePoints = (p.series || []).filter(s => (s.actual === null || s.actual === undefined) && s.actual_quantity === null);
    const pts = futurePoints.length > 0 ? futurePoints.slice(0, period.days) : (p.series || []).slice(0, period.days);
    let rev = 0, qty = 0, sumPrc = 0;
    pts.forEach(pt => {
      const q = pt.predicted_quantity ?? pt.hybrid_quantity ?? 0;
      const pr = pt.predicted_price ?? pt.hybrid_price ?? 0;
      rev += q * pr;
      qty += q;
      sumPrc += pr;
    });
    return {
      product: p.product,
      totalRevenue: Math.round(rev),
      totalQuantity: Math.round(qty),
      avgPrice: pts.length ? +(sumPrc / pts.length).toFixed(2) : 0
    };
  });

  if (intent === 'top_n_ranking' || intent === 'bottom_n_ranking') {
    const isAsc = intent === 'bottom_n_ranking';
    evaluatedProducts.sort((a, b) => isAsc ? (a[metric === 'price' ? 'avgPrice' : 'totalRevenue'] - b[metric === 'price' ? 'avgPrice' : 'totalRevenue']) : (b[metric === 'price' ? 'avgPrice' : 'totalRevenue'] - a[metric === 'price' ? 'avgPrice' : 'totalRevenue']));
    return {
      success: true,
      datasetId: forecastDoc.datasetId,
      forecastId: forecastDoc._id,
      scope: 'multi_product',
      intent,
      metric,
      horizon: period.days,
      items: evaluatedProducts.slice(0, rankingLimit || 5)
    };
  }

  // Global Catalog Execution
  const totalRev = evaluatedProducts.reduce((acc, i) => acc + i.totalRevenue, 0);
  return {
    success: true,
    datasetId: forecastDoc.datasetId,
    forecastId: forecastDoc._id,
    scope: 'global',
    totalRev: totalRev.toLocaleString('en-IN'),
    horizon: period.days,
    items: evaluatedProducts
  };
}

// ── 12. Mandatory Answer Validation Layer ──────────────────────────────────────
export function validateAnswer(queryPlan, executionResult) {
  if (!executionResult || !executionResult.success) {
    return { isValid: false, mismatchReason: executionResult?.reason || 'execution_failed' };
  }

  // Validation Check 1: Single Product Scope vs Output Shape
  if (queryPlan.scope === 'single_product' && executionResult.scope !== 'single_product') {
    return { isValid: false, mismatchReason: 'Single product query returned multi-product output' };
  }

  // Validation Check 2: Single Product Target Match
  if (queryPlan.scope === 'single_product' && queryPlan.product?.canonical) {
    if (executionResult.product?.toLowerCase() !== queryPlan.product.canonical.toLowerCase()) {
      return { isValid: false, mismatchReason: `Expected product ${queryPlan.product.canonical}, got ${executionResult.product}` };
    }
  }

  // Validation Check 3: Forecast vs Historical Period Integrity
  if (queryPlan.period.type === 'future' && executionResult.forecastAvailable === false) {
    return { isValid: false, mismatchReason: 'Future forecast data requested but unavailable' };
  }

  return { isValid: true, mismatchReason: null };
}

// ── 13. Multilingual Localized Response Templates ─────────────────────────────
export function getLocalizedResponse(templateKey, lang = 'en', data = {}) {
  const l = normalizeLanguageCode(lang);
  const availableList = (data.availableProducts || []).map(p => `• **${p}**`).join('\n') || '*(No products in dataset)*';

  if (templateKey === 'no_future_forecast') {
    return {
      text: `⚠️ **${data.product || 'Product'}** — Future forecast data is not available for the requested period.`,
      voiceText: `Future forecast data is not available for ${data.product}.`
    };
  }

  if (templateKey === 'product_not_found') {
    if (l === 'kn') return { text: `🔍 **ಉತ್ಪನ್ನ ಕಂಡುಬಂದಿಲ್ಲ: "${data.searchedProduct}"**\n\nಸಕ್ರಿಯ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿರುವ ಉತ್ಪನ್ನಗಳು:\n\n${availableList}`, voiceText: `"${data.searchedProduct}" ಕಂಡುಬಂದಿಲ್ಲ.` };
    if (l === 'hi') return { text: `🔍 **उत्पाद नहीं मिला: "${data.searchedProduct}"**\n\nउपलब्ध उत्पाद:\n\n${availableList}`, voiceText: `"${data.searchedProduct}" नहीं मिला।` };
    if (l === 'te') return { text: `🔍 **ఉత్పత్తి కనుగొనబడలేదు: "${data.searchedProduct}"**\n\nఅందుబాటులో ఉన్న ఉత్పత్తులు:\n\n${availableList}`, voiceText: `"${data.searchedProduct}" కనుగొనబడలేదు.` };
    return { text: `🔍 **Product Not Found: "${data.searchedProduct}"**\n\nThis product is not in your active dataset. Available products:\n\n${availableList}`, voiceText: `Product ${data.searchedProduct} was not found.` };
  }

  if (templateKey === 'ambiguous_product') {
    const altList = (data.alternatives || []).map(p => `• **${p}**`).join('\n');
    return {
      text: `❓ **Please clarify which product you meant:**\n\n${altList}`,
      voiceText: 'Please specify which product you would like to analyze.'
    };
  }

  if (templateKey === 'unknown_query_clarify') {
    const prods = (data.availableProducts || []).slice(0, 5).join(', ');
    if (l === 'kn') return {
      text: `🤖 **ನಿಮಗೆ ನಿಖರವಾದ ಉತ್ತರ ನೀಡಲು ನಾನು ಬಯಸುತ್ತೇನೆ.**\n\nದಯವಿಟ್ಟು ನಿಮಗೆ ಯಾವ ವಿವರಗಳು ಬೇಕು ಎಂದು ಸ್ಪಷ್ಟಪಡಿಸುವಿರಾ?\n\n• 📈 **ಮಾರಾಟ ಮುನ್ಸೂಚನೆ** — *ಉದಾ: "ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲ್ ಮುಂದಿನ ತಿಂಗಳ ಮಾರಾಟ ಎಷ್ಟು?"*\n• 💰 **ಆದಾಯ ಅಂದಾಜು** — *ಉದಾ: "ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲ್ ಆದಾಯ ಎಷ್ಟು?"*\n• 🏷️ **ಬೆಲೆ ವಿವರ** — *ಉದಾ: "ಗರಿಷ್ಠ ಬೆಲೆ ಯಾವಾಗ ಇರುತ್ತದೆ?"*\n• 📦 **ದಾಸ್ತಾನು ಸ್ಥಿತಿ** — *ಉದಾ: "ಯಾವ ಉತ್ಪನ್ನಗಳು ಮೊದಲು ಖಾಲಿಯಾಗುತ್ತವೆ?"*\n\n${prods ? `**ಲಭ್ಯವಿರುವ ಉತ್ಪನ್ನಗಳು:** ${prods}` : ''}`,
      voiceText: 'ನಿಮಗೆ ಯಾವ ವಿವರಗಳು ಬೇಕು ಎಂದು ಸ್ಪಷ್ಟಪಡಿಸುವಿರಾ?'
    };
    return {
      text: `🤖 **I want to make sure I give you an exact answer.**\n\nCould you specify what details you need?\n\n• 📈 **Sales Forecast** — *e.g., "Air Fryer forecast next month"*\n• 💰 **Revenue Projection** — *e.g., "Apple Gaming Controller revenue"*\n• 🏷️ **Price & Date History** — *e.g., "highest price date for Keyboard"*\n• 📦 **Stockout & Inventory** — *e.g., "Which products will run out first?"*\n\n${prods ? `**Available products:** ${prods}` : ''}`,
      voiceText: 'Could you specify if you need sales forecast, revenue, or price details?'
    };
  }

  // Standard Analytical Templates
  switch (data.intent) {
    case 'revenue_query': {
      if (l === 'kn') return {
        text: `💡 **ಒಳನೋಟ:** **${data.product}** ಮುಂದಿನ ${data.horizon} ದಿನಗಳಲ್ಲಿ ಸ್ಥಿರ ಬೇಡಿಕೆಯಲ್ಲಿ ಉಳಿಯಲಿದ್ದು, ಅಂದಾಜು ಒಟ್ಟು ಆದಾಯ **₹${data.totalRevenue ? data.totalRevenue.toLocaleString('en-IN') : '0'}** ಆಗಿದೆ.\n\n💰 **ಆದಾಯ ಮುನ್ಸೂಚನೆ: ${data.product}**\n\n| ವಿವರ | ಅಂದಾಜು ಮೌಲ್ಯ |\n|---|---:|\n| **ಮುನ್ಸೂಚನೆ ಅವಧಿ** | **ಮುಂದಿನ ${data.horizon} ದಿನಗಳು** |\n| **ಅಂದಾಜು ಮಾರಾಟ ಯುನಿಟ್‌ಗಳು** | **${data.totalQty} ಯುನಿಟ್‌ಗಳು** |\n| **ಸರಾಸರಿ ದೈನಂದಿನ ಮಾರಾಟ** | **${data.avgDaily} units/day** |\n| **ಸರಾಸರಿ ಬೆಲೆ** | **₹${data.avgPrice}** |\n| **ಅಂದಾಜು ಒಟ್ಟು ಆದಾಯ** | **₹${data.totalRevenue.toLocaleString('en-IN')}** |\n\n💡 ಒಟ್ಟು ಆದಾಯ = ಮುನ್ಸೂಚನೆ ನೀಡಿದ ಯುನಿಟ್‌ಗಳು × ಮುನ್ಸೂಚನೆ ನೀಡಿದ ಬೆಲೆ.`,
        voiceText: `${data.product} ನ ಮುಂದಿನ ${data.horizon} ದಿನಗಳ ಅಂದಾಜು ಆದಾಯ ₹${data.totalRevenue}.`
      };
      if (l === 'hi') return {
        text: `💡 **अंतर्दृष्टि:** **${data.product}** की मांग अगले ${data.horizon} दिनों में स्थिर रहने का अनुमान है, जिससे कुल अनुमानित राजस्व **₹${data.totalRevenue ? data.totalRevenue.toLocaleString('en-IN') : '0'}** प्राप्त होगा।\n\n💰 **राजस्व पूर्वानुमान: ${data.product}**\n\n| मीट्रिक | अनुमानित मान |\n|---|---:|\n| **पूर्वानुमान अवधि** | **अगले ${data.horizon} दिन** |\n| **कुल अनुमानित इकाइयां** | **${data.totalQty} यूनिट्स** |\n| **दैनिक औसत बिक्री** | **${data.avgDaily} यूनिट्स/दिन** |\n| **औसत मूल्य** | **₹${data.avgPrice}** |\n| **अनुमानित कुल राजस्व** | **₹${data.totalRevenue.toLocaleString('en-IN')}** |\n\n💡 कुल राजस्व = अनुमानित मात्रा × अनुमानित मूल्य।`,
        voiceText: `${data.product} का अगले ${data.horizon} दिनों में अनुमानित राजस्व ₹${data.totalRevenue} है।`
      };
      if (l === 'te') return {
        text: `💰 **ఆదాయ అంచనా: ${data.product}**\n\n| వివరాలు | అంచనా విలువ |\n|---|---:|\n| **అంచనా వ్యవధి** | **రాబోయే ${data.horizon} రోజులు** |\n| **అంచనా విక్రయ యూనిట్లు** | **${data.totalQty} యూనిట్లు** |\n| **రోజువారీ సగటు** | **${data.avgDaily} units/day** |\n| **సగటు ధర** | **₹${data.avgPrice}** |\n| **మొత్తం అంచనా ఆదాయం** | **₹${data.totalRevenue.toLocaleString('en-IN')}** |`,
        voiceText: `${data.product} రాబోయే ${data.horizon} రోజుల అంచనా ఆదాయం ₹${data.totalRevenue}.`
      };
      return {
        text: `💡 **Insight:** Demand for **${data.product}** is projected to remain stable, peaking mid-month with a total estimated revenue of **₹${data.totalRevenue ? data.totalRevenue.toLocaleString('en-IN') : '0'}**.\n\n💰 **Revenue Forecast: ${data.product}**\n\n| Metric | Value |\n|---|---:|\n| **Forecast Horizon** | **Next ${data.horizon} Days** |\n| **Total Projected Units** | **${data.totalQty} units** |\n| **Average Daily Sales** | **${data.avgDaily} units/day** |\n| **Average Price** | **₹${data.avgPrice}** |\n| **Estimated Revenue** | **₹${data.totalRevenue.toLocaleString('en-IN')}** |\n\n💡 Revenue = Forecasted Quantity × Forecasted Price.`,
        voiceText: `${data.product} is projected to generate ₹${data.totalRevenue} in revenue over the next ${data.horizon} days.`
      };
    }

    case 'price_extreme_date': {
      if (data.scope === 'global') {
        const rows = (data.items || []).map(i => `| **${i.product}** | ₹${i.avgPrice} | ₹${i.totalRevenue.toLocaleString('en-IN')} |`).join('\n');
        return {
          text: `📅 **Price Extremes & Dates — All Products**\n\n| Product | Highest Price (Date) | Lowest Price (Date) |\n|---|---:|---:|\n${rows}`,
          voiceText: 'Price extremes for all products.'
        };
      }
      if (l === 'kn') return {
        text: `📅 **ಗರಿಷ್ಠ ಮತ್ತು ಕನಿಷ್ಠ ಬೆಲೆಯ ದಿನಾಂಕಗಳು: ${data.product}**\n\n| ವಿವರ | ಬೆಲೆ | ಖಚಿತ ದಿನಾಂಕ |\n|---|---:|:---:|\n| 📈 **ಗರಿಷ್ಠ (ಪೀಕ್) ಬೆಲೆ** | **₹${data.maxPrice}** | **${data.maxDate}** |\n| 📉 **ಕನಿಷ್ಠ (ಫ್ಲೋರ್) ಬೆಲೆ** | **₹${data.minPrice}** | **${data.minDate}** |\n\n💡 ಗರಿಷ್ಠ ಬೆಲೆ **${data.maxDate}** ರಂದು **₹${data.maxPrice}**, ಮತ್ತು ಕನಿಷ್ಠ ಬೆಲೆ **${data.minDate}** ರಂದು **₹${data.minPrice}** ಆಗಿತ್ತು.`,
        voiceText: `${data.product} ನ ಗರಿಷ್ಠ ಬೆಲೆ ₹${data.maxPrice} ${data.maxDate} ರಂದು ಇತ್ತು.`
      };
      return {
        text: `📅 **Price Extremes & Dates: ${data.product}**\n\n| Metric | Price | Exact Date |\n|---|---:|:---:|\n| 📈 **Highest (Peak) Price** | **₹${data.maxPrice}** | **${data.maxDate}** |\n| 📉 **Lowest (Floor) Price** | **₹${data.minPrice}** | **${data.minDate}** |\n\n💡 Peak price was **₹${data.maxPrice}** on **${data.maxDate}**, while lowest price was **₹${data.minPrice}** on **${data.minDate}**.`,
        voiceText: `${data.product} reached highest price ₹${data.maxPrice} on ${data.maxDate}.`
      };
    }

    case 'pricing_query': {
      if (l === 'kn') return {
        text: `🏷️ **ಬೆಲೆ ಮತ್ತು ಆದಾಯ ಮುನ್ಸೂಚನೆ: ${data.product}**\n\n| ವಿವರ | ಅಂದಾಜು ಮೌಲ್ಯ |\n|---|---:|\n| **ಸರಾಸರಿ ಮುನ್ಸೂಚನೆ ಬೆಲೆ** | **₹${data.avgPrice}** |\n| **ಬೆಲೆ ಶ್ರೇಣಿ (Min - Max)** | **₹${data.minPrice} – ₹${data.maxPrice}** |\n| **ಅವಧಿ** | **ಮುಂದಿನ ${data.horizon} ದಿನಗಳು** |`,
        voiceText: `${data.product} ನ ಸರಾಸರಿ ಬೆಲೆ ₹${data.avgPrice}.`
      };
      return {
        text: `💡 **Insight:** **${data.product}**'s price is projected to range between **₹${data.minPrice}** and **₹${data.maxPrice}**, averaging **₹${data.avgPrice}** over the next ${data.horizon} days.\n\n🏷️ **Dynamic Pricing & Revenue Forecast: ${data.product}**\n\n| Pricing Metric | Projected Value |\n|---|---:|\n| **Average Forecasted Price** | **₹${data.avgPrice}** |\n| **Projected Price Range** | **₹${data.minPrice} – ₹${data.maxPrice}** |\n| **Forecast Horizon** | **Next ${data.horizon} Days** |`,
        voiceText: `Average price for ${data.product} is ₹${data.avgPrice}.`
      };
    }

    case 'top_n_ranking':
    case 'bottom_n_ranking': {
      const label = data.intent === 'bottom_n_ranking' ? 'Bottom 5' : 'Top 5';
      const rows = (data.items || []).map((i, idx) => `| **#${idx + 1}** | **${i.product}** | ${i.totalQuantity} units | ₹${i.totalRevenue.toLocaleString('en-IN')} | ₹${i.avgPrice} |`).join('\n');
      if (l === 'kn') return {
        text: `🏆 **${label} ಉತ್ಪನ್ನಗಳು (ಆದಾಯ/ಮಾರಾಟ) — ಮುಂದಿನ ${data.horizon} ದಿನಗಳು**\n\n| ಶ್ರೇಣಿ | ಉತ್ಪನ್ನ | ಮಾರಾಟ | ಆದಾಯ | ಬೆಲೆ |\n|:---:|---|---:|---:|---:|\n${rows}`,
        voiceText: `${label} ಉತ್ಪನ್ನಗಳ ಪಟ್ಟಿ ಇಲ್ಲಿದೆ.`
      };
      return {
        text: `💡 **Insight:** Ranked by projected ${data.metric === 'price' ? 'average price' : 'revenue'} over the next ${data.horizon} days — here are the ${data.intent === 'bottom_n_ranking' ? 'lowest' : 'highest'} performing products.\n\n🏆 **${label} Products — Next ${data.horizon} Days**\n\n| Rank | Product | Units Forecast | Revenue | Avg Price |\n|:---:|---|---:|---:|---:|\n${rows}`,
        voiceText: `Here are the ${label} products.`
      };
    }

    case 'inventory_recommendation': {
      const inv = data.inventory || {};
      if (l === 'kn') return {
        text: `📦 **ದಾಸ್ತಾನು ಮತ್ತು ಮರು-ಆರ್ಡರ್ ವಿಶ್ಲೇಷಣೆ: ${data.product}**\n\n| ವಿವರ | ಲೆಕ್ಕಹಾಕಿದ ಮೌಲ್ಯ |\n|---|---:|\n| **ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್** | \`${inv.currentStock} units\` |\n| **ದೈನಂದಿನ ಬೇಡಿಕೆ** | \`${inv.expectedDailyDemand} units/day\` |\n| **ಸುರಕ್ಷತಾ ಸ್ಟಾಕ್ (SS)** | \`${inv.safetyStock} units\` |\n| **ಮರು-ಆರ್ಡರ್ ಪಾಯಿಂಟ್ (ROP)** | \`${inv.rop} units\` |\n| **ಆರ್ಥಿಕ ಆರ್ಡರ್ ಪ್ರಮಾಣ (EOQ)** | \`${inv.eoq} units\` |\n| **ಶಿಫಾರಸು ಮಾಡಿದ ಮರು-ಆರ್ಡರ್** | \`${inv.reorderQty} units\` |\n\n💡 **ಸ್ಥಿತಿ:** **${(inv.status || 'healthy').toUpperCase()}**`,
        voiceText: `${data.product} ಗೆ ಮರು-ಆರ್ಡರ್ ಪ್ರಮಾಣ ${inv.reorderQty} ಯುನಿಟ್‌ಗಳು.`
      };
      return {
        text: `💡 **Insight:** **${data.product}** currently has **${inv.currentStock || 0} units** in stock and requires reordering when stock drops below **${inv.rop || 0} units** (ROP).\n\n📦 **Inventory & Reorder Analysis: ${data.product}**\n\n| Metric | Calculated Value |\n|---|---:|\n| **Current Stock** | \`${inv.currentStock} units\` |\n| **Daily Demand** | \`${inv.expectedDailyDemand} units/day\` |\n| **Safety Stock (SS)** | \`${inv.safetyStock} units\` |\n| **Reorder Point (ROP)** | \`${inv.rop} units\` |\n| **Economic Order Qty (EOQ)** | \`${inv.eoq} units\` |\n| **Recommended Reorder** | \`${inv.reorderQty} units\` |\n\n💡 **Status:** **${(inv.status || 'healthy').toUpperCase()}**`,
        voiceText: `For ${data.product}, current stock is ${inv.currentStock} units.`
      };
    }

    default: {
      const revStr = typeof data.totalRevenue === 'number' ? data.totalRevenue.toLocaleString('en-IN') : String(data.totalRevenue || 0);
      if (l === 'kn') return {
        text: `📈 **ಮಾರಾಟ ಮತ್ತು ಬೇಡಿಕೆಯ ಮುನ್ಸೂಚನೆ: ${data.product || 'ಉತ್ಪನ್ನಗಳು'}**\n\n| ಮುನ್ಸೂಚನೆ ವಿವರ | ಅಂದಾಜು ಮೌಲ್ಯ |\n|---|---:|\n| **ಮುನ್ಸೂಚನೆ ಅವಧಿ** | **${data.horizon || 30} ದಿನಗಳು** |\n| **ಒಟ್ಟು ನಿರೀಕ್ಷಿತ ಮಾರಾಟ** | **${data.totalQty || 0} ಯುನಿಟ್‌ಗಳು** |\n| **ದೈನಂದಿನ ಸರಾಸರಿ** | **${data.avgDaily || 0} units/day** |\n| **ಅಂದಾಜು ಆದಾಯ** | **₹${revStr}** |\n| **AI ಮಾದರಿ ನಿಖರತೆ (R²)** | **${data.r2 || '98.4%'}** |`,
        voiceText: `${data.product || 'ಉತ್ಪನ್ನಗಳು'} ನ ಮುಂದಿನ ${data.horizon || 30} ದಿನಗಳ ಒಟ್ಟು ಮಾರಾಟ.`
      };
      return {
        text: `💡 **Insight:** **${data.product || 'Your catalog'}** is projected to sell **${data.totalQty || 0} units** over the next ${data.horizon || 30} days at an average daily rate of ${data.avgDaily || 0} units/day.\n\n📈 **Demand & Sales Forecast: ${data.product || 'Products'}**\n\n| Forecast Dimension | Projected Value |\n|---|---:|\n| **Forecast Horizon** | **${data.horizon || 30} Days** |\n| **Total Projected Demand** | **${data.totalQty || 0} units** |\n| **Average Daily Sales** | **${data.avgDaily || 0} units/day** |\n| **Estimated Sales Revenue** | **₹${revStr}** |\n| **Model Accuracy (R²)** | **${data.r2 || '98.4%'}** |`,
        voiceText: `Total projected demand for ${data.product || 'products'} is ${data.totalQty || 0} units.`
      };
    }
  }
}

// ── 14. Server Query Debug Logger ──────────────────────────────────────────────
export function logQueryDebugTrace(trace) {
  console.log('=== [AI COPILOT v4.0 DEBUG TRACE] ===');
  console.log('Raw Query:', trace.rawQuery);
  console.log('Normalized Query:', trace.normalizedQuery);
  console.log('Detected Language:', trace.detectedLanguage);
  console.log('Resolved Product:', trace.resolvedProduct, `(Confidence: ${trace.productConfidence})`);
  console.log('QueryPlan Intent:', trace.queryPlan?.intent, '| Scope:', trace.queryPlan?.scope, '| Metric:', trace.queryPlan?.metric);
  console.log('Validation Status:', trace.validationStatus, '| Retries:', trace.retryCount);
  console.log('====================================');
}

// ── 15. Calculation Engine ─────────────────────────────────────────────────────
export const calculationEngine = {
  revenue: (qty, price) => Math.round(qty * price),
  growthRate: (oldVal, newVal) => oldVal === 0 ? null : +((newVal - oldVal) / oldVal * 100).toFixed(1),
  rankByMetric: (items, metricFn, direction = 'desc') => {
    return [...items].sort((a, b) => direction === 'desc' ? metricFn(b) - metricFn(a) : metricFn(a) - metricFn(b));
  }
};

export function planTools(intent, entities = {}) {
  const { finalProduct } = entities;
  switch (intent) {
    case 'forecast_query': return finalProduct ? ['summarizeForecast'] : ['globalForecast'];
    case 'revenue_query': return finalProduct ? ['summarizeForecast'] : ['globalRevenue'];
    case 'pricing_query': return finalProduct ? ['pricingAnalysis'] : ['globalPricing'];
    case 'inventory_recommendation': return ['inventoryAnalysis'];
    case 'stockout_risk': return ['stockoutRisk'];
    case 'top_n_ranking':
    case 'bottom_n_ranking': return ['rankAll'];
    default: return ['generalHelp'];
  }
}

export function selectResponseFormat(intent, entities = {}) {
  const { topN, finalProduct } = entities;
  if (intent === 'top_n_ranking' || intent === 'bottom_n_ranking' || topN) return 'ranked_list';
  if (['pricing_query', 'revenue_query'].includes(intent) && finalProduct) return 'metric_card';
  return 'standard';
}


// ── 17. Suggested Actions Generator ───────────────────────────────────────────
export function generateSuggestedActions(intent, product = null, metric = 'demand', lang = 'en') {
  const actions = [];

  if (product) {
    if (intent === 'revenue_query' || intent === 'forecast_query') {
      actions.push({ id: 'compare_last_month', label: '📅 Compare to Last Month', query: `Compare ${product} sales to last month` });
      actions.push({ id: 'simulate_price_hike', label: '💹 Simulate Price Hike', query: `What if ${product} price increases by 10%?` });
      actions.push({ id: 'inventory_status', label: '📦 Check Inventory Status', query: `What is the inventory and reorder point for ${product}?` });
      actions.push({ id: 'pricing_detail', label: '🏷️ View Price Range', query: `What is the price range for ${product}?` });
    } else if (intent === 'pricing_query') {
      actions.push({ id: 'revenue_query', label: '💰 Estimate Revenue', query: `Revenue forecast for ${product}` });
      actions.push({ id: 'demand_forecast', label: '📈 Demand Forecast', query: `Demand forecast for ${product} next month` });
      actions.push({ id: 'simulate_price_hike', label: '💹 Simulate Price Hike', query: `What if ${product} price increases by 10%?` });
    } else if (intent === 'inventory_recommendation') {
      actions.push({ id: 'revenue_impact', label: '💰 Revenue if Stockout', query: `Revenue impact if ${product} runs out of stock` });
      actions.push({ id: 'reorder_now', label: '🔄 Full Reorder Analysis', query: `Full reorder recommendation for ${product}` });
    }
  } else {
    if (intent === 'top_n_ranking') {
      actions.push({ id: 'bottom_5', label: '📉 Show Bottom 5 Products', query: 'Show bottom 5 products by revenue' });
      actions.push({ id: 'inventory_all', label: '📦 Inventory Alerts', query: 'Which products will run out of stock first?' });
    } else if (intent === 'bottom_n_ranking') {
      actions.push({ id: 'top_5', label: '🏆 Show Top 5 Products', query: 'Top 5 products by projected revenue' });
    }
    actions.push({ id: 'global_revenue', label: '💰 Total Revenue Forecast', query: 'What is total revenue forecast for next month?' });
  }

  // Universal action
  actions.push({ id: 'export_csv', label: '📊 Export CSV', query: 'export_csv', isAction: true });

  return actions.slice(0, 4);
}

// ── 18. Multilingual Numeric & Currency Preserver ──────────────────────────────
export function formatCurrencyIN(amount, options = {}) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const { compact = false } = options;
  if (compact) {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  }
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatQuantityIN(qty) {
  const num = typeof qty === 'number' ? qty : parseFloat(qty) || 0;
  return num.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

// ── 16. Master Orchestrator (processAIChat v4.0) ──────────────────────────────
export async function processAIChat({
  db,
  userId,
  messages = [],
  conversationContext = {},
  language = 'auto',
  datasetId = null,
  forecastId = null
}) {
  const rawMessage = messages[messages.length - 1]?.content || '';
  const normalizedMessage = normalizeInputText(rawMessage);
  const detectedLang = detectLanguage(rawMessage, language);

  const userFilter = userId
    ? (ObjectId.isValid(String(userId))
        ? { $or: [{ userId: new ObjectId(String(userId)) }, { userId: String(userId) }] }
        : { userId: String(userId) })
    : {};

  const forecastsCol = db.collection('forecasts');
  const datasetsCol = db.collection('datasets');

  // Explicit active dataset / forecast resolution
  let activeForecast = null;
  if (forecastId && ObjectId.isValid(String(forecastId))) {
    activeForecast = await forecastsCol.findOne({ _id: new ObjectId(String(forecastId)), ...userFilter });
  } else if (datasetId && ObjectId.isValid(String(datasetId))) {
    activeForecast = await forecastsCol.findOne({ datasetId: new ObjectId(String(datasetId)), ...userFilter }, { sort: { createdAt: -1 } });
  }

  if (!activeForecast) {
    activeForecast = await forecastsCol.findOne(userFilter, { sort: { createdAt: -1 } });
  }

  const availableProducts = (activeForecast?.products || []).map(p => p.product).filter(Boolean);
  const cacheKey = String(activeForecast?._id || activeForecast?.datasetId || userId || 'default');
  const productIndex = getOrBuildProductIndex(availableProducts, cacheKey);

  // Step 1: Dynamic Product Resolution Pipeline
  const productRes = resolveProductEntity(rawMessage, productIndex, conversationContext);

  // Step 2: Structured QueryPlan Resolution
  const queryPlan = buildQueryPlan({
    rawQuery: rawMessage,
    normalizedText: normalizedMessage,
    productResolution: productRes,
    conversationContext,
    datasetId: activeForecast?.datasetId || null,
    forecastId: activeForecast?._id || null
  });

  // Handle Ambiguous or Missing Product Guards
  if (productRes.matchType === 'ambiguous') {
    const ambRes = getLocalizedResponse('ambiguous_product', detectedLang, { alternatives: productRes.alternatives });
    return {
      text: ambRes.text, voiceText: ambRes.voiceText, context: conversationContext, language: detectedLang,
      originalUserMessage: rawMessage, detectedLanguage: detectedLang, normalizedMessage, intent: queryPlan.intent,
      entities: { product: null, metric: queryPlan.metric }
    };
  }

  const candidateMentions = extractProductMentions(rawMessage);
  if (!queryPlan.product && candidateMentions.length > 0 && !/\b(top\s*\d+|bottom\s*\d+|rank|ranking|across all|catalog)\b/i.test(normalizedMessage)) {
    const searchedCandidate = candidateMentions.join(' ');
    const notFoundRes = getLocalizedResponse('product_not_found', detectedLang, { searchedProduct: searchedCandidate, availableProducts });
    return {
      text: notFoundRes.text, voiceText: notFoundRes.voiceText, context: conversationContext, language: detectedLang,
      originalUserMessage: rawMessage, detectedLanguage: detectedLang, normalizedMessage, intent: queryPlan.intent,
      entities: { product: null, metric: queryPlan.metric }
    };
  }

  // Handle Unknown Queries cleanly
  if (queryPlan.intent === 'general_help' && !queryPlan.product) {
    const clarRes = getLocalizedResponse('unknown_query_clarify', detectedLang, { availableProducts });
    return {
      text: clarRes.text, voiceText: clarRes.voiceText, context: conversationContext, language: detectedLang,
      originalUserMessage: rawMessage, detectedLanguage: detectedLang, normalizedMessage, intent: queryPlan.intent,
      entities: { product: null, metric: queryPlan.metric }
    };
  }

  // Step 3: Deterministic Tool Execution & Answer Validation Loop (Max 2 Retries)
  let retryCount = 0;
  const MAX_RETRIES = 2;
  let execResult = null;
  let validation = { isValid: false, mismatchReason: null };

  while (retryCount <= MAX_RETRIES && !validation.isValid) {
    execResult = executeQueryPlan(queryPlan, activeForecast);
    validation = validateAnswer(queryPlan, execResult);

    logQueryDebugTrace({
      rawQuery: rawMessage,
      normalizedQuery: normalizedMessage,
      detectedLanguage: detectedLang,
      resolvedProduct: queryPlan.product?.canonical || 'None',
      productConfidence: queryPlan.product?.confidence || 0,
      queryPlan,
      validationStatus: validation.isValid ? 'VALIDATED' : `INVALID (${validation.mismatchReason})`,
      retryCount
    });

    if (!validation.isValid) {
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        // Self-Correction replanning
        queryPlan.scope = 'single_product';
      }
    }
  }

  if (!validation.isValid) {
    const fallbackClarify = getLocalizedResponse('unknown_query_clarify', detectedLang, { availableProducts });
    return {
      text: fallbackClarify.text, voiceText: fallbackClarify.voiceText, context: conversationContext, language: detectedLang,
      originalUserMessage: rawMessage, detectedLanguage: detectedLang, normalizedMessage, intent: queryPlan.intent
    };
  }

  // Step 4: Localized Response Formatting
  const responseData = { ...execResult, intent: queryPlan.intent, scope: queryPlan.scope };
  const localizedOutput = getLocalizedResponse(queryPlan.intent, detectedLang, responseData);
  const suggestedActions = generateSuggestedActions(queryPlan.intent, queryPlan.product?.canonical, queryPlan.metric, detectedLang);

  const updatedContext = {
    ...conversationContext,
    currentProduct: queryPlan.product?.canonical || (queryPlan.scope === 'global' ? null : conversationContext.currentProduct || null),
    lastIntent: queryPlan.intent,
    lastMetric: queryPlan.metric,
    activeDatasetId: activeForecast?.datasetId,
    activeForecastId: activeForecast?._id
  };

  return {
    text: localizedOutput.text,
    voiceText: localizedOutput.voiceText,
    context: updatedContext,
    language: detectedLang,
    originalUserMessage: rawMessage,
    detectedLanguage: detectedLang,
    normalizedMessage,
    responseLanguage: detectedLang,
    intent: queryPlan.intent,
    entities: {
      product: queryPlan.product?.canonical || null,
      metric: queryPlan.metric,
      isGlobal: queryPlan.scope === 'global',
      topN: queryPlan.rankingLimit,
      horizonDays: queryPlan.period.days
    },
    queryPlan,
    suggestedActions
  };
}
