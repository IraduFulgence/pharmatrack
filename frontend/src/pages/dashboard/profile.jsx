import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Building2, FileBadge, UploadCloud, 
  CheckCircle2, FileText, Trash2 
} from 'lucide-react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const PharmacyProfile = () => {
  // Mock data for the profile data
  const [profile, setProfile] = useState({
    name: 'Ineza Pharmacy',
    regNumber: 'RDB-1029-4492',
    physicalAddress: 'Remera, KG 536 St',
    coordinates: { lat: -1.9565, lng: 30.1119 }, 
    certificates: [
      { id: 1, name: 'Pharmacy_License_2024.pdf', size: '2.4 MB' },
      { id: 2, name: 'Pharmacist_Registration.pdf', size: '1.1 MB' },
    ]
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
    
  };

  // Mock file upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newCert = {
        id: Date.now(),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
      };
      setFormData({ ...formData, certificates: [...formData.certificates, newCert] });
    }
  };

  const handleDeleteCert = (id) => {
    setFormData({ 
      ...formData, 
      certificates: formData.certificates.filter(cert => cert.id !== id) 
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
    
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pharmacy Profile</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your location, registration, and legal documents.</p>
        </div>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm text-white ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#007a55] hover:bg-[#006645]'}`}
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
       
        <div className="lg:col-span-1 space-y-6">
          
      
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-[#007a55]" /> Identity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <FileBadge size={16} /> Registration Number (RDB)
                </label>
                <input 
                  type="text" 
                  name="regNumber"
                  value={formData.regNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-[#007a55]" /> Physical Location
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address (e.g. Remera, KG 536 St)</label>
                <input 
                  type="text" 
                  name="physicalAddress"
                  value={formData.physicalAddress}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                  <input 
                    type="text" 
                    value={formData.coordinates.lat}
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                  <input 
                    type="text" 
                    value={formData.coordinates.lng}
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map & Documents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Map Container */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 shadow-sm h-[350px] relative z-0">
            
             <MapContainer 
                center={[profile.coordinates.lat, profile.coordinates.lng]} 
                zoom={15} 
                scrollWheelZoom={false} 
                className="w-full h-full rounded-xl"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[profile.coordinates.lat, profile.coordinates.lng]}>
                  <Popup>
                    <strong>{profile.name}</strong> <br /> {profile.physicalAddress}
                  </Popup>
                </Marker>
              </MapContainer>
          </div>

          {/* Documents Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Certificates & Documents</h3>
                <p className="text-sm text-gray-500">Upload your operating license and pharmacist registration.</p>
              </div>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <UploadCloud size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max. 10MB)</p>
            </div>

            {/* Uploaded Files List */}
            <div className="mt-6 space-y-3">
              {formData.certificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{cert.name}</p>
                      <p className="text-xs text-gray-500">{cert.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                    {isEditing && (
                      <button 
                        onClick={() => handleDeleteCert(cert.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PharmacyProfile;