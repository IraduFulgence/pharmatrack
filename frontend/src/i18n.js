import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './components/locales/en.json';
import rw from './components/locales/rw.json';
import fr from './components/locales/fr.json';

i18n
// Detects user's browser language
  .use(LanguageDetector) 
  .use(initReactI18next) 
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      rw: { translation: rw }
    },
    fallbackLng: 'en', 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;