import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext(undefined);

// Internal ref to allow setting multi-language flag from LanguageProvider
// without a circular dependency on AppContext
let _setHasUsedMultiLangRef = null;
export const registerMultiLangSetter = (setter) => { _setHasUsedMultiLangRef = setter; };


export const LanguageProvider = ({ children }) => {
  const { t: i18nT, i18n: i18nInstance } = useTranslation();
  const [language, setLanguageState] = useState(i18nInstance.language || 'en');
  const [nameCache, setNameCache] = useState({});
  // Brief flag that is true during the ~80ms gap between changeLanguage() being
  // called and all React state batches settling. Prevents direction-sensitive
  // components from rendering stale layout during rapid language switches.
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const changingTimerRef = useRef(null);

  useEffect(() => {
    setLanguageState(i18nInstance.language);
  }, [i18nInstance.language]);

  const isRTL = language === 'ur';

  const setLanguage = useCallback(async (newLang) => {
    // Map legacy ur-roman to ru
    const langCode = newLang === 'ur-roman' ? 'ru' : newLang;

    // Set transition flag immediately so direction-sensitive renders wait
    setIsChangingLanguage(true);
    if (changingTimerRef.current) clearTimeout(changingTimerRef.current);

    // Update state + i18n immediately for instant UI feedback
    setLanguageState(langCode);
    i18nInstance.changeLanguage(langCode);

    // Clear the transition flag after two animation frames (~80ms) — enough
    // for React's state batching to complete and all components to re-render
    // with the consistent new language/direction combination.
    changingTimerRef.current = setTimeout(() => {
      setIsChangingLanguage(false);
    }, 120);

    try {
      const prevLang = await AsyncStorage.getItem('kcp_lang');
      // Only unlock if they've explicitly set a language before and are now switching to a different one
      if (prevLang && prevLang !== langCode) {
        if (_setHasUsedMultiLangRef) _setHasUsedMultiLangRef(true);
      }
      await AsyncStorage.setItem('kcp_lang', langCode);
    } catch (e) {
      console.warn('Error saving language', e);
    }
  }, [i18nInstance]);

  const t = useCallback((key, options) => {
    return i18nT(key, options);
  }, [i18nT]);

  const toUrduNumerals = useCallback((str) => {
    if (str == null) return str;
    if (language !== 'ur') return str;
    const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.toString().replace(/[0-9]/g, w => urduDigits[w]);
  }, [language]);

  const translateLocation = useCallback((loc) => {
    if (!loc) return loc;
    
    // First, check if there's a direct translation for the exact string
    const exact = i18nT(loc, { defaultValue: '' });
    if (exact && exact !== loc) return exact;

    let tr = loc;

    if (language === 'ur') {
      // English to Urdu
      let prefixReplaced = false;
      const prefixes = ['Close to', 'Near', 'Around', 'Vicinity of', 'Just by'];
      for (const p of prefixes) {
        if (tr.startsWith(p + ' ')) {
          tr = tr.replace(p + ' ', '');
          prefixReplaced = true;
          break;
        }
      }

      const mapping = {
        'KU Circular Road': 'جامعہ کراچی سرکلر روڈ',
        'Poineer Cottages': 'پائنیر کاٹیجز',
        'Pioneer Cottages': 'پائنیر کاٹیجز',
        'NED Circular Road': 'این ای ڈی سرکلر روڈ',
        'Sui Gas Company': 'سوئی گیس کمپنی',
        'Karachi Society': 'کراچی سوسائٹی',
        'Road': 'روڈ', 'road': 'روڈ',
        'Street': 'اسٹریٹ', 'street': 'اسٹریٹ',
        'Block': 'بلاک', 'block': 'بلاک',
        'Sector': 'سیکٹر', 'sector': 'سیکٹر',
        'Phase': 'فیز', 'phase': 'فیز',
        'Town': 'ٹاؤن', 'town': 'ٹاؤن',
        'Society': 'سوسائٹی', 'society': 'سوسائٹی',
        'Karachi': 'کراچی', 'karachi': 'کراچی',
        'Gulshan-e-Iqbal': 'گلشن اقبال',
        'Gulistan-e-Johar': 'گلستان جوہر',
        'Gulistan-e-Jauhar': 'گلستان جوہر',
        'DHA': 'ڈی ایچ اے', 'Clifton': 'کلفٹن',
        'Saddar': 'صدر', 'Korangi': 'کورنگی',
        'Nazimabad': 'ناظم آباد', 'North': 'نارتھ',
        'South': 'ساؤتھ', 'East': 'ایسٹ',
        'West': 'ویسٹ', 'Central': 'سینٹرل',
        'City': 'سٹی', 'University': 'یونیورسٹی',
        'Colony': 'کالونی', 'Area': 'علاقہ',
        'Azadi Chowk (KU)': 'آزادی چوک (کے یو)',
        'UBIT (Computer Science)': 'یوبٹ (کمپیوٹر سائنس)',
        'HEJ Research Institute': 'ایچ ای جے ریسرچ انسٹی ٹیوٹ',
        'Research Institute': 'ریسرچ انسٹی ٹیوٹ',
        'Institute': 'انسٹی ٹیوٹ',
        'HEJ': 'ایچ ای جے',
        'Staff Gate': 'اسٹاف گیٹ',
        'Maskan Gate': 'مسکن گیٹ',
        'Silver Jubilee Gate': 'سلور جوبلی گیٹ',
        'Gate': 'گیٹ',
        'Pathan Wari': 'پٹھان واڑی',
        'Metroville': 'میٹروول',
        'SITE': 'سائٹ',
        'Highway': 'ہائی وے',
        'Expressway': 'ایکسپریس وے',
        'Boulevard': 'بلیوارڈ',
        'Avenue': 'ایونیو',
        'Lane': 'لین',
        'Chowrangi': 'چورنگی'
      };
      
      Object.keys(mapping).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        tr = tr.replace(regex, mapping[key]);
      });
      
      if (prefixReplaced) {
        tr = `${tr} کے قریب`;
      }
      return tr;
    } else {
      // Urdu to English
      let prefixReplaced = false;
      const urduPrefixes = ['کے قریب', 'کے نزدیک', 'کے آس پاس', 'سے متصل'];
      for (const p of urduPrefixes) {
        if (tr.includes(p)) {
          tr = tr.replace(p, '').trim();
          prefixReplaced = true;
          break;
        }
      }

      const mapping = {
        'جامعہ کراچی سرکلر روڈ': 'KU Circular Road',
        'پائنیر کاٹیجز': 'Pioneer Cottages',
        'این ای ڈی سرکلر روڈ': 'NED Circular Road',
        'سوئی گیس کمپنی': 'Sui Gas Company',
        'کراچی سوسائٹی': 'Karachi Society',
        'پی جی کینٹین': 'PG Canteen',
        'کینٹین': 'Canteen',
        'پی جی': 'PG',
        'جامعہ': 'University',
        'روڈ': 'Road',
        'اسٹریٹ': 'Street',
        'بلاک': 'Block',
        'سیکٹر': 'Sector',
        'فیز': 'Phase',
        'ٹاؤن': 'Town',
        'سوسائٹی': 'Society',
        'کراچی': 'Karachi',
        'گلشن اقبال': 'Gulshan-e-Iqbal',
        'گلستان جوہر': 'Gulistan-e-Jauhar',
        'ڈی ایچ اے': 'DHA',
        'کلفٹن': 'Clifton',
        'صدر': 'Saddar',
        'کورنگی': 'Korangi',
        'ناظم آباد': 'Nazimabad',
        'نارتھ': 'North',
        'ساؤتھ': 'South',
        'ایسٹ': 'East',
        'ویسٹ': 'West',
        'سینٹرل': 'Central',
        'سٹی': 'City',
        'یونیورسٹی': 'University',
        'کالونی': 'Colony',
        'علاقہ': 'Area',
        'آزادی چوک (کے یو)': 'Azadi Chowk (KU)',
        'یوبٹ (کمپیوٹر سائنس)': 'UBIT (Computer Science)',
        'ایچ ای جے ریسرچ انسٹی ٹیوٹ': 'HEJ Research Institute',
        'ریسرچ انسٹی ٹیوٹ': 'Research Institute',
        'انسٹی ٹیوٹ': 'Institute',
        'ایچ ای جے': 'HEJ',
        'اسٹاف گیٹ': 'Staff Gate',
        'مسکن گیٹ': 'Maskan Gate',
        'سلور جوبلی گیٹ': 'Silver Jubilee Gate',
        'گیٹ': 'Gate',
        'پٹھان واڑی': 'Pathan Wari',
        'میٹروول': 'Metroville',
        'سائٹ': 'SITE',
        'ہائی وے': 'Highway',
        'ایکسپریس وے': 'Expressway',
        'بلیوارڈ': 'Boulevard',
        'ایونیو': 'Avenue',
        'لین': 'Lane',
        'چورنگی': 'Chowrangi'
      };

      Object.keys(mapping).forEach(key => {
        // Urdu doesn't have case, so we can use split/join for exact matching
        // This avoids RegExp unicode flag issues with Arabic/Urdu characters
        tr = tr.split(key).join(mapping[key]);
      });
      
      if (prefixReplaced) {
        tr = `Near ${tr}`;
      }
      return tr;
    }
  }, [language, i18nT]);

  const translateName = useCallback((name) => {
    if (!name) return name;
    if (language !== 'ur') return name;

    const translated = i18nT(name, { defaultValue: '' });
    if (translated && translated !== name) return translated;

    const map = {
      'Syed': 'سید', 'Ali': 'علی', 'Hassan': 'حسن', 'Raza': 'رضا',
      'Ahmed': 'احمد', 'Tariq': 'طارق', 'Sara': 'سارہ', 'Khan': 'خان',
      'Nadia': 'نادیہ', 'Rauf': 'رؤف', 'Saad': 'سعد', 'Ayesha': 'عائشہ',
      'Omer': 'عمر', 'Zia': 'ضیاء', 'Murtaza': 'مرتضیٰ', 'Fahad': 'فہد',
      'Aziz': 'عزیز', 'Bilal': 'بلال', 'Malik': 'ملک', 'Kiran': 'کرن',
      'Shah': 'شاہ', 'Kamran': 'کامران', 'Hina': 'حنا', 'Pervez': 'پرویز',
      'Ghauri': 'غوری', 'Salman': 'سلمان', 'Citizen': 'شہری',
      'Anonymous Citizen': 'گمنام شہری', 'Demo User': 'ڈیمو یوزر',
      'Imran': 'عمران', 'Abbas': 'عباس', 'Qureshi': 'قریشی',
      'Qasim': 'قاسم', 'Mahmood': 'محمود', 'Zainab': 'زینب',
      'Faisal': 'فیصل', 'Baig': 'بیگ', 'Rabia': 'رابعہ', 'Naz': 'ناز',
      'Danish': 'دانش', 'Lubna': 'لبنیٰ', 'Irfan': 'عرفان',
      'Waseem': 'وسیم', 'Akram': 'اکرم', 'Noor': 'نور', 'Fatima': 'فاطمہ',
      'Adeel': 'عدیل', 'Shaheen': 'شاہین', 'Mohsin': 'محسن',
      'Zoya': 'زویا', 'Arif': 'عارف', 'Farhan': 'فرحان', 'Sheikh': 'شیخ',
      'Mahnoor': 'ماہ نور', 'Baloch': 'بلوچ', 'Taimoor': 'تیمور',
      'Sana': 'ثناء', 'Javed': 'جاوید', 'Usman': 'عثمان', 'Ghani': 'غنی',
      'Kashif': 'کاشف', 'Rida': 'ردا', 'Zain': 'زین', 'Zafar': 'ظفر',
      'Nida': 'ندا', 'Yasir': 'یاسر', 'Anum': 'انعم', 'Fayyaz': 'فیاض',
      'Hamza': 'حمزہ', 'Bushra': 'بشریٰ', 'Ansari': 'انصاری', 'Fawad': 'فواد',
      'Mehwish': 'مہوش', 'Hayat': 'حیات', 'Hussain': 'حسین', 'Sanam': 'صنم',
      'Saeed': 'سعید', 'Mikaal': 'میکال', 'Zulf\\.': 'ذوالفقار.',
      'Aiman': 'ایمن', 'Muneeb': 'منیب', 'Butt': 'بٹ', 'Hania': 'ہانیہ',
      'Aamir': 'عامر', 'Asim': 'عاصم', 'Azhar': 'اظہر', 'Iqra': 'اقراء',
      'Sajal': 'سجل', 'Aly': 'علی', 'Ahad': 'احد', 'Shaggy': 'شیگی', 'chubby': 'چبی',
      // Additional common Pakistani names
      'Haziq': 'حاذق', 'Shahzaib': 'شاہزیب', 'Talha': 'طلحہ', 'Owais': 'اویس',
      'Junaid': 'جنید', 'Saleem': 'سلیم', 'Farooq': 'فاروق', 'Omar': 'عمر',
      'Muhammad': 'محمد', 'Mohammad': 'محمد', 'Rehman': 'رحمان', 'Rahman': 'رحمان',
      'Abdul': 'عبدال', 'Abdullah': 'عبداللہ', 'Hammad': 'حماد', 'Haroon': 'ہارون',
      'Waqar': 'وقار', 'Waqas': 'وقاص', 'Shoaib': 'شعیب', 'Shehzad': 'شہزاد',
      'Nabeel': 'نبیل', 'Naeem': 'نعیم', 'Nasir': 'ناصر', 'Nadeem': 'ندیم',
      'Rizwan': 'رضوان', 'Rafiq': 'رفیق', 'Rahim': 'رحیم', 'Rashid': 'راشد',
      'Tahir': 'طاہر', 'Tanveer': 'تنویر', 'Tayyab': 'طیب', 'Taha': 'طٰہٰ',
      'Mariam': 'مریم', 'Maryam': 'مریم', 'Aisha': 'عائشہ', 'Amna': 'آمنہ',
      'Hafsa': 'حفصہ', 'Sidra': 'سدرہ', 'Alina': 'علینہ', 'Laiba': 'لائبہ',
      'Areeba': 'اریبہ', 'Anaya': 'عنایہ', 'Emaan': 'ایمان', 'Iman': 'ایمان',
      'Zara': 'زارا', 'Dua': 'دعا', 'Maha': 'مہا', 'Hira': 'حرا',
      'Asad': 'اسد', 'Basit': 'باسط', 'Habib': 'حبیب', 'Khalid': 'خالد',
      'Majid': 'ماجد', 'Sajid': 'ساجد', 'Waheed': 'وحید', 'Zahid': 'زاہد',
      'Aslam': 'اسلم', 'Anwar': 'انور', 'Aftab': 'آفتاب', 'Babar': 'بابر',
      'Ehsan': 'احسان', 'Furqan': 'فرقان', 'Gulzar': 'گلزار', 'Haider': 'حیدر',
      'Jawad': 'جواد', 'Kamal': 'کمال', 'Liaqat': 'لیاقت', 'Mushtaq': 'مشتاق',
      'Nauman': 'نعمان', 'Qadir': 'قادر', 'Sabir': 'صابر',
      'Shahid': 'شاہد', 'Umair': 'عمیر', 'Yousuf': 'یوسف', 'Yousaf': 'یوسف',
      'Atif': 'عاطف', 'Haris': 'حارث', 'Rehan': 'ریحان', 'Sameer': 'سمیر',
      'User': 'صارف', 'Admin': 'ایڈمن', 'Phone User': 'فون صارف', 'Google User': 'گوگل صارف',
      'You': 'آپ', 'Anonymous': 'گمنام', 'Demo Admin': 'ڈیمو ایڈمن',
      'K\\.': 'کے.', 'J\\.': 'جے.', 'T\\.': 'ٹی.', 'R\\.': 'آر.', 'A\\.': 'اے.', 'B\\.': 'بی.', 'C\\.': 'سی.'
    };

    if (nameCache[name]) return nameCache[name];

    let res = name;
    for (const [en, ur] of Object.entries(map)) {
      const isInitial = en.endsWith('\\.');
      const regexStr = isInitial ? `\\b${en}` : `\\b${en}\\b`;
      res = res.replace(new RegExp(regexStr, 'gi'), ur);
    }
    
    // If name still contains English characters, hit the transliteration API dynamically
    if (/[A-Za-z]/.test(res) && nameCache[name] === undefined) {
      // Defer setState to avoid "Cannot update a component while rendering another" error.
      // translateName is called during render, so we must schedule the cache write
      // outside the current render cycle.
      queueMicrotask(() => setNameCache(prev => ({ ...prev, [name]: res })));
      
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(data => {
          if (data && data[0] && data[0][0] && data[0][0][0]) {
            setNameCache(prev => ({ ...prev, [name]: data[0][0][0] }));
          }
        })
        .catch(e => {
          console.warn("Name transliteration failed:", e);
        });
    }

    return res;
  }, [language, i18nT, nameCache]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, isChangingLanguage, toUrduNumerals, translateLocation, translateName }}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
        {children}
      </View>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
