import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './themetoggle';
import logo from '../assets/logo.png';
import { useTranslation } from 'react-i18next'; 
import LanguageSwitcher from './LanguageSwitcher';
const Navbar = () => {
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const {t} = useTranslation();
  const navLinks = [
    { name: t('nav.home'), href: '#' },
    { name: t('nav.about'), href: '#' },
    { name: t('nav.howItWorks'), href: '#' },
    { name: t('nav.features'), href: '#' },
    { name: t('nav.contact'), href: '#' },
  ];

  return (
    <nav className="w-full py-4 px-6 md:px-12 bg-white dark:bg-green-900 shadow-sm sticky top-0 z-50 border-b border-transparent dark:border-gray-800 transition-colors relative">
      <div className="flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer z-50">
         <img src={logo} style={{height:40}} />
          <span className="text-xl font-bold text-green-900 dark:text-green-700">Pharmatrack</span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="hover:text-brand-primary transition-colors">
              {link.name}
            </a>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
         <LanguageSwitcher />
          <ThemeToggle />
          <button className="px-5 py-2 text-sm font-medium text-brand-dark border border-gray-300 rounded-lg hover:bg-gray-50 transition dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800">
            {t('nav.login')}
          </button>
          <button className="px-5 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-green-700 transition shadow-md">
            {t('nav.signUp')}
          </button>
        </div>

        {/* Mobile Menu Toggle Button (Visible only on small screens) */}
        <div className="flex items-center gap-4 md:hidden z-50">
           <LanguageSwitcher />
           <ThemeToggle />
           <button 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             className="text-gray-600 dark:text-gray-300 hover:text-brand-primary focus:outline-none"
           >
             {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
           </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-gray-900 shadow-lg border-t border-gray-100 dark:border-gray-800 py-4 px-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="text-base font-medium text-gray-800 dark:text-gray-200 hover:text-brand-primary py-2 border-b border-gray-50 dark:border-gray-800"
              onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
            >
              {link.name}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <button className="w-full px-5 py-2.5 text-sm font-medium text-brand-dark border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800 transition">
              {t('nav.login')}
            </button>
            <button className="w-full px-5 py-2.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-green-700 transition shadow-md">
             {t('nav.signUp')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;