import React, { useState } from 'react';
import { 
  Search, Shield, Plus, X, Mail, Phone, 
  UserPlus, Loader2, AlertCircle, ShieldAlert 
} from 'lucide-react';

const ManageAdmins= () => {
  // 1. Mock Data
  const [admins, setAdmins] = useState([
    { id: 1, name: 'Super Admin', email: 'admin@pharmatrack.com', phone: '+250788000000', role: 'SUPER_ADMIN', status: 'Active' },
    { id: 2, name: 'Alice Mukamana', email: 'alice.admin@pharmatrack.com', phone: '+250788111222', role: 'ADMIN', status: 'Active' },
    { id: 3, name: 'David Habimana', email: 'david.admin@pharmatrack.com', phone: '+250788333444', role: 'ADMIN', status: 'Suspended' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // 2. Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'ADMIN', // Default role
    password: '',
  });

  const [errors, setErrors] = useState({});

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/^\+[1-9]\d{1,14}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be in international format (e.g., +250788123456)";
    }
    // Password complexity from your backend DTO
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&...]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Password must be 8+ chars with uppercase, lowercase, number, and special char.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      // In reality: POST /api/admin/users
      // await adminService.createAdmin(formData);
      
      // Simulating API call success
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      const newAdmin = {
        id: Date.now(),
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: 'Active'
      };

      setAdmins([newAdmin, ...admins]);
      setIsAddModalOpen(false);
      setFormData({ fullName: '', email: '', phone: '', role: 'ADMIN', password: '' });

    } catch (err) {
      setApiError(err.message || "Failed to create admin account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Users</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage administrator accounts and permissions.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          Add Administrator
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Admin Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No administrators found.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                        <Shield size={16} />
                      </div>
                      {admin.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-gray-400"/> {admin.email}</div>
                      <div className="flex items-center gap-2 text-sm mt-1"><Phone size={14} className="text-gray-400"/> {admin.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        admin.role === 'SUPER_ADMIN' 
                          ? 'bg-purple-100 text-purple-700 border-purple-200' 
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        admin.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {admin.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-green-700 dark:bg-red-900/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="text-white" size={20} /> Create Administrator
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              
              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /> {apiError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white ${errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  placeholder="e.g. Jane Doe"
                />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  placeholder="admin@pharmatrack.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  placeholder="+250788123456"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                >
                  <option value="ADMIN">Standard Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                <p className="text-xs text-gray-500 mt-1">User will be prompted to change this on first login.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;