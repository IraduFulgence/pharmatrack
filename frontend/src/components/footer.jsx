import React from 'react';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import logo from '../assets/logo.png'; 

const Footer = () => {
  const { t } = useTranslation();

  return (
    <>
      <footer className="bg-green-900 text-gray-300 py-16 transition-colors">
        <div className="container mx-auto px-6 md:px-12">
          
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-16">
            <div className="md:col-span-5 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-6">
                <img src={logo} style={{height:40}} />
                <span className="text-xl font-bold text-white tracking-wide">Pharmatrack</span>
              </div>
              
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                {t('footer.desc')}
              </p>
              <div className="space-y-3 text-sm text-gray-300">
                <a href="tel:+250780946600" className="flex items-center gap-3 hover:text-white transition-colors">
                  <Phone size={18} />
                  <span>+250 780 000 000</span>
                </a>
                <a href="mailto:support@pharmatrack.rw" className="flex items-center gap-3 hover:text-white transition-colors">
                  <Mail size={18} />
                  <span>support@pharmatrack.rw</span>
                </a>
              </div>
            </div>

            
            <div className="hidden md:block md:col-span-3"></div>
            <div className="md:col-span-2">
              <h4 className="text-white font-bold mb-6">{t('footer.explore', 'Explore')}</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.about', 'About us')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.articles', 'Health articles')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.help', 'Help centre')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.partner', 'Are you a pharmacy? Partner with us')}</a></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-white font-bold mb-6">{t('footer.legal', 'Legal')}</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.terms', 'Terms of service')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.privacy', 'Privacy policy')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.cookie', 'Cookie policy')}</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="border-t border-gray-800 pt-8 text-sm text-gray-500">
            {t('footer.rights')}
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/250780000000" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#20bd5a] transition-transform hover:scale-105 z-50 flex items-center justify-center"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={32} />
      </a>
    </>
  );
};

export default Footer;