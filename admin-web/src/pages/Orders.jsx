import { useEffect, useState } from 'react';
import api from '../utils/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { Search, Eye, CreditCard, Package, CheckCircle, XCircle, Trash2, UserPlus, Car } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [dealerId, setDealerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/all');
      setOrders(res.data.orders || []);
      setFiltered(res.data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let data = orders;
    if (search) {
      data = data.filter(o =>
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.phone?.includes(search)
      );
    }
    if (statusFilter !== 'all') {
      data = data.filter(o => o.orderStatus === statusFilter);
    }
    setFiltered(data);
  }, [search, statusFilter, orders]);

  const updatePayment = async (id, status) => {
    try {
      await api.put(`/orders/${id}/payment`, { paymentStatus: status });
      fetchOrders();
    } catch (err) { alert('Failed to update'); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/orders/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const openAssignDealer = async (order) => {
    setAssignTarget(order);
    setDealerId(order.dealerId || '');
    setAssignError('');
    try {
      const res = await api.get('/dealers/all');
      setDealers(res.data.dealers || []);
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Dealers load nahi ho paye');
    }
  };

  const assignDealer = async (e) => {
    e.preventDefault();
    if (!dealerId) {
      setAssignError('Dealer select karein');
      return;
    }

    setAssigning(true);
    setAssignError('');
    try {
      await api.put(`/orders/${assignTarget.id}/assign-dealer`, { dealerId });
      setAssignTarget(null);
      fetchOrders();
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Dealer assign nahi ho paya');
    } finally {
      setAssigning(false);
    }
  };

  const statusColors = {
    placed: 'badge-yellow',
    confirmed: 'badge-blue',
    shipped: 'badge-purple',
    delivered: 'badge-green',
    cancelled: 'badge-red'
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-800">Orders</h2>
          <p className="text-dark-500 mt-1">Manage all customer and dealer orders</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-500">Total: <span className="font-semibold text-dark-800">{filtered.length}</span></span>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field sm:w-48"
          >
            <option value="all">All Status</option>
            <option value="placed">Placed</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-50 border-b border-dark-100">
                <th className="table-header">Order ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Dealer</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Product</th>
                <th className="table-header">Qty</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Order Status</th>
                <th className="table-header">Payment</th>
                <th className="table-header">Activated</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-dark-50 hover:bg-dark-50/50 transition-colors">
                  <td className="table-cell">
                    <span className="font-mono text-xs bg-dark-100 px-2 py-1 rounded-lg text-dark-600">{order.orderNumber}</span>
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-dark-800">{order.customer?.name || 'N/A'}</p>
                      <p className="text-xs text-dark-400">{order.customer?.phone || ''}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    {order.dealer ? (
                      <div>
                        <p className="text-sm text-dark-700">{order.dealer.companyName || 'N/A'}</p>
                        <p className="text-xs text-dark-400 font-mono">{order.salesCode}</p>
                      </div>
                    ) : (
                      <span className="text-dark-400 text-sm">Direct</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-semibold text-dark-800">{order.targetVehicleNumber || 'N/A'}</p>
                      <p className="text-xs text-dark-400 capitalize">
                        {[order.targetVehicleBrand, order.targetVehicleModel, order.targetVehicleType].filter(Boolean).join(' ') || 'Vehicle details pending'}
                      </p>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-dark-700">{order.productName}</td>
                  <td className="table-cell text-sm font-medium">{order.quantity}</td>
                  <td className="table-cell font-semibold text-dark-800">₹{parseFloat(order.totalAmount).toLocaleString()}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusColors[order.orderStatus] || 'badge-blue'}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-green' : order.paymentStatus === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    {order.isActivated ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-dark-300" />
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedOrder(order)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {order.paymentStatus === 'pending' && (
                        <button onClick={() => updatePayment(order.id, 'paid')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark Paid">
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openAssignDealer(order)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Assign dealer">
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(order)} className="p-2 text-dark-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete order">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-dark-400">
            <Package className="w-12 h-12 mx-auto mb-3 text-dark-300" />
            <p>No orders found</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-dark-800">Order Details</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-dark-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-dark-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-50 rounded-xl p-4">
                  <p className="text-xs text-dark-500 uppercase">Order Number</p>
                  <p className="font-mono text-sm font-semibold text-dark-800 mt-1">{selectedOrder.orderNumber}</p>
                </div>
                <div className="bg-dark-50 rounded-xl p-4">
                  <p className="text-xs text-dark-500 uppercase">Total Amount</p>
                  <p className="text-lg font-bold text-primary-600 mt-1">₹{parseFloat(selectedOrder.totalAmount).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-dark-50">
                  <span className="text-dark-500">Customer</span>
                  <span className="font-medium text-dark-800">{selectedOrder.customer?.name} ({selectedOrder.customer?.phone})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-50">
                  <span className="text-dark-500">Product</span>
                  <span className="font-medium text-dark-800">{selectedOrder.productName} x {selectedOrder.quantity}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-50">
                  <span className="text-dark-500">Vehicle</span>
                  <span className="font-medium text-dark-800 text-right">
                    {selectedOrder.targetVehicleNumber || 'N/A'}
                    <br />
                    <span className="text-xs text-dark-500 font-normal">
                      {[selectedOrder.targetVehicleBrand, selectedOrder.targetVehicleModel, selectedOrder.targetVehicleType].filter(Boolean).join(' ') || 'Details pending'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-50">
                  <span className="text-dark-500">Price per unit</span>
                  <span className="font-medium text-dark-800">₹{parseFloat(selectedOrder.price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-50">
                  <span className="text-dark-500">Dealer</span>
                  <span className="font-medium text-dark-800">{selectedOrder.dealer?.companyName || 'Direct Purchase'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-50">
                  <span className="text-dark-500">Shipping Address</span>
                  <span className="font-medium text-dark-800 text-right max-w-xs">{selectedOrder.shippingAddress}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-dark-500">Order Date</span>
                  <span className="font-medium text-dark-800">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this order?"
        message={`Order ${deleteTarget?.orderNumber} and any device it produced will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="Assign Dealer"
        subtitle={assignTarget ? `${assignTarget.orderNumber} • ${assignTarget.targetVehicleNumber || 'Vehicle pending'}` : ''}
      >
        <form onSubmit={assignDealer} className="space-y-4">
          {assignError && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-200">{assignError}</div>}
          <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                <Car className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-dark-800">{assignTarget?.targetVehicleNumber || 'Vehicle pending'}</p>
                <p className="text-sm text-dark-500">
                  {[assignTarget?.targetVehicleBrand, assignTarget?.targetVehicleModel, assignTarget?.targetVehicleType].filter(Boolean).join(' ') || 'Customer vehicle details'}
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 mb-1.5 block">Dealer</label>
            <select required className="input-field" value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
              <option value="">Select dealer...</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.companyName || dealer.user?.name || 'Dealer'} — {dealer.salesCode}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={assigning} className="btn-primary w-full">
            {assigning ? 'Assigning...' : 'Assign Dealer'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
