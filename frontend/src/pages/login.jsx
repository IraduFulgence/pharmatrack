import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authentication';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const navigate = useNavigate();
  const location = useLocation();
  // Sent here after 5 minutes without activity (see utils/useIdleLogout).
  const signedOutForIdle = location.state?.reason === 'idle';

    const handleSubmit = async (e) => {
    // Prevent default form submission behavior 
    e.preventDefault(); 
    e.stopPropagation();

    // Prevent multiple clicks while loading
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(identifier, password);
      console.log(response);
      if (response?.data?.token) {
        // Save token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Start the inactivity timer fresh for this session.
        localStorage.setItem('lastActivityAt', String(Date.now()));
        
        // Navigate to the correct dashboard
        navigate(response.data.redirectTo);
      } else {
        throw new Error("Invalid response from server.");
      }
      
    } catch (error) {
      // Catch the error and update state
      console.error("Login error:", error);
      setError(error.message || "Failed to login. Please check your credentials.");
    } finally {
      // Ensure loading state is always turned off
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    console.log("Google Login Success:", credentialResponse);
    
  };

  
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-150 w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        
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


        {signedOutForIdle && !error && (
          <div role="status" className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {t('auth.idleSignedOut', 'You were signed out after 5 minutes without activity. Log in again to continue.')}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{t('auth.LoginFails')}</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

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
                  value={identifier}
                  onChange={handleInputChange(setIdentifier)}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-gray-900 dark:text-white transition-colors ${error ? 'border-red-300 dark:border-red-800' : 'border-gray-300 dark:border-gray-700'}`}
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
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-gray-900 dark:text-white transition-colors ${error ? 'border-red-300 dark:border-red-800' : 'border-gray-300 dark:border-gray-700'}`}
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
            {/* <div className="flex items-center">
              <input id="remember-me" type="checkbox" className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded dark:bg-gray-900 dark:border-gray-700" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('auth.rememberMe', 'Remember me')}
              </label>
            </div> */}
            <div className="text-sm">
              <a href="#" className="font-medium text-brand-primary hover:text-green-700 transition-colors">
                {t('auth.forgotPassword', 'Forgot password?')}
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-green-700 transition-colors disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
            {isLoading ? `${t('auth.loading')}` : `${t('auth.Buttonsignin')}`}
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
              locale="en"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;