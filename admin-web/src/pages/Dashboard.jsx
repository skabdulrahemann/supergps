import { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  ShoppingCart, Users, Car, UserCheck, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState({ orders: 0, dealers: 0, vehicles: 0, customers: 0, revenue: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, dealersRes, vehiclesRes] = await Promise.all([
        api.get('/orders/all'),
        api.get('/dealers/all'),
        api.get('/vehicles/all')
      ]);

      const allOrders = ordersRes.data.orders || [];
      const allDealers = dealersRes.data.dealers || [];
      const allVehicles = vehiclesRes.data.vehicles || [];

      const customers = [...new Set(allOrders.map(o => o.customerId))];
      const revenue = allOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);

      setStats({
        orders: allOrders.length,
        dealers: allDealers.length,
        vehicles: allVehicles.length,
        customers: customers.length,
        revenue
      });
      setOrders(allOrders.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Placed', value: orders.filter(o => o.orderStatus === 'placed').length },
    { name: 'Confirmed', value: orders.filter(o => o.orderStatus === 'confirmed').length },
    { name: 'Shipped', value: orders.filter(o => o.orderStatus === 'shipped').length },
    { name: 'Delivered', value: orders.filter(o => o.orderStatus === 'delivered').length },
    { name: 'Activated', value: orders.filter(o => o.isActivated).length },
  ];

  const pieData = [
    { name: 'Activated', value: stats.vehicles },
    { name: 'Pending', value: stats.orders - stats.vehicles },
  ];

  const statCards = [
    { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: 'bg-primary-50 text-primary-600', trend: '+12%', up: true },
    { label: 'Active Dealers', value: stats.dealers, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600', trend: '+5%', up: true },
    { label: 'Vehicles Tracked', value: stats.vehicles, icon: Car, color: 'bg-amber-50 text-amber-600', trend: '+8%', up: true },
    { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600', trend: '+15%', up: true },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-500 text-sm font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-dark-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4">
                {card.up ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
                <span className={`text-sm font-medium ${card.up ? 'text-emerald-600' : 'text-rose-600'}`}>{card.trend}</span>
                <span className="text-dark-400 text-sm ml-1">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="text-dark-800 font-semibold text-lg mb-6">Order Status Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-dark-800 font-semibold text-lg mb-6">Activation Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-sm text-dark-600">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-dark-800 font-semibold text-lg">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="table-header">Order ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Payment</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-dark-50 hover:bg-dark-50/50 transition-colors">
                  <td className="table-cell font-mono text-xs text-dark-500">{order.orderNumber}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-dark-800">{order.customer?.name || 'N/A'}</p>
                      <p className="text-xs text-dark-400">{order.customer?.phone || ''}</p>
                    </div>
                  </td>
                  <td className="table-cell font-semibold text-dark-800">₹{parseFloat(order.totalAmount).toLocaleString()}</td>
                  <td className="table-cell">
                    <span className={`badge ${order.orderStatus === 'delivered' ? 'badge-green' : order.orderStatus === 'placed' ? 'badge-yellow' : 'badge-blue'}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-green' : order.paymentStatus === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="table-cell text-dark-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}