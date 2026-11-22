import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  User, KeyRound, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Circle, ShieldCheck
} from 'lucide-react';
import { staffService } from '../services/staffService';


const SPECIAL_CHARS = /[@$!%*?&#^()_+=\-[\]{}|;:'",.<>/`~]/;
const ALLOWED_CHARS = /^[A-Za-z\d@$!%*?&#^()_+=\-[\]{}|;:'",.<>/`~]*$/;

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (e.g. @ # ! ?)', test: (p) => SPECIAL_CHARS.test(p) },
];

const ROLE_LABELS = { SALES_OFFICER: 'Sales Officer', PHARMACIST: 'Pharmacist' };

const fieldClass = (hasError) =>
  `block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-gray-900 dark:text-white transition-colors ${
    hasError ? 'border-red-300 dark:border-red-800' : 'border-gray-300 dark:border-gray-700'
  }`;

const IconInput = ({ icon, children }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>
    {children}
  </div>
);

const ActivateAccount = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);


  useEffect(() => {
    const code = searchParams.get('code') || '';
    const id = searchParams.get('identifier') || searchParams.get('email') || '';
    if (code || id) {
      setActivationCode(code);
      setIdentifier(id);
      setPrefilled(Boolean(code && id));
      setSearchParams({}, { replace: true });
    }
    
  }, []);

  const ruleResults = PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const passwordValid = ruleResults.every((r) => r.passed) && ALLOWED_CHARS.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanIdentifier = identifier.trim();
    const cleanCode = activationCode.trim();

    if (!cleanIdentifier) return setError('Enter the email or phone number your pharmacy registered you with.');
    if (!cleanCode) return setError('Enter the activation code you received.');
    if (!passwordValid) {
      return setError(
        ALLOWED_CHARS.test(password)
          ? 'Your password does not meet all the requirements below.'
          : 'Your password contains a character that is not allowed (spaces, for example).',
      );
    }
    if (!passwordsMatch) return setError('Passwords do not match.');

    setIsLoading(true);
    setError(null);
    try {
      const response = await staffService.activateAccount({
        identifier: cleanIdentifier,
        activationCode: cleanCode,
        password,
        confirmPassword,
      });
      setPassword('');
      setConfirmPassword('');
      setResult({ message: response.message, ...response.data });
    } catch (err) {
      setError(err.message || 'Activation failed. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Welcome{result.fullName ? `, ${result.fullName}` : ''}!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your {ROLE_LABELS[result.role] || 'staff'} account is active. Sign in with your
              email or phone number and the password you just created.
            </p>
          </div>
          <Link
            to="/login"
            className="w-full inline-flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-green-700 transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-brand-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Activate your account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your pharmacy has invited you to PharmaTrack. Confirm your activation code and choose a password.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Activation failed</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {prefilled && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              We filled in your details from the invitation link. Check them, then choose a password.
            </p>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email or phone number
            </label>
            <IconInput icon={<User className="h-5 w-5 text-gray-400" />}>
              <input
                id="identifier" type="text" autoComplete="username"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or +250788123456"
                className={fieldClass(false)}
              />
            </IconInput>
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Activation code
            </label>
            <IconInput icon={<KeyRound className="h-5 w-5 text-gray-400" />}>
              <input
                id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={64}
                value={activationCode} onChange={(e) => setActivationCode(e.target.value)}
                placeholder="6-digit code"
                className={`${fieldClass(false)} tracking-widest`}
              />
            </IconInput>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Codes expire after 48 hours. Ask your pharmacy administrator for a new one if yours has expired.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New password
            </label>
            <IconInput icon={<Lock className="h-5 w-5 text-gray-400" />}>
              <input
                id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={`${fieldClass(false)} pr-10`}
              />
              <button
                type="button" onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </IconInput>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {ruleResults.map((rule) => (
                <li
                  key={rule.id}
                  className={`flex items-center gap-1.5 text-xs ${rule.passed ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {rule.passed ? <CheckCircle2 size={14} /> : <Circle size={14} />} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm password
            </label>
            <IconInput icon={<Lock className="h-5 w-5 text-gray-400" />}>
              <input
                id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClass(confirmPassword.length > 0 && !passwordsMatch)}
              />
            </IconInput>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-green-700 transition-colors disabled:opacity-70"
          >
            {isLoading && <Loader2 className="animate-spin mr-2" size={18} />}
            {isLoading ? 'Activating...' : 'Activate account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already activated?{' '}
          <Link to="/login" className="font-medium text-brand-primary hover:text-green-700 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ActivateAccount;
