import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Layout from './components/ui/Layout';
import CustomerDashboard from './pages/CustomerDashboard';
import RiderDashboard from './pages/RiderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WalletPage from './pages/WalletPage';
import SupportCenter from './pages/SupportCenter';

export default function App() {
  const { user, loading } = useAuth();
  const [navState, setNavState] = useState('landing');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
        <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Loading system...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => setNavState('app')} />;
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user.role === 'admin') return <AdminDashboard />;
        if (user.role === 'rider') return <RiderDashboard />;
        return <CustomerDashboard />;
      case 'wallet':
        if (user.role === 'customer') return <CustomerDashboard />;
        return <WalletPage />;
      case 'support':
        return <SupportCenter />;
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderView()}
    </Layout>
  );
}
