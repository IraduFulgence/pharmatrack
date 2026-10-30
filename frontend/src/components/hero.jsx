import React from 'react';
import { MapPin, Hourglass, Clock } from 'lucide-react';

const Hero = () => {
  return (
    // Reduced top/bottom padding on mobile (py-12), larger on desktop (md:py-20)
    <section className="bg-brand-light dark:bg-gray-900 py-12 md:py-20 relative overflow-hidden transition-colors">
      <div className="container mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Content */}
        <div className="space-y-6 md:space-y-8 z-10 text-center md:text-left">
          {/* Responsive font sizes: smaller on mobile, larger on desktop */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            Find Medicine <br className="hidden sm:block" />
            Availability <br />
            <span className="text-brand-primary">Near you</span>
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
            Pharmatrack helps you quickly find nearby pharmacies where your prescribed 
            medicine is available. Save time, avoid unnecessary travel, and get the 
            medicine you need — faster.
          </p>

          {/* Feature Pills - Centered on mobile, left-aligned on desktop */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-mint dark:bg-gray-800 p-2 rounded-lg text-brand-dark dark:text-brand-light">
                <MapPin size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Find nearby <br/> pharmacy</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-brand-mint dark:bg-gray-800 p-2 rounded-lg text-brand-dark dark:text-brand-light">
                <Hourglass size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Check real-time <br/> availability</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-brand-mint dark:bg-gray-800 p-2 rounded-lg text-brand-dark dark:text-brand-light">
                <Clock size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Save Time and <br/> Money</span>
            </div>
          </div>
        </div>

        {/* Right Image - Reordered slightly on mobile, centered */}
        <div className="relative flex justify-center md:justify-end mt-8 md:mt-0">
          <img 
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop" 
            alt="Woman using Pharmatrack app" 
            // Adjusted height for mobile to prevent it from being too tall
            className="rounded-3xl shadow-xl w-full max-w-sm md:max-w-md object-cover h-[350px] md:h-[500px]"
          />
          
          {/* Floating Element - Hidden on very small screens to prevent overlap issues */}
          <div className="absolute top-4 -right-2 md:top-10 md:-right-4 lg:right-10 bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-2xl hidden sm:block">
             <div className="flex items-center gap-2 text-brand-primary text-sm md:text-base font-bold">
                <MapPin size={18} className="md:w-5 md:h-5" /> Nearby Pharmacies
             </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;