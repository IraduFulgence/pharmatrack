import React from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ContactSection = () => {
  const { t } = useTranslation();

  return (
    <section id="contact" className="py-24 bg-[#FDFBF7] dark:bg-gray-950 transition-colors">
      <div className="container mx-auto px-6 md:px-12 max-w-5xl">
        
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row">
          
          
          <div className="md:w-2/5 bg-[#007a55] p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">{t('contact.title', 'We are here to help.')}</h2>
              <p className="text-[#e6f4ef] mb-8">{t('contact.subtitle', 'Whether you are stuck on the app or just want to say hi, drop us a message.')}</p>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-white/70">{t('contact.call', 'Call us')}</p>
                    <p className="font-semibold">+250788860610</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-white/70">{t('contact.email', 'Email us')}</p>
                    <p className="font-semibold">iradukundaflu2@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            
          </div>

          {/* Form */}
          <div className="md:w-3/5 p-10">
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact.name', 'Your name')}</label>
                  <input type="text" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#007a55] outline-none text-gray-900 dark:text-white" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact.phone', 'Phone number')}</label>
                  <input type="tel" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#007a55] outline-none text-gray-900 dark:text-white" placeholder="078..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact.emailAddress', 'Email address')}</label>
                <input type="email" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#007a55] outline-none text-gray-900 dark:text-white" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contact.message', 'How can we help?')}</label>
                <textarea rows="4" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#007a55] outline-none text-gray-900 dark:text-white resize-none" ></textarea>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#007a55] text-white py-4 rounded-xl font-bold hover:bg-[#006645] transition-colors">
                <Send size={18} />
                {t('contact.send', 'Send Message')}
              </button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ContactSection;