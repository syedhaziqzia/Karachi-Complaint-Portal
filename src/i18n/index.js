import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ru from './locales/ru.json'; // Roman Urdu
import ur from './locales/ur.json';

const LANGUAGE_KEY = 'kcp_lang';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      // Map 'ur-roman' to 'ru' for backward compatibility
      if (savedLang === 'ur-roman') {
        callback('ru');
      } else {
        callback(savedLang || 'en');
      }
    } catch (e) {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: () => {}
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      ur: { translation: ur },
    },
    fallbackLng: 'en', // Falls back to English only if a key is completely missing
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  });

export default i18n;
