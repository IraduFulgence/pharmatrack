import React from 'react';
import { MapPin, Hourglass, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import heroImage from '../assets/heroimage.png';
const Hero = () => {
    const {t} = useTranslation();
  return (
    
    <section className="bg-white dark:bg-gray-900 py-12 md:py-20 relative overflow-hidden transition-colors">
      <div className="container mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-2 items-center">
        
        {/* Left Content */}
        <div className="space-y-8  text-center md:text-left">
         
          <h1 className="text-4xl sm:text-5xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('hero.title1')} <br className="hidden sm:block" />
            {t('hero.title2')} <span></span>
            <span className="text-brand-primary">{t('hero.title3')}</span>
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
            {t('hero.desc')}
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 pt-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-mint dark:bg-gray-900 p-2 rounded-lg text-brand-dark dark:text-green-800">
                <MapPin size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-brand-primary text-left">{t('hero.feat1')}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-brand-mint dark:bg-gray-900 p-2 rounded-lg text-brand-dark dark:text-green-800">
                <Hourglass size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-brand-primary text-left">{t('hero.feat2')}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-brand-mint dark:bg-gray-900 p-2 rounded-lg text-brand-dark dark:text-green-800">
                <Clock size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-brand-primary text-left">{t('hero.feat3')}</span>
            </div>
          </div>
        </div>

        
        <div className="relative flex justify-center md:justify-end mt-8 md:mt-0">
          <img 
            src={heroImage} 
            alt="Woman using Pharmatrack app" 
            className="rounded-3xl shadow-xl w-full max-w-sm md:max-w-md object-cover h-[350px] md:h-[500px]"
          />
          
         
        </div>

      </div>
    </section>
  );
};

export default Hero;