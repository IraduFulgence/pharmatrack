import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Building2, Phone, Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();
  
  // State to hold form data
  const [formData, setFormData] = useState({
    accountType: 'patient', // 'patient' or 'pharmacy'
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
    } else {
      console.log("Form Submitted:", formData);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    console.log("Google Sign-Up Success:", credentialResponse);
  
  };

  // Update form data state
  const updateData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Progress Bar calculation
  const progressWidth = ((step - 1) / 2) * 100;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.createAccount', 'Create an account')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.haveAccount', 'Already have an account?')}{' '}
            <Link to="/login" className="font-medium text-brand-primary hover:text-green-700 transition-colors">
              {t('auth.loginHere', 'Log in')}
            </Link>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-brand-primary bg-brand-light dark:bg-gray-800 dark:text-brand-light">
                {t('auth.step', 'Step')} {step} {t('auth.of', 'of')} 3
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-brand-primary">
                {Math.round(progressWidth)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
            <div style={{ width: `${progressWidth}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-brand-primary transition-all duration-300"></div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          
          {/* Account type */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('auth.registeringAs', 'I am registering as a:')}
              </label>
              
              <div 
                onClick={() => updateData('accountType', 'patient')}
                className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${formData.accountType === 'patient' ? 'border-brand-primary bg-brand-light dark:bg-brand-primary/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <div className={`p-3 rounded-full ${formData.accountType === 'patient' ? 'bg-brand-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('auth.patient', 'Patient')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('auth.patientDesc', 'I want to find and order medicine.')}</p>
                </div>
                {formData.accountType === 'patient' && <Check className="ml-auto text-brand-primary" />}
              </div>

              <div 
                onClick={() => updateData('accountType', 'pharmacy')}
                className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${formData.accountType === 'pharmacy' ? 'border-brand-primary bg-brand-light dark:bg-brand-primary/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <div className={`p-3 rounded-full ${formData.accountType === 'pharmacy' ? 'bg-brand-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('auth.pharmacy', 'Pharmacy')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('auth.pharmacyDesc', 'I want to manage stock and fulfill orders.')}</p>
                </div>
                {formData.accountType === 'pharmacy' && <Check className="ml-auto text-brand-primary" />}
              </div>
            </div>
          )}

          {/* name and email */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {formData.accountType === 'pharmacy' ? t('auth.pharmacyName', 'Pharmacy Name') : t('auth.fullName', 'Full Name')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {formData.accountType === 'pharmacy' ? <Building2 className="h-5 w-5 text-gray-400" /> : <User className="h-5 w-5 text-gray-400" />}
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => updateData('fullName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white"
                    placeholder={formData.accountType === 'pharmacy' ? 'e.g. Kigali Care Pharmacy' : 'e.g. John Doe'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.phone', 'Phone Number')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => updateData('phone', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white"
                    placeholder="+250 78..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* password */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.email', 'Email Address')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.createPassword', 'Create Password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => updateData('password', e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="w-1/3 flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('auth.back', 'Back')}
              </button>
            )}
            
            <button
              type="submit"
              className={`flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors ${step > 1 ? 'w-2/3' : 'w-full'}`}
            >
              {step === 3 ? t('auth.createAccountBtn', 'Create Account') : t('auth.continue', 'Continue')}
            </button>
          </div>

        </form>

        {/* OAuth Section  */}
        {step === 1 && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">
                  {t('auth.orSignUpWith', 'Or sign up with')}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.log('Sign-Up Failed')}
                text="signup" 
                theme="outline"
                size="large"
                width="100%"
                locale="en"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Register;