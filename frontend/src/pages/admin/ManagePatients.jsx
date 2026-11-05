import React, { useState } from 'react';
import { Search, User } from 'lucide-react';

const ManagePatients = () => {
  // Mock Data
  const [patients] = useState([
    { id: 1, name: 'Alice Mukamana', email: 'alice@example.com', phone: '+250788111222', joined: '2024-01-15' },
    { id: 2, name: 'David Habimana', email: 'david@example.com', phone: '+250788333444', joined: '2024-02-20' },
    { id: 3, name: 'Sarah Uwase', email: null, phone: '+250788555666', joined: '2024-03-10' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Patients</h1>
        <p className="text-gray-500 dark:text-gray-400">View all registered patients on the platform.</p>
      </div>

      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-6 py-4">Patient Name</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredPatients.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                    <User size={16} />
                  </div>
                  {p.name}
                </td>
                <td className="px-6 py-4">
                  <p>{p.phone}</p>
                  <p className="text-xs text-gray-500">{p.email || 'No email'}</p>
                </td>
                <td className="px-6 py-4">{p.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagePatients;