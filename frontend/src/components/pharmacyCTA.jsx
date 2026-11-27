import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react'; 

export default function PharmacyCTA() {
  const { t } = useTranslation();

  return (
    <section className="bg-gray-50 dark:bg-gray-950 py-8  transition-colors">
      <div className="container mx-auto px-6 md:px-12">
        
        {/* Banner Container */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-gray-950 p-6 md:p-8 rounded-2xl ">
          
          {/* Text & Icon */}
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="text-brand-primary w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {t('cta.pharmacy_title', 'Are you a pharmacy?')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                {t('cta.pharmacy_subtitle', 'Partner with us to reach more patients and digitize your inventory.')}
              </p>
            </div>
          </div>

          {/* Button */}
          <Link
            to="/auth/register"
            className="w-full md:w-auto px-8 py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg whitespace-nowrap text-center"
          >
            {t('cta.pharmacy_btn', 'Become a Partner')}
          </Link>

        </div>
      </div>
    </section>
  );
}