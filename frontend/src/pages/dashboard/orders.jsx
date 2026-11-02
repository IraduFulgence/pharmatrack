import React, { useState } from 'react';
import { 
  Search, ShoppingBag, CheckCircle2, Clock, Truck, 
  XCircle, Eye, X, User, Calendar, Plus, Trash2, CreditCard
} from 'lucide-react';

const Orders = () => {
  // 1. Mock Data
  const [orders, setOrders] = useState([
    {
      id: 'ORD-8842',
      customerName: 'Alice Mukamana',
      date: '2024-05-20',
      type: 'Delivery',
      status: 'Processing',
      total: 12500, 
      paymentStatus: 'Paid',
      items: [
        { name: 'Amoxicillin 500mg', qty: 2, price: 2500 },
        { name: 'Paracetamol 250mg', qty: 1, price: 7500 }
      ]
    },
    {
      id: 'ORD-8843',
      customerName: 'John Doe',
      date: '2024-05-20',
      type: 'Pickup',
      status: 'Ready',
      total: 4500,
      paymentStatus: 'Pending',
      items: [
        { name: 'Ibuprofen 400mg', qty: 3, price: 1500 }
      ]
    }
  ]);

  //Mock Inventory 
  const mockInventory = [
    { id: 1, name: 'Amoxicillin', dosage: '500mg', price: 2500, stock: 120 },
    { id: 2, name: 'Paracetamol', dosage: '250mg', price: 7500, stock: 15 },
    { id: 3, name: 'Ibuprofen', dosage: '400mg', price: 1500, stock: 50 },
    { id: 4, name: 'Ciprofloxacin', dosage: '500mg', price: 4500, stock: 30 },
  ];

  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  //State for New Order Form
  const [newOrderData, setNewOrderData] = useState({
    customerName: '',
    type: 'Pickup',
    items: [], 
    paymentStatus: 'Pending'
  });
  const [selectedItemId, setSelectedItemId] = useState('');

 
  
  const filteredOrders = orders.filter(ord => 
    ord.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ord.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateStatus = (id, newStatus) => {
    setOrders(orders.map(ord => 
      ord.id === id ? { ...ord, status: newStatus } : ord
    ));
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  
  const handleAddItem = () => {
    if (!selectedItemId) return;
    const itemToAdd = mockInventory.find(item => item.id === parseInt(selectedItemId));
    
    
    const existingItemIndex = newOrderData.items.findIndex(i => i.id === itemToAdd.id);
    
    if (existingItemIndex >= 0) {
      
      const updatedItems = [...newOrderData.items];
      updatedItems[existingItemIndex].qty += 1;
      setNewOrderData({ ...newOrderData, items: updatedItems });
    } else {
      
      setNewOrderData({ 
        ...newOrderData, 
        items: [...newOrderData.items, { ...itemToAdd, qty: 1 }] 
      });
    }
    setSelectedItemId('');
  };

  const handleRemoveItem = (id) => {
    setNewOrderData({
      ...newOrderData,
      items: newOrderData.items.filter(item => item.id !== id)
    });
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const newId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: newId,
      customerName: newOrderData.customerName,
      date: new Date().toISOString().split('T')[0],
      type: newOrderData.type,
      status: 'Pending', 
      total: calculateTotal(newOrderData.items),
      paymentStatus: newOrderData.paymentStatus,
      items: newOrderData.items
    };

    setOrders([newOrder, ...orders]);
    setIsAddModalOpen(false);
    setNewOrderData({ customerName: '', type: 'Pickup', items: [], paymentStatus: 'Pending' });
  };


  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Ready': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Out for Delivery': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Completed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'Cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">Track and manage patient medicine orders.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#007a55] hover:bg-[#006645] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Order
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search by customer or Order ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Total (RWF)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <ShoppingBag size={16} className="text-gray-400" />
                      {ord.id}
                    </td>
                    <td className="px-6 py-4">{ord.customerName}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5">
                        {ord.type === 'Delivery' ? <Truck size={14} /> : <User size={14} />}
                        {ord.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{ord.total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(ord.status)}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(ord)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#007a55] bg-[#e6f4ef] hover:bg-[#d1eae1] dark:bg-[#007a55]/10 dark:text-[#34d399] dark:hover:bg-[#007a55]/20 rounded-lg transition-colors"
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE ORDER MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Order</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                    <input 
                      type="text" 
                      required
                      value={newOrderData.customerName}
                      onChange={(e) => setNewOrderData({...newOrderData, customerName: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white"
                      placeholder="e.g. Walk-in Customer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Type</label>
                    <select 
                      value={newOrderData.type}
                      onChange={(e) => setNewOrderData({...newOrderData, type: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    >
                      <option value="Pickup">Pickup</option>
                      <option value="Delivery">Delivery</option>
                    </select>
                  </div>
                </div>

                {/* Add Items Section */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Medicines</label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="flex-grow bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    >
                      <option value="">Select a medicine from inventory...</option>
                      {mockInventory.map(item => (
                        <option key={item.id} value={item.id}>{item.name} {item.dosage} - {item.price} RWF (Stock: {item.stock})</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={handleAddItem}
                      className="px-4 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Selected Items List */}
                {newOrderData.items.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mt-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order Items</h4>
                    {newOrderData.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.name} {item.dosage}</p>
                          <p className="text-gray-500">{item.qty} x {item.price} RWF</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-gray-900 dark:text-white">{(item.qty * item.price).toLocaleString()} RWF</span>
                          <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment Status */}
                <div className="pt-2">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
                   <select 
                      value={newOrderData.paymentStatus}
                      onChange={(e) => setNewOrderData({...newOrderData, paymentStatus: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    >
                      <option value="Pending">Pending (Pay on Pickup/Delivery)</option>
                      <option value="Paid">Paid (MoMo/Cash)</option>
                    </select>
                </div>

              </div>

              {/* Footer  */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-[#007a55]">
                    {calculateTotal(newOrderData.items).toLocaleString()} RWF
                  </span>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={newOrderData.items.length === 0}
                    className="flex-1 px-4 py-2.5 bg-[#007a55] hover:bg-[#006645] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                  >
                    Create Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW ORDER MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
                <p className="text-sm text-gray-500">{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Customer</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Order Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    {selectedOrder.type === 'Delivery' ? <Truck size={14} /> : <User size={14} />}
                    {selectedOrder.type}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.date}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Payment</p>
                  <p className={`font-semibold flex items-center gap-1 ${selectedOrder.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>
                    <CreditCard size={14} /> {selectedOrder.paymentStatus}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Order Items</h4>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-gray-500">{item.qty} x {item.price} RWF</p>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{(item.qty * item.price).toLocaleString()} RWF</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-[#007a55] text-lg">{selectedOrder.total.toLocaleString()} RWF</span>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Update Order Status</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => updateStatus(selectedOrder.id, 'Processing')} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm border transition-colors ${selectedOrder.status === 'Processing' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Clock size={16} /> Processing</button>
                  <button onClick={() => updateStatus(selectedOrder.id, 'Ready')} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm border transition-colors ${selectedOrder.status === 'Ready' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><CheckCircle2 size={16} /> Ready</button>
                  {selectedOrder.type === 'Delivery' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'Out for Delivery')} className={`col-span-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm border transition-colors ${selectedOrder.status === 'Out for Delivery' ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Truck size={16} /> Out for Delivery</button>
                  )}
                  <button onClick={() => updateStatus(selectedOrder.id, 'Completed')} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm border transition-colors ${selectedOrder.status === 'Completed' ? 'bg-gray-200 border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><CheckCircle2 size={16} /> Completed</button>
                  <button onClick={() => updateStatus(selectedOrder.id, 'Cancelled')} className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm border transition-colors ${selectedOrder.status === 'Cancelled' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><XCircle size={16} /> Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Orders;