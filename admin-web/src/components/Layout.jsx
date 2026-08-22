import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import {
  LayoutDashboard, ShoppingCart, Users, Car, UserCheck,
  Activity, LogOut, Menu, ChevronRight, Wrench, KeyRound, Loader2, Radio
} from 'lucide-react';
import logoUrl from '../assets/images/logo.png';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/dealers', label: 'Dealers', icon: UserCheck },
  { path: '/vehicles', label: 'Vehicles', icon: Car },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/technicians', label: 'Technicians', icon: Wrench },
  { path: '/activations', label: 'Activations', icon: Activity },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { user, logout, changePassword } = useAuth();
  const location = useLocation();

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordError('');
    setPasswordMessage('');
  };

  const closePasswordModal = () => {
    if (passwordSaving) return;
    setPasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordMessage('');
  };

  const getPasswordErrorMessage = (err) => {
    const validationMessage = err.response?.data?.errors?.[0]?.msg;
    return validationMessage || err.response?.data?.message || 'Password change nahi ho paya. Please try again.';
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      const data = await changePassword(passwordForm);
      setPasswordMessage(data.message || 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(getPasswordErrorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-white/10 bg-gradient-to-b from-dark-950 via-dark-900 to-primary-950 text-white shadow-2xl shadow-dark-950/30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-primary-950/25">
                <img src={logoUrl} alt="SuperGPS" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">SuperGPS</h1>
                <p className="text-xs font-medium text-cyan-100/70">Fleet Command</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </NavLink>
              );
            })}
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="w-10 h-10 bg-white text-primary-700 rounded-full flex items-center justify-center">
                <span className="font-bold text-sm">{user?.name?.charAt(0) || 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-cyan-100/60 text-xs truncate">{user?.email || 'admin@supergps.com'}</p>
              </div>
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="p-2 text-cyan-100/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Change password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button onClick={logout} className="p-2 text-cyan-100/70 hover:text-rose-200 hover:bg-rose-500/15 rounded-lg transition-all" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white bg-white/75 px-6 py-4 shadow-sm shadow-dark-200/50 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-dark-600 hover:bg-dark-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-dark-900 font-semibold text-lg">
                {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <Radio className="h-3.5 w-3.5" />
                System Online
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <Modal
        open={passwordModalOpen}
        onClose={closePasswordModal}
        title="Change Password"
        subtitle="Apna current password confirm karke new password set karein."
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">Current Password</label>
            <input
              required
              type="password"
              className="input-field"
              value={passwordForm.currentPassword}
              onChange={(e) => updatePasswordField('currentPassword', e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">New Password</label>
            <input
              required
              type="password"
              className="input-field"
              value={passwordForm.newPassword}
              onChange={(e) => updatePasswordField('newPassword', e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">Confirm New Password</label>
            <input
              required
              type="password"
              className="input-field"
              value={passwordForm.confirmPassword}
              onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
              placeholder="New password repeat karein"
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          {passwordError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {passwordError}
            </div>
          )}
          {passwordMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {passwordMessage}
            </div>
          )}

          <button type="submit" disabled={passwordSaving} className="btn-primary w-full flex items-center justify-center gap-2">
            {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
