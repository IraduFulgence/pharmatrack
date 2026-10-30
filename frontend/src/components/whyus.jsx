import React from 'react';
import { Search, MapPin, Clock } from 'lucide-react';

const features = [
  {
    icon: <Search className="text-white w-6 h-6" />,
    title: "Real Time Availability",
    desc: "See which pharmacy have the medicine in the stock."
  },
  {
    icon: <MapPin className="text-white w-6 h-6" />,
    title: "Location Based Search",
    desc: "Find pharmacy near you with distance and direction."
  },
  {
    icon: <Clock className="text-white w-6 h-6" />,
    title: "Save Time and Money",
    desc: "Avoid unnecessary travel and get what you need faster."
  }
];

const WhyChooseUs = () => {
  return (
    // Adjusted padding for mobile
    <section className="py-16 md:py-20 bg-white dark:bg-gray-950 transition-colors">
      <div className="container mx-auto px-6 md:px-12 text-center">
        
        {/* Responsive text sizes */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Why Choosing Pharmatrack ?
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-12 md:mb-16 text-sm md:text-base max-w-2xl mx-auto">
          Built for patients, pharmacies and healthier communities
        </p>

        {/* Grid: 1 column on mobile, 2 on tablets (sm), 3 on desktop (lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              // Slightly less padding on mobile
              className="bg-brand-light dark:bg-gray-900 p-6 md:p-8 rounded-2xl text-left hover:shadow-lg transition-shadow duration-300 flex flex-col items-start"
            >
              <div className="bg-brand-dark dark:bg-brand-primary w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-4 md:mb-6">
                {feature.icon}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyChooseUs;