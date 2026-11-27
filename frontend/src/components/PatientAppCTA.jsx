import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MapPin, ShoppingBag, FileText, Users, Smartphone, Play, Apple, ArrowRight, Search, Check,
} from 'lucide-react';

// Store links come from the build environment, so they can be added once the app is published.
// Without one, that button shows "Coming soon" instead of a dead link.
const ANDROID_URL = import.meta.env.VITE_ANDROID_APP_URL || '';
const IOS_URL = import.meta.env.VITE_IOS_APP_URL || '';

function StoreButton({ href, icon: Icon, small, big, soon }) {
  const content = (
    <>
      <Icon className="w-7 h-7 shrink-0" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block text-[11px] uppercase tracking-wide opacity-80">{href ? small : soon}</span>
        <span className="block text-base font-semibold">{big}</span>
      </span>
    </>
  );
  const base = 'flex items-center gap-3 px-5 py-3 rounded-xl min-w-[190px] transition-colors';
  if (!href) {
    return (
      <span className={`${base} bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed`} aria-disabled="true">
        {content}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-md`}
    >
      {content}
    </a>
  );
}

/** A tiny, static picture of the patient app, drawn with HTML so it follows the theme. */
function PhonePreview({ t }) {
  return (
    <div className="relative mx-auto w-[250px] h-[500px] rounded-[2.5rem] border-[10px] border-gray-900 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-2xl overflow-hidden" aria-hidden="true">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 dark:bg-gray-700 rounded-b-2xl" />
      <div className="pt-8 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-brand-primary">PharmaTrack</span>
          <span className="w-7 h-7 rounded-full bg-brand-primary/15" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-400">
          <Search className="w-3.5 h-3.5" /> {t('patientApp.mockSearch', 'Search medicine')}
        </div>
        <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 pt-1">{t('patientApp.mockNearby', 'Pharmacies near you')}</p>
        {[
          ['Kigali Pharma', '0.8 km'],
          ['Ineza Pharmacy', '1.4 km'],
          ['Vine Pharmacy', '2.1 km'],
        ].map(([name, km]) => (
          <div key={name} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <span className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-brand-primary" />
            </span>
            <span className="flex-1">
              <span className="block text-[11px] font-semibold text-gray-900 dark:text-white">{name}</span>
              <span className="block text-[10px] text-gray-500">{km}</span>
            </span>
            <span className="text-[9px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">{t('patientApp.mockOpen', 'Open')}</span>
          </div>
        ))}
        <div className="p-3 rounded-xl bg-brand-primary text-white">
          <p className="text-[11px] font-bold">{t('patientApp.mockOrderTitle', 'Order ready for pickup')}</p>
          <p className="text-[10px] opacity-90">{t('patientApp.mockOrderBody', 'Show order #128 at the pharmacy')}</p>
        </div>
      </div>
    </div>
  );
}

export default function PatientAppCTA() {
  const { t } = useTranslation();

  const benefits = [
    { icon: MapPin, title: t('patientApp.b1Title', 'Find medicine nearby'), text: t('patientApp.b1Text', 'See which pharmacies near you have it in stock, with prices and directions.') },
    { icon: ShoppingBag, title: t('patientApp.b2Title', 'Order, then pick up'), text: t('patientApp.b2Text', 'Book your medicines and collect them when the pharmacy has them ready.') },
    { icon: FileText, title: t('patientApp.b3Title', 'Use your prescription'), text: t('patientApp.b3Text', 'Enter your prescription number to find exactly what your doctor prescribed.') },
    { icon: Users, title: t('patientApp.b4Title', 'Care for your family'), text: t('patientApp.b4Text', 'Add your children and order for anyone in your family from one account.') },
  ];

  return (
    <section id="patients" className="py-16 md:py-24 bg-gradient-to-b from-white to-[#eef7f2] dark:from-gray-950 dark:to-gray-900 transition-colors">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-semibold mb-5">
              <Smartphone className="w-4 h-4" /> {t('patientApp.eyebrow', 'For patients')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('patientApp.title', 'Your pharmacy, in your pocket')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl">
              {t('patientApp.subtitle', 'Get the free PharmaTrack app to find medicines, order ahead and look after your whole family\'s prescriptions.')}
            </p>

            <ul className="grid sm:grid-cols-2 gap-5 mb-10">
              {benefits.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900 dark:text-white">{title}</span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
              <StoreButton
                href={ANDROID_URL}
                icon={Play}
                small={t('patientApp.googleSmall', 'Get it on')}
                big="Google Play"
                soon={t('patientApp.comingSoon', 'Coming soon')}
              />
              <StoreButton
                href={IOS_URL}
                icon={Apple}
                small={t('patientApp.appleSmall', 'Download on the')}
                big="App Store"
                soon={t('patientApp.comingSoon', 'Coming soon')}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-xl transition-colors"
              >
                {t('patientApp.register', 'Create a free account')} <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Check className="w-4 h-4 text-brand-primary" /> {t('patientApp.sameAccount', 'Sign up here, then log in on the app with the same account.')}
              </span>
            </div>
          </div>

          <PhonePreview t={t} />
        </div>
      </div>
    </section>
  );
}
