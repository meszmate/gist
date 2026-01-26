import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hu from './locales/hu.json';
import en from './locales/en.json';

const resources = {
  hu: { translation: hu },
  en: { translation: en },
};

// Get saved locale or detect from browser
const getSavedLocale = (): string => {
  const saved = localStorage.getItem('locale');
  if (saved && ['hu', 'en'].includes(saved)) {
    return saved;
  }

  // Detect from browser
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'hu' ? 'hu' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (locale: string) => {
  localStorage.setItem('locale', locale);
  i18n.changeLanguage(locale);
};

export const formatDate = (date: Date | string, locale?: string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const lang = locale || i18n.language;

  if (lang === 'hu') {
    // Hungarian format: 2024. 01. 15.
    return d.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatNumber = (num: number, locale?: string): string => {
  const lang = locale || i18n.language;

  if (lang === 'hu') {
    // Hungarian format: 1 234,56
    return num.toLocaleString('hu-HU');
  }

  return num.toLocaleString('en-US');
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return i18n.language === 'hu'
      ? `${hours} óra ${minutes} perc`
      : `${hours}h ${minutes}m`;
  }

  return i18n.language === 'hu' ? `${minutes} perc` : `${minutes}m`;
};

export default i18n;
