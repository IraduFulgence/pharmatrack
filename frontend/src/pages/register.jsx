import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Building2, Phone, Mail, Lock, Eye, EyeOff, 
  Check, FileText, UploadCloud, X, AlertCircle, Loader2,
  ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authentication'; 

// Define the steps for the Pharmacy Wizard
const PHARMACY_STEPS = [
  { id: 1, title: 'Account Type', icon: <Building2 size={20} />, desc: 'How will you use Pharmatrack?' },
  { id: 2, title: 'Basic Info', icon: <User size={20} />, desc: 'Your name and phone' },
  { id: 3, title: 'Security', icon: <Lock size={20} />, desc: 'Email and password' },
  { id: 4, title: 'Business Details', icon: <FileText size={20} />, desc: 'TIN and registration' },
  { id: 5, title: 'Documents', icon: <UploadCloud size={20} />, desc: 'Upload legal certificates' },
  { id: 6, title: 'Review', icon: <CheckCircle2 size={20} />, desc: 'Confirm your details' },
];

const Register = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apierror, setApiError] = useState(null);
  
  // State to hold form data
  const [formData, setFormData] = useState({
    accountType: 'patient',
    fullName: '',
    gender: 'Male',
    dateOfBirth: '',
    phone: '',
    email: '',
    password: '',
    pharmacyName: '',
    tinNumber: '',
    
    licenseFile: null,
    licensePreview: null,
    rdbFile: null,
    rdbPreview: null,
  });

  const [errors, setErrors] = useState({});

  // Determine max steps (5 for Pharmacy, 3 for Patient)
  const maxStep = formData.accountType === 'pharmacy' ? 6 : 3;
  const isPharmacy = formData.accountType === 'pharmacy';

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const updateData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      setFormData((prev) => {
        if (type === 'license') return { ...prev, licenseFile: file, licensePreview: previewUrl };
        else if (type === 'rdb') return { ...prev, rdbFile: file, rdbPreview: previewUrl };
        return prev;
      });
      if (type === 'license' && errors.licenseFile) setErrors((prev) => ({ ...prev, licenseFile: null }));
      if (type === 'rdb' && errors.rdbFile) setErrors((prev) => ({ ...prev, rdbFile: null }));
    }
  };

  const removeFile = (type) => {
    setFormData((prev) => {
      if (type === 'license') return { ...prev, licenseFile: null, licensePreview: null };
      else if (type === 'rdb') return { ...prev, rdbFile: null, rdbPreview: null };
      return prev;
    });
  };

 
  const validateStep = () => {
    const newErrors = {};

    if (step === 2) {
      if (isPharmacy) {
        if (!formData.pharmacyName.trim()) newErrors.pharmacyName = "Pharmacy Name is required";
      } else {
        if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      }
      
      if (!/^\+[1-9]\d{1,14}$/.test(formData.phone)) {
        newErrors.phone = "Phone must be in international format (e.g., +250788123456)";
      }
    }

    if (step === 3) {
      if (!formData.email.trim()) newErrors.email = "Email is required";
      if (!isPharmacy && !formData.password) newErrors.password = "Password is required";
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~]{8,}$/;
      if (formData.password && !passwordRegex.test(formData.password)) {
        newErrors.password = "Password must be 8+ chars with uppercase, lowercase, number, and special char.";
      }
      if (!formData.password) newErrors.password = "Password is required";
    }

    if (step === 4 && isPharmacy) {
      if (!formData.tinNumber) newErrors.tinNumber = "TIN Number is required";
      else if (!/^\d{9}$/.test(formData.tinNumber)) newErrors.tinNumber = "TIN must be exactly 9 digits";
      
    }

    if (step === 5 && isPharmacy) {
      if (!formData.licenseFile) newErrors.licenseFile = "Pharmacy License is required";
      if (!formData.rdbFile) newErrors.rdbFile = "RDB Certificate is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep()) return;

    // If not on final step, go next
    if (step < maxStep) {
      handleNext();
      return;
    } 

    // Final Submission
    setIsLoading(true);
    setApiError(null);

    try {
      if (!isPharmacy) {
        await authService.registerPatient({
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth,
          phoneNumber: formData.phone,
          email: formData.email,
          gender: formData.gender,
          password: formData.password
        });
        alert("Patient account created successfully!");
        navigate('/login');      
      } else {
        const data = new FormData();
        data.append('pharmacyName', formData.pharmacyName);
        data.append('phoneNumber', formData.phone);
        data.append('email', formData.email);
        data.append('tin', formData.tinNumber);
        data.append('password', formData.password);
        
        if (formData.licenseFile) data.append('pharmacyCertificate', formData.licenseFile);
        if (formData.rdbFile) data.append('rdbCertificate', formData.rdbFile);

        await authService.registerPharmacy(data);
        
        alert("Pharmacy registered! Your account is pending verification. Please log in.");
        navigate('/login');
      }
    } catch (error) {
      setApiError(error.message);
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  // Progress Bar
  const progressWidth = ((step - 1) / (maxStep - 1)) * 100;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      
      {/* Left Side: The Wizard Form */}
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
          
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {isPharmacy ? 'Register Your Pharmacy' : 'Create an Account'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('auth.haveAccount', 'Already have an account?')}{' '}
              <Link to="/login" className="font-medium text-[#007a55] hover:underline">
                {t('auth.loginHere', 'Log in')}
              </Link>
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#007a55] bg-[#e6f4ef]">
                  {isPharmacy ? `Step ${step} of ${PHARMACY_STEPS.length}` : `Step ${step} of 3`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-[#007a55]">
                  {Math.round(progressWidth)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
              <div style={{ width: `${progressWidth}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#007a55] transition-all duration-300"></div>
            </div>
          </div>

          {/* Main Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            
            {/* ACCOUNT TYPE */}
            {step === 1 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('auth.registeringAs', 'I am registering as a:')}
                </label>
                
                <div 
                  onClick={() => { updateData('accountType', 'patient'); setStep(2); }}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${!isPharmacy ? 'border-[#007a55] bg-[#e6f4ef]' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}
                >
                  <div className={`p-3 rounded-full ${!isPharmacy ? 'bg-[#007a55] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Patient</h3>
                    <p className="text-xs text-gray-500">I want to find and order medicine.</p>
                  </div>
                  {!isPharmacy && <Check className="ml-auto text-[#007a55]" />}
                </div>

                <div 
                  onClick={() => updateData('accountType', 'pharmacy')}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all ${isPharmacy ? 'border-[#007a55] bg-[#e6f4ef]' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}
                >
                  <div className={`p-3 rounded-full ${isPharmacy ? 'bg-[#007a55] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Pharmacy Partner</h3>
                    <p className="text-xs text-gray-500">I want to manage stock and fulfill orders.</p>
                  </div>
                  {isPharmacy && <Check className="ml-auto text-[#007a55]" />}
                </div>
              </div>
            )}

            {/* NAME & PHONE */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isPharmacy ? 'Pharmacy Name' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={isPharmacy ? formData.pharmacyName : formData.fullName}
                    onChange={(e) => updateData(isPharmacy ? 'pharmacyName' : 'fullName', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.pharmacyName || errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder={isPharmacy ? 'e.g. Divine Pharmacy' : 'e.g. John Doe'}
                  />
                  {(errors.pharmacyName || errors.fullName) && <p className="text-red-500 text-xs mt-1">{errors.pharmacyName || errors.fullName}</p>}
                </div>

                {!isPharmacy && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateData('dateOfBirth', e.target.value)}
                        className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => updateData('gender', e.target.value)}
                        className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateData('phone', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="+250788123456"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>
            )}

            {/* EMAIL & PASSWORD */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Create Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => updateData('password', e.target.value)}
                      className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
              </div>
            )}

            {/* BUSINESS DETAILS */}
            {step === 4 && isPharmacy && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TIN Number (9 digits)</label>
                  <input
                    type="text"
                    maxLength="9"
                    value={formData.tinNumber}
                    onChange={(e) => updateData('tinNumber', e.target.value.replace(/\D/g, ''))}
                    className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.tinNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="e.g. 123456789"
                  />
                  {errors.tinNumber && <p className="text-red-500 text-xs mt-1">{errors.tinNumber}</p>}
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Physical Location Address</label>
                  <input
                    type="text"
                    value={formData.locationAddress}
                    onChange={(e) => updateData('locationAddress', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.locationAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="e.g. Remera, KG 536 St"
                  />
                  {errors.locationAddress && <p className="text-red-500 text-xs mt-1">{errors.locationAddress}</p>}
                </div> */}
              </div>
            )}

            {/*DOCUMENTS */}
            {step === 5 && isPharmacy && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                  Please upload clear copies of your Pharmacy License and RDB Certificate. These will be reviewed by our team before your account is activated.
                </div>
                
                {/* License Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pharmacy License</label>
                  {!formData.licensePreview && !formData.licenseFile ? (
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer relative ${errors.licenseFile ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input type="file" onChange={(e) => handleFileUpload(e, 'license')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" />
                      <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-semibold text-gray-700">Click to upload License</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG or PDF</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border">
                      {formData.licensePreview ? <img src={formData.licensePreview} className="w-12 h-12 object-cover rounded" /> : <FileText size={24} className="text-gray-500" />}
                      <p className="text-sm font-semibold truncate flex-grow">{formData.licenseFile?.name}</p>
                      <button type="button" onClick={() => removeFile('license')} className="text-red-500"><X size={16}/></button>
                    </div>
                  )}
                  {errors.licenseFile && <p className="text-red-500 text-xs mt-1">{errors.licenseFile}</p>}
                </div>

                {/* RDB Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RDB Certificate</label>
                  {!formData.rdbPreview && !formData.rdbFile ? (
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer relative ${errors.rdbFile ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input type="file" onChange={(e) => handleFileUpload(e, 'rdb')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" />
                      <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-semibold text-gray-700">Click to upload RDB</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG or PDF</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border">
                      {formData.rdbPreview ? <img src={formData.rdbPreview} className="w-12 h-12 object-cover rounded" /> : <FileText size={24} className="text-gray-500" />}
                      <p className="text-sm font-semibold truncate flex-grow">{formData.rdbFile?.name}</p>
                      <button type="button" onClick={() => removeFile('rdb')} className="text-red-500"><X size={16}/></button>
                    </div>
                  )}
                  {errors.rdbFile && <p className="text-red-500 text-xs mt-1">{errors.rdbFile}</p>}
                </div>
              </div>
            )}

            {/* REVIEW  */}
            {step === 6 && isPharmacy && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-[#e6f4ef] p-4 rounded-xl border border-[#007a55]/30">
                  <h3 className="text-lg font-bold text-[#007a55] flex items-center gap-2 mb-4">
                    <CheckCircle2 size={20} /> Review Your Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs uppercase">Pharmacy Name</p>
                      <p className="font-semibold text-gray-900">{formData.pharmacyName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase">TIN Number</p>
                      <p className="font-semibold text-gray-900">{formData.tinNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase">Phone</p>
                      <p className="font-semibold text-gray-900">{formData.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase">Email</p>
                      <p className="font-semibold text-gray-900">{formData.email}</p>
                    </div>
                    {/* <div className="col-span-2">
                      <p className="text-gray-500 text-xs uppercase">Location</p>
                      <p className="font-semibold text-gray-900">{formData.locationAddress}</p>
                    </div> */}
                    <div className="col-span-2 mt-2">
                      <p className="text-gray-500 text-xs uppercase mb-1">Uploaded Documents</p>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1"><FileText size={12}/> License</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1"><FileText size={12}/> RDB</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">By clicking "Submit Registration", you confirm that all provided information is accurate.</p>
              </div>
            )}

            {/* API Error Display */}
            {apierror && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {apierror}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isLoading}
                  className="w-1/3 flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className={`flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-[#007a55] hover:bg-[#006645] transition-colors disabled:opacity-70 ${step > 1 ? 'w-2/3' : 'w-full'}`}
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                {isLoading ? 'Processing...' : (step === maxStep ? 'Submit Registration' : 'Continue')}
                {!isLoading && step < maxStep && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          {/* OAuth only*/}
          {step === 1 && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">Or sign up with</span>
                </div>
              </div>
              <div className="mt-6 flex justify-center w-full">
                <GoogleLogin
                  onSuccess={() => console.log('Google Auth Not Implemented')}
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

      {/* Step Explainer */}
      {isPharmacy && (
        <div className="hidden lg:flex w-96 bg-gray-100 dark:bg-gray-950 p-8 flex-col justify-center border-l border-gray-200 dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Registration Guide</h3>
          <div className="space-y-6">
            {PHARMACY_STEPS.map((s) => (
              <div key={s.id} className="flex gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step === s.id ? 'bg-[#007a55] text-white' : 
                  step > s.id ? 'bg-green-100 text-[#007a55]' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.id ? <Check size={20} /> : s.id}
                </div>
                <div>
                  <p className={`font-bold text-sm ${step === s.id ? 'text-[#007a55]' : 'text-gray-900 dark:text-gray-300'}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;