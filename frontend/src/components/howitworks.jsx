import React from 'react';
import { useTranslation } from 'react-i18next';

export default function HowItWorks () {
  const { t } = useTranslation();

  const steps = [
    { id: 1, title: t('how.step1_title'), desc: t('how.step1_desc') },
    { id: 2, title: t('how.step2_title'), desc: t('how.step2_desc') },
    { id: 3, title: t('how.step3_title'), desc: t('how.step3_desc') },
    { id: 4, title: t('how.step4_title'), desc: t('how.step4_desc') },
  ];

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-gray-950 transition-colors">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Connected Steps */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('how.title')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-12 md:mb-16 text-lg">
              {t('how.subtitle')}
            </p>

            {/* List Container */}
            <div className="relative">
              {/* The Connecting Line (Absolute positioned) */}
              {/* top-6 aligns with the center of the first circle, bottom-6 with the last */}
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-brand-primary/30 dark:bg-brand-primary/50 -z-10"></div>

              <div className="flex flex-col gap-10">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-6 relative z-10">
                    {/* Number Circle */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-dark dark:bg-brand-primary text-white flex items-center justify-center font-bold text-lg shadow-md border-4 border-white dark:border-gray-950">
                      {step.id}
                    </div>
                    
                    {/* Step Content */}
                    <div className="pt-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Phone Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            {/* 
              For the best result, replace this div with an actual image of your app 
              inside a transparent phone mockup frame (PNG).
              I am building a CSS-only approximation here.
            */}
            <div className="relative w-[280px] h-[580px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden dark:border-gray-700">
                {/* Phone notch */}
                <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 flex justify-center z-20">
                    <div className="w-32 h-6 bg-gray-800 rounded-b-3xl"></div>
                </div>
                {/* Screen Content */}
                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col pt-8">
                     {/* Fake App Header */}
                     <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-gray-900 border-b dark:border-gray-800">
                         <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded bg-brand-dark"></div>
                             <span className="text-xs font-bold text-gray-800 dark:text-white">Pharmatrack</span>
                         </div>
                     </div>
                     {/* Fake Map Area */}
                     <div className="flex-grow bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-200 dark:bg-gray-700 relative p-4">
                         {/* Fake Map Pins */}
                         <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-brand-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">📍</div>
                         <div className="absolute top-1/2 right-1/4 w-8 h-8 bg-brand-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">📍</div>
                         <div className="absolute bottom-1/4 left-1/3 w-8 h-8 bg-brand-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">📍</div>
                     </div>
                     {/* Fake Bottom Sheet */}
                     <div className="bg-white dark:bg-gray-900 h-1/3 rounded-t-3xl p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                         <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
                         <div className="space-y-3">
                             <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                             <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                             <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                         </div>
                     </div>
                </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

