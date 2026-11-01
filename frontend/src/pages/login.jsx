import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log("Standard Login Submitted");
  };

  // Handle Google Login Success
  const handleGoogleSuccess = (credentialResponse) => {
    console.log("Google Login Success:", credentialResponse);
   
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.loginTitle', 'Welcome back')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <Link to="/register" className="font-medium text-brand-primary hover:text-green-700 transition-colors">
              {t('auth.signUpHere', 'Sign up here')}
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Email / Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.emailOrPhone', 'Email or Phone Number')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-gray-900 dark:text-white transition-colors"
                  placeholder="you@example.com or 078..."
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.password', 'Password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-gray-900 dark:text-white transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input id="remember-me" type="checkbox" className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded dark:bg-gray-900 dark:border-gray-700" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('auth.rememberMe', 'Remember me')}
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-brand-primary hover:text-green-700 transition-colors">
                {t('auth.forgotPassword', 'Forgot password?')}
              </a>
            </div>
          </div>

          <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
            {t('auth.signIn', 'Sign in')}
          </button>
        </form>

        {/* OAuth Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">
                {t('auth.orContinueWith', 'Or continue with')}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log('Login Failed')}
              theme="outline"
              size="large"
              width="100%"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;