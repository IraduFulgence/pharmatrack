import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, FileText, UploadCloud, 
  ArrowRight, ArrowLeft, CheckCircle2, X
} from 'lucide-react';

const CreatePharmacyProfile = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // State for the creation form
  const [formData, setFormData] = useState({
    name: '',
    regNumber: '',
    physicalAddress: '',
    coordinates: { lat: -1.9565, lng: 30.1119 }, 
    documents: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newDoc = {
        id: Date.now(),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      };
      setFormData({ ...formData, documents: [...formData.documents, newDoc] });
    }
  };

  const removeDocument = (id) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter(doc => doc.id !== id)
    });
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Profile Created:", formData);
    
    
    alert("Pharmacy Profile Created Successfully!");
    navigate('/dashboard'); 
  };

  const progressWidth = ((step - 1) / 2) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8">
      
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Set Up Your Pharmacy</h1>
        <p className="text-gray-500 dark:text-gray-400">You need to create a profile before you can start managing inventory and orders.</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex mb-2 items-center justify-between">
          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#007a55] bg-[#e6f4ef] dark:bg-[#007a55]/20 dark:text-[#34d399]">
            Step {step} of 3
          </span>
          <span className="text-xs font-semibold inline-block text-[#007a55]">
            {Math.round(progressWidth)}%
          </span>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
          <div style={{ width: `${progressWidth}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#007a55] transition-all duration-300"></div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8">
          
          {/* Identity */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#e6f4ef] dark:bg-[#007a55]/20 rounded-lg text-[#007a55]">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pharmacy Identity</h2>
                  <p className="text-sm text-gray-500">Enter your official registration details.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Name</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] text-gray-900 dark:text-white"
                  placeholder="e.g. Ineza Pharmacy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RDB Registration Number</label>
                <input 
                  type="text" 
                  name="regNumber"
                  required
                  value={formData.regNumber}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] text-gray-900 dark:text-white"
                  placeholder="e.g. RDB-1029-4492"
                />
              </div>
            </div>
          )}

          {/* Location */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#e6f4ef] dark:bg-[#007a55]/20 rounded-lg text-[#007a55]">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Physical Location</h2>
                  <p className="text-sm text-gray-500">Where can patients find you?</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Physical Address</label>
                <input 
                  type="text" 
                  name="physicalAddress"
                  required
                  value={formData.physicalAddress}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] text-gray-900 dark:text-white"
                  placeholder="e.g. Remera, KG 536 St"
                />
              </div>

              {/* Location Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.coordinates.lat}
                    onChange={(e) => setFormData({...formData, coordinates: {...formData.coordinates, lat: parseFloat(e.target.value)}})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.coordinates.lng}
                    onChange={(e) => setFormData({...formData, coordinates: {...formData.coordinates, lng: parseFloat(e.target.value)}})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/*  Documents */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#e6f4ef] dark:bg-[#007a55]/20 rounded-lg text-[#007a55]">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verification Documents</h2>
                  <p className="text-sm text-gray-500">Upload your operating license and pharmacist registration.</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <UploadCloud size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload documents</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max. 10MB)</p>
              </div>

              {/* List of uploaded files */}
              {formData.documents.length > 0 && (
                <div className="space-y-3 mt-4">
                  {formData.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.size}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center justify-center gap-2 w-1/3 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft size={18} /> Back
              </button>
            )}
            
            <button
              type={step === 3 ? "submit" : "button"}
              onClick={step < 3 ? handleNext : undefined}
              className={`flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#007a55] hover:bg-[#006645] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007a55] transition-colors ${step > 1 ? 'w-2/3' : 'w-full'}`}
            >
              {step === 3 ? (
                <>Complete Setup <CheckCircle2 size={18} /></>
              ) : (
                <>Next Step <ArrowRight size={18} /></>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreatePharmacyProfile;