import React from 'react';
import { useTranslation } from 'react-i18next';

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      id: 1,
      title: t('how.step1_title'),
      desc: t(
        'how.step1_desc'
      ),
    },
    {
      id: 2,
      title: t('how.step2_title'),
      desc: t(
        'how.step2_desc'
      ),
    },
    {
      id: 3,
      title: t('how.step3_title'),
      desc: t(
        'how.step3_desc'
      ),
    },
    {
      id: 4,
      title: t('how.step4_title'),
      desc: t(
        'how.step4_desc'
      ),
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="container mx-auto px-6 md:px-12">

        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-bold tracking-widest text-brand-primary uppercase mb-3">
            {t('how.title')}
          </p>

          <p className="text-gray-500 dark:text-gray-400 mb-12 md:mb-16 text-sm md:text-base max-w-2xl mx-auto">
            {t('how.subtitle')}
          </p>
        </div>

        {/* Steps Container */}
        <div className="relative max-w-6xl mx-auto">

          {/* Continuous Connecting Line */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-[2px] bg-[#3b9568]/50 dark:bg-[#3b9568]/40 z-0"
          />

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4 relative">

            {steps.map((step) => (
              <div
                key={step.id}
                className="relative flex flex-col items-center text-center"
              >

                {/* Number Circle */}
                <div className="relative z-10 flex items-center justify-center w-16 h-16 min-w-16 rounded-full bg-[#3b9568] text-white text-xl font-bold shadow-md ring-8 ring-white dark:ring-gray-950 mb-6">
                  {step.id}
                </div>

                {/* Step Title */}
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3 px-2">
                  {step.title}
                </h3>

                {/* Step Description */}
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-[250px] mx-auto">
                  {step.desc}
                </p>

              </div>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
