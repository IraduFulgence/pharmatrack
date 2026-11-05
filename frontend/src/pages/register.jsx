import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Building2, Phone, Mail, Lock, Eye, EyeOff, 
  Check, FileText, UploadCloud, X, AlertCircle, Loader2 
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import {authService} from '../services/authentication';

const Register = () => {

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [apierror, setApiError] = useState(null);
  
  // State to hold form data
  const [formData, setFormData] = useState({
    accountType: 'patient',
    fullName: '',
    gender: 'Male',
    dateOfBirth:'',
    phone: '',
    email: '',
    password: '',
    PharmacyName:'',
    tinNumber: '',
    licenseFile: null,
    licensePreview: null,
    rdbFile: null,
    rdbPreview: null,
  });

  const [errors, setErrors] = useState({});

  // Determine max steps based on account type
  const maxStep = formData.accountType === 'pharmacy' ? 5 : 3;

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  // Update form data state
  const updateData = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // Handle File Uploads
    const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview URL for images
      const previewUrl = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : null;

      
      setFormData(prev => {
        if (type === 'license') {
          return { ...prev, licenseFile: file, licensePreview: previewUrl };
        } else if (type === 'rdb') {
          return { ...prev, rdbFile: file, rdbPreview: previewUrl };
        }
        return prev;
      });

      
      if (type === 'license' && errors.licenseFile) {
        setErrors({ ...errors, licenseFile: null });
      }
      if (type === 'rdb' && errors.rdbFile) {
        setErrors({ ...errors, rdbFile: null });
      }
    }
  };

  // Remove file
  const removeFile = (type) => {
    setFormData(prev => {
      if (type === 'license') {
        return { ...prev, licenseFile: null, licensePreview: null };
      } else if (type === 'rdb') {
        return { ...prev, rdbFile: null, rdbPreview: null };
      }
      return prev;
    });
  };

  // Step Validation before moving forward
  const validateStep = () => {
    const newErrors = {};

    if (step === 2) {
      if (!formData.fullName.trim()) newErrors.fullName = "Name is required";
      if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    }

    if (step === 3) {
      if (!formData.email.trim()) newErrors.email = "Email is required";
      if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    }

    if (step === 4 && formData.accountType === 'pharmacy') {
      // Validate TIN is exactly 9 digits
      const tinRegex = /^\d{9}$/;
      if (!tinRegex.test(formData.tinNumber)) {
        newErrors.tinNumber = "TIN must be exactly 9 digits";
      }
    }

    if (step === 5 && formData.accountType === 'pharmacy') {
      if (!formData.licenseFile) newErrors.licenseFile = "Pharmacy License is required";
      if (!formData.rdbFile) newErrors.rdbFile = "RDB Certificate is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;

    if (step < maxStep) {
      handleNext();
      return;
    } 
    setIsLoading(true);
    setApiError(null);
    try {
      // we check now if the user is patient
      if(formData.accountType === 'patient'){
        await authService.registerPatient({
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth,
          phoneNumber: formData.phone,
          email: formData.email,
          gender: formData.gender,
          password: formData.password
        });
        alert("Patient account created");
        navigate('/login');      
      }
      else{

        const data = new FormData();
        data.append('pharmacyName', formData.pharmacyName);
        data.append('phoneNumber', formData.phone);
        data.append('email', formData.email);
        data.append('tin', formData.tinNumber);
        data.append('password', formData.password);
        
        // Append files
        if (formData.licenseFile) data.append('pharmacyCertificate', formData.licenseFile);
        if (formData.rdbFile) data.append('rdbCertificate', formData.rdbFile);

        await authService.registerPharmacy(data);
        
        alert("Pharmacy registered! Your account is pending verification. Please log in.");
        navigate('/login')
      }
    } catch (error) {
      setApiError(error.message);
    }
    finally{
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    console.log("Google Sign-Up Success:", credentialResponse);
  };

  // Progress Bar calculation
  const progressWidth = ((step - 1) / (maxStep - 1)) * 100;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-200 w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-1xl shadow-xl border border-gray-100 dark:border-gray-800">
        
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
                {t('auth.step', 'Step')} {step} {t('auth.of', 'of')} {maxStep}
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
          
          {/* Account Type */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('auth.registeringAs', 'I am registering as a:')}
              </label>
              
              <div 
                onClick={() => {
                  updateData('accountType', 'patient');
                  // Reset pharmacy fields if switching back to patient
                  if (step === 1) {
                    setFormData(prev => ({ ...prev, accountType: 'patient', tinNumber: '', licenseFile: null, rdbFile: null }));
                  }
                }}
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
                onClick={() => setFormData(prev => ({ ...prev, accountType: 'pharmacy' }))}
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

          {/* Name and Phone */}
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
                    value={formData.fullName}
                    onChange={(e) => updateData('fullName', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white ${errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder={formData.accountType === 'pharmacy' ? 'e.g. Kigali Care Pharmacy' : 'e.g. John Doe'}
                  />
                </div>
                {errors.fullName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.fullName}</p>}
              </div>
              {formData.accountType === 'patient' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.dateOfBirth', 'Date of Birth')}
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateData('dateOfBirth', e.target.value)}
                      className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    />
                    {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.dateOfBirth}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.gender', 'Gender')}
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateData('gender', e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      
                    </select>
                  </div>
                </div>
              )}
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
                    value={formData.phone}
                    onChange={(e) => updateData('phone', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="+250 78..."
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.phone}</p>}
              </div>
            </div>
          )}

          {/* Email and Password */}
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
                    value={formData.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.email}</p>}
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
                    value={formData.password}
                    onChange={(e) => updateData('password', e.target.value)}
                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
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
                {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.password}</p>}
              </div>
            </div>
          )}

          {/* Pharmacy Details (TIN) - Only for Pharmacy */}
          {step === 4 && formData.accountType === 'pharmacy' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.tinNumber', 'TIN Number (9 digits)')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    maxLength="9"
                    value={formData.tinNumber}
                    onChange={(e) => {
                      // Only allow numbers
                      const val = e.target.value.replace(/\D/g, '');
                      updateData('tinNumber', val);
                    }}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-900 dark:text-white ${errors.tinNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="e.g. 123456789"
                  />
                </div>
                {errors.tinNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.tinNumber}</p>}
              </div>
            </div>
          )}

          {/* Pharmacy Documents - Only for Pharmacy */}
          {step === 5 && formData.accountType === 'pharmacy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              
              {/* Upload License */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.uploadLicense', 'Upload Pharmacy License')}
                </label>
                {!formData.licensePreview && !formData.licenseFile ? (
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative ${errors.licenseFile ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-700'}`}>
                    <input type="file" onChange={(e) => handleFileUpload(e, 'license')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" />
                    <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.clickToUpload', 'Click to upload')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('auth.supportedFormats', 'PNG, JPG or PDF')}</p>
                  </div>
                ) : (
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-4">
                    {formData.licensePreview ? (
                      <img src={formData.licensePreview} alt="License Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500"><FileText size={24} /></div>
                    )}
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{formData.licenseFile?.name}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><Check size={12}/> Ready to upload</p>
                    </div>
                    <button type="button" onClick={() => removeFile('license')} className="p-2 text-red-500 bg-white dark:bg-gray-900 rounded-full shadow-sm hover:bg-red-50"><X size={16} /></button>
                  </div>
                )}
                {errors.licenseFile && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.licenseFile}</p>}
              </div>

              {/* Upload RDB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.uploadRdb', 'Upload RDB Certificate')}
                </label>
                {!formData.rdbPreview && !formData.rdbFile ? (
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative ${errors.rdbFile ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-700'}`}>
                    <input type="file" onChange={(e) => handleFileUpload(e, 'rdb')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" />
                    <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.clickToUpload', 'Click to upload')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('auth.supportedFormats', 'PNG, JPG or PDF')}</p>
                  </div>
                ) : (
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-4">
                    {formData.rdbPreview ? (
                      <img src={formData.rdbPreview} alt="RDB Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500"><FileText size={24} /></div>
                    )}
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{formData.rdbFile?.name}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><Check size={12}/> Ready to upload</p>
                    </div>
                    <button type="button" onClick={() => removeFile('rdb')} className="p-2 text-red-500 bg-white dark:bg-gray-900 rounded-full shadow-sm hover:bg-red-50"><X size={16} /></button>
                  </div>
                )}
                {errors.rdbFile && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.rdbFile}</p>}
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
      disabled={isLoading}
      className={`flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-green-700 transition-colors disabled:opacity-70 ${step > 1 ? 'w-2/3' : 'w-full'}`}
    >
      {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
      {isLoading ? 'Processing...' : (step === maxStep ? t('auth.createAccountBtn', 'Create Account') : t('auth.continue', 'Continue'))}
    </button>
          </div>

        </form>

        {/* OAuth Section */}
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