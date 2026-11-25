import React from 'react';
import { Heart, Search, MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import wonder from '../assets/images/wonder.webp';
const AboutSection = () => {
  const { t } = useTranslation();

  
  const features = [
    {
      icon: <Search className="w-6 h-6 text-[#007a55]" />,
      title: t('why.card1_title', 'Real-time Stock'),
      desc: t('why.card1_desc', 'Know exactly which pharmacy has your medicine before you leave the hospital.')
    },
    {
      icon: <MapPin className="w-6 h-6 text-[#007a55]" />,
      title: t('why.card2_title', 'Nearest to You'),
      desc: t('why.card2_desc', 'We show you the closest verified pharmacies with live GPS directions.')
    },
    {
      icon: <Clock className="w-6 h-6 text-[#007a55]" />,
      title: t('why.card3_title', 'Save Time & Money'),
      desc: t('why.card3_desc', 'Skip the walk from pharmacy to pharmacy. Get your medicine faster.')
    }
  ];

  return (
    <section id="about" className="py-24 bg-[#FDFBF7] dark:bg-gray-950 transition-colors">
      <div className="container mx-auto px-6 md:px-12 max-w-6xl">
        
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
         
          <div className="flex-1 w-full relative">
            
            <img 
              src={wonder} 
              alt="Patient looking at a prescription, wondering where to go" 
              className="relative z-10 w-full h-[450px] object-cover rounded-[2.5rem] shadow-xl filter grayscale-[15%] sepia-[5%]"
            />
            
            {/* Floating Quote */}
            <div className="absolute -bottom-8 -right-4 md:-right-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl z-20 max-w-[260px] border border-gray-100 dark:border-gray-700">
              <div className="mb-3">
                <Heart className="w-6 h-6 text-[#007a55] fill-current" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 italic leading-relaxed">
                "{t('about.quote', 'I have the prescription, but I don\'t know which pharmacy actually has it in stock.')}"
              </p>
              
            </div>
          </div>

          
          <div className="flex-1 space-y-8">
            
            {/* The Story Text */}
            <div>
              <span className="text-sm font-bold tracking-widest text-[#007a55] uppercase mb-3 block">
                {t('about.label', 'OUR STORY')}
              </span>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                {t('about.p1', 'In Rwanda, getting a prescription is only half the battle. The other half is walking from pharmacy to pharmacy in the hot sun, hoping one of them has the specific medicine your doctor ordered.')}
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('about.p2', 'We built Pharmatrack so you don\'t have to guess anymore.')}
              </p>
            </div>

            {/* The Solution (The 3 Cards) */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#e6f4ef] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutSection;