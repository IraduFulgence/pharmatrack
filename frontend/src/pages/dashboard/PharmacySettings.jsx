import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Phone, Mail, FileText, ShieldCheck, Eye, 
  Loader2, AlertCircle, Save, CheckCircle2, Calendar, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { authService } from '../../services/authentication';
import DocumentViewer from '../../components/admin/DocumentViewer';

// Fix for default Leaflet marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Sub-component to update map center when coordinates change
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

// Sub-component that handles map clicks to move the pin
const LocationPicker = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const PharmacySettings = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    pharmacyName: '',
    locationAddress: '',
    latitude: -1.9565,
    longitude: 30.1119,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getProfile();
      setProfile(response.data);
      
      setFormData({
        pharmacyName: response.data.pharmacyName || '',
        locationAddress: response.data.locationAddress || '',
        latitude: Number(response.data.latitude) || -1.9565,
        longitude: Number(response.data.longitude) || 30.1119,
      });
    } catch (err) {
      setError(err.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'latitude' || name === 'longitude' ? Number(value) : value 
    }));
  };

  // Get browser GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsLocating(false);
      },
      (err) => {
        alert("Unable to retrieve your location. Please allow location access.");
        setIsLocating(false);
      }
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // In a real app, this would be a PATCH request:
      // await authService.updateProfile(formData);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
      
      setProfile(prev => ({ ...prev, ...formData }));
      setSaveSuccess(true);
      setIsEditing(false);
      
      // Sync local storage so header/sidebar reflect the new name instantly
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...formData }));

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-[#007a55]" size={40} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  const isApproved = profile?.verificationStatus === 'APPROVED';
  const mapCenter = [formData.latitude, formData.longitude];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pharmacy Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your partner profile, location, and documents.</p>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold text-sm hover:bg-[#006645] transition-colors shadow-sm"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold text-sm hover:bg-[#006645] transition-colors disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 size={18} /> Profile updated successfully.
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Verification Banner */}
      {isApproved && (
        <div className="bg-gradient-to-r from-[#007a55] to-[#00a36c] rounded-2xl p-6 text-white shadow-lg flex items-center gap-6">
          <div className="p-3 bg-white/20 rounded-full">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Verified Partner</h2>
            <p className="text-sm text-white/80 mt-1">
              Your pharmacy has been approved. 
              {profile.verifiedAt && ` Partner since ${new Date(profile.verifiedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: General Info & Documents */}
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={20} className="text-[#007a55]" /> General Information
              </h3>
            </div>
            <div className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Name</label>
                {isEditing ? (
                  <input 
                    type="text" name="pharmacyName"
                    value={formData.pharmacyName} onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
                  />
                ) : (
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{profile?.pharmacyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <MapPin size={14} /> Location Address
                </label>
                {isEditing ? (
                  <input 
                    type="text" name="locationAddress"
                    value={formData.locationAddress} onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
                  />
                ) : (
                  <p className="text-base text-gray-900 dark:text-white">{profile?.locationAddress || 'Not set'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail size={14} className="text-gray-400"/> {profile?.email}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Phone size={14} className="text-gray-400"/> {profile?.phoneNumber}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">TIN</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={14} className="text-gray-400"/> {profile?.tin || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</label>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                    isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {profile?.verificationStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-[#007a55]" /> Submitted Documents
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <button 
                onClick={() => setViewingDoc({ type: 'pharmacy', title: 'Pharmacy License' })}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#007a55] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  {profile?.hasPharmacyCertificate 
                    ? <CheckCircle2 size={16} className="text-green-500" /> 
                    : <AlertCircle size={16} className="text-orange-500" />
                  }
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Pharmacy License</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 group-hover:underline text-xs font-semibold">
                  <Eye size={14} /> View
                </div>
              </button>

              <button 
                onClick={() => setViewingDoc({ type: 'rdb', title: 'RDB Certificate' })}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#007a55] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  {profile?.hasRdbCertificate 
                    ? <CheckCircle2 size={16} className="text-green-500" /> 
                    : <AlertCircle size={16} className="text-orange-500" />
                  }
                  <span className="text-sm font-medium text-gray-900 dark:text-white">RDB Certificate</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 group-hover:underline text-xs font-semibold">
                  <Eye size={14} /> View
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Map & Activity */}
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin size={20} className="text-[#007a55]" /> Physical Location
                </h3>
                {isEditing && (
                  <p className="text-xs text-[#007a55] font-medium mt-1 animate-pulse">
                    👆 Click on the map or drag the pin to update
                  </p>
                )}
              </div>
              
              {isEditing && (
                <button 
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  {isLocating ? 'Locating...' : 'Use My GPS'}
                </button>
              )}
            </div>
            
            {/* Map Container */}
            <div className="h-[300px] w-full relative z-0">
              <MapContainer 
                center={mapCenter} 
                zoom={15} 
                scrollWheelZoom={false} 
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <Marker 
                  position={mapCenter}
                  draggable={isEditing}
                  eventHandlers={{
                    dragend: (e) => {
                      const { lat, lng } = e.target.getLatLng();
                      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    },
                  }}
                >
                  <Popup>{formData.pharmacyName || 'Pharmacy Location'}</Popup>
                </Marker>

                {/* Only allow map click updates when editing */}
                {isEditing && (
                  <LocationPicker 
                    onPick={(lat, lng) => {
                      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    }} 
                  />
                )}

                <MapUpdater center={mapCenter} />
              </MapContainer>
            </div>

            {/* Coordinates Display */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coordinates</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                  {isEditing ? (
                    <input 
                      type="number" step="any" name="latitude"
                      value={formData.latitude} onChange={handleInputChange}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    />
                  ) : (
                    <p className="text-sm font-mono text-gray-900 dark:text-white">{formData.latitude.toFixed(5)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                  {isEditing ? (
                    <input 
                      type="number" step="any" name="longitude"
                      value={formData.longitude} onChange={handleInputChange}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    />
                  ) : (
                    <p className="text-sm font-mono text-gray-900 dark:text-white">{formData.longitude.toFixed(5)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Meta */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account Activity</h3>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Joined On</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {isApproved && profile?.verifiedAt && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Approved On</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(profile.verifiedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewer 
          pharmacyId={profile?.id}
          docType={viewingDoc.type}
          title={viewingDoc.title}
          onClose={() => setViewingDoc(null)}
          isAdmin={false}  
        />
      )}
    </div>
  );
};

export default PharmacySettings;