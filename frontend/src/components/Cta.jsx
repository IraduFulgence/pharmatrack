import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom'; 


export default function CTA() {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-gray-950 transition-colors">
      <div className="container mx-auto px-6 md:px-12">
        
        
        <div className="relative overflow-hidden bg-[#3b9568] dark:bg-gray-950 rounded-3xl p-8 md:p-16 text-center shadow-xl">
          
          
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('cta.title', 'Ready to find your medicine?')}
            </h2>
            
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              {t('cta.subtitle', 'Join thousands of users finding real-time availability, comparing prices, and saving time at pharmacies near them.')}
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Primary Button */}
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-[#3b9568] font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200 flex items-center justify-center gap-2"
              >
                {t('cta.primaryBtn', 'Get Started Now')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              {/* Secondary Button */}
              <a
                href="#contact"
                className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors duration-200 flex items-center justify-center"
              >
                {t('cta.secondaryBtn', 'Contact Support')}
              </a>
            </div>
            
            
          </div>
        </div>

      </div>
    </section>
  );
}