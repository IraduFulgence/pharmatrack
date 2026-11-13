import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Building2, Phone, Mail, Lock, Eye, EyeOff, 
  Check, FileText, UploadCloud, X, AlertCircle, Loader2,
   ArrowRight, ArrowLeft, CheckCircle2, MapPin, Navigation
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authentication'; 

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
  
  // Location & Warning Modal State
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

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
    locationAddress: '',
    latitude: null,   
    longitude: null,  
    licenseFile: null,
    licensePreview: null,
    rdbFile: null,
    rdbPreview: null,
  });

  const [errors, setErrors] = useState({});

  const maxStep = formData.accountType === 'pharmacy' ? 6 : 3;
  const isPharmacy = formData.accountType === 'pharmacy';

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const updateData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Get current GPS Location
  const handleGetCurrentLocation = () => {
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setShowLocationWarning(false); 

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateData('latitude', position.coords.latitude);
        updateData('longitude', position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        setLocationError("Failed to get your location. Please allow location access in your browser.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~]{8,}$/;
      if (!formData.password) newErrors.password = "Password is required";
      else if (!passwordRegex.test(formData.password)) {
        newErrors.password = "Password must be 8+ chars with uppercase, lowercase, number, and special char.";
      }
    }

    if (step === 4 && isPharmacy) {
      if (!formData.tinNumber) newErrors.tinNumber = "TIN Number is required";
      else if (!/^\d{9}$/.test(formData.tinNumber)) newErrors.tinNumber = "TIN must be exactly 9 digits";
      if (!formData.locationAddress.trim()) newErrors.locationAddress = "Physical address is required";
      
      // Force location capture
      if (!formData.latitude || !formData.longitude) {
        newErrors.coordinates = "Please click 'Use Current Location' to register your exact GPS position.";
      }
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

    if (step < maxStep) {
      handleNext();
      return;
    } 

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
        data.append('locationAddress', formData.locationAddress);
        
        // Append coordinates 
        if (formData.latitude) data.append('latitude', formData.latitude.toString());
        if (formData.longitude) data.append('longitude', formData.longitude.toString());
        
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

  const progressWidth = ((step - 1) / (maxStep - 1)) * 100;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full space-y-8 bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
          
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

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Physical Location Address</label>
                  <input
                    type="text"
                    value={formData.locationAddress}
                    onChange={(e) => updateData('locationAddress', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:bg-gray-900 dark:text-white ${errors.locationAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="e.g. Remera, KG 536 St"
                  />
                  {errors.locationAddress && <p className="text-red-500 text-xs mt-1">{errors.locationAddress}</p>}
                </div>

                
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GPS Coordinates (Required)</label>
                  
                  {/* Show the button OR the captured coordinates */}
                  {!formData.latitude ? (
                    <button
                      type="button"
                      onClick={() => setShowLocationWarning(true)}
                      disabled={isLocating}
                      className="w-full flex justify-center items-center gap-2 py-3 border-2 border-dashed border-[#007a55] rounded-xl text-[#007a55] hover:bg-[#e6f4ef] transition-colors font-semibold"
                    >
                      {isLocating ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                      {isLocating ? 'Getting GPS...' : 'Use Current Location'}
                    </button>
                  ) : (
                    <div className="p-3 bg-[#e6f4ef] border border-[#007a55]/30 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#007a55] uppercase">Location Captured</p>
                        <p className="text-sm font-mono text-gray-900 mt-0.5">Lat: {formData.latitude.toFixed(5)}, Lng: {formData.longitude.toFixed(5)}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { updateData('latitude', null); updateData('longitude', null); }}
                        className="text-red-500 text-xs font-semibold hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {locationError && <p className="text-red-500 text-xs mt-2">{locationError}</p>}
                  {errors.coordinates && <p className="text-red-500 text-xs mt-2">{errors.coordinates}</p>}
                </div>
              </div>
            )}

            
            {step === 5 && isPharmacy && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                  Please upload clear copies of your Pharmacy License and RDB Certificate.
                </div>
                
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
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs uppercase">Location</p>
                      <p className="font-semibold text-gray-900">{formData.locationAddress}</p>
                    </div>
                    
                    
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs uppercase">GPS Coordinates</p>
                      <p className="font-mono text-xs text-gray-900">
                        Lat: {formData.latitude?.toFixed(5)}, Lng: {formData.longitude?.toFixed(5)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {apierror && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {apierror}
              </div>
            )}

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
        </div>
      </div>

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

      
      {showLocationWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 text-center border-b border-amber-100 dark:border-amber-900/30">
              <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <MapPin size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Location Warning</h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm leading-relaxed mb-4">
                You are about to capture your <strong>GPS coordinates</strong>. 
              </p>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 mb-4">
                 <strong>Important:</strong> You must be <strong>physically at the pharmacy location</strong> right now. 
                The captured location will be visible on the map to all patients looking for your pharmacy.
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs text-center">
                If you are not at the pharmacy, cancel and complete this step later.
              </p>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => setShowLocationWarning(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGetCurrentLocation}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold hover:bg-[#006645] transition-colors"
              >
                <Navigation size={16} /> I am here, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;