import React from 'react';
import { 
  Search, MapPin, Smartphone, MessageSquare, 
   CheckCircle2 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';


const FeatureSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      id: 1,
      icon: <Search className="w-8 h-8 text-white" />,
      title: t('how.step1_title', 'Search for your medicine'),
      desc: t('how.step1_desc', 'Type the name of your medicine. We instantly show you which nearby pharmacies have it in stock.'),
      feature: t('how.step1_feature', 'Real-time stock visibility'),
      color: 'bg-[#007a55]',
    },
    {
      id: 2,
      icon: <MapPin className="w-8 h-8 text-white" />,
      title: t('how.step2_title', 'Navigate easily'),
      desc: t('how.step2_desc', 'Found it? Tap to see the location on our map. Get driving directions without leaving the app.'),
      feature: t('how.step2_feature', 'In-app GPS Map'),
      color: 'bg-[#007a55]',
    },
    {
      id: 3,
      icon: <Smartphone className="w-8 h-8 text-white" />,
      title: t('how.step3_title', 'Use your hospital SMS'),
      desc: t('how.step3_desc', 'Got a code from the hospital? Enter it here. We will instantly show you the nearest pharmacy that can fulfill it.'),
      feature: t('how.step3_feature', 'Instant prescription redemption'),
      color: 'bg-[#007a55]',
    },
    {
      id: 4,
      icon: <MessageSquare className="w-8 h-8 text-white" />,
      title: t('how.step4_title', 'Pick up & Chat'),
      desc: t('how.step4_desc', 'Walk in to pick up your medicine. Have a question? Message the pharmacist directly through the app.'),
      feature: t('how.step4_feature', 'Direct pharmacy chat'),
      color: 'bg-[#007a55]',
    },
  ];

  return (
    <section id="howitworks" className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-6 md:px-12 max-w-6xl">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold uppercase text-brand-primary dark:text-white mb-4">
            {t('how.title', 'HOW IT WORKS')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('how.subtitle', 'Getting your medicine is now a simple, 4-step journey. No more guessing.')}
          </p>
        </div>

        {/* The Timeline */}
        <div className="relative">
          
         
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" aria-hidden="true"></div>

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex flex-col md:flex-row gap-6 md:gap-12 items-start group">
                
                {/* circle and number */}
                <div className="flex flex-row md:flex-col items-center gap-4 shrink-0 z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${step.color}`}>
                    {step.icon}
                  </div>
                  <span className="text-4xl font-extrabold text-gray-200 dark:text-gray-800 md:mt-2">
                    0{step.id}
                  </span>
                </div>

                <div className="flex-1 bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
                    {step.desc}
                  </p>
                  
                  <div className="inline-flex items-center gap-2 bg-[#e6f4ef] dark:bg-[#007a55]/20 text-[#007a55] dark:text-[#34d399] px-4 py-2 rounded-lg text-sm font-semibold">
                    <CheckCircle2 size={16} />
                    {step.feature}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

       

      </div>
    </section>
  );
};

export default FeatureSection;