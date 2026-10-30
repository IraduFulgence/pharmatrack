import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
      <Globe size={18} />
      <select
      // handles 'en-US' -> 'en'
        value={i18n.language.split('-')[0]} 
        onChange={changeLanguage}
        className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer dark:bg-gray-900"
      >
        <option value="en" className="dark:bg-gray-900">EN</option>
        <option value="fr" className="dark:bg-gray-900">FR</option>
        <option value="rw" className="dark:bg-gray-900">RW</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;