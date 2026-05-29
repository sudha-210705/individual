import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
const API_URL = 'https://individual-wp27.onrender.com';

import { 
  Map, 
  Wallet, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Globe, 
  Compass
} from 'lucide-react';

export default function Layout({ children, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState(0);
  const socket = useSocket();

  const fetchBalance = () => {
   fetch(`${API_URL}/wallet?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.wallet) {
          setBalance(data.wallet.balance);
        }
      })
      .catch(err => console.error('Error fetching balance:', err));
  };

  // Fetch wallet balance directly
  useEffect(() => {
    if (!user) return;

    fetchBalance();
    const interval = setInterval(fetchBalance, 3000);

    if (socket) {
      socket.on('admin:stats_update', fetchBalance);
      socket.on('rider:wallet_update', fetchBalance);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('admin:stats_update', fetchBalance);
        socket.off('rider:wallet_update', fetchBalance);
      }
    };
  }, [user, socket, activeTab]);

  if (!user) return <>{children}</>;

  const getMenuItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Monitor Deck', icon: Globe },
          { id: 'support', label: 'Ticket Center', icon: MessageSquare }
        ];
      case 'rider':
        return [
          { id: 'dashboard', label: 'Rider Console', icon: Compass },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'support', label: 'Support Chat', icon: MessageSquare }
        ];
      case 'customer':
      default:
        return [
          { id: 'dashboard', label: 'Booking Map', icon: Map },
          { id: 'support', label: 'Help Chat', icon: MessageSquare }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Side bar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 z-20">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 mb-6 p-2">
            <div className="w-7 h-7 bg-cyan-500 rounded flex items-center justify-center font-bold text-slate-900">
              Æ
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wider">AETHER</h1>
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">DISPATCH CORE</span>
            </div>
          </div>

          {/* User profile details */}
          <div className="p-3 bg-slate-800/40 rounded border border-slate-700/30 mb-4 text-xs">
            <p className="font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-cyan-400 font-bold uppercase mt-1">Role: {user.role}</p>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  style={isActive ? { boxShadow: '0 0 10px rgba(6, 182, 212, 0.15)' } : {}}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </aside>

      {/* Main deck */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar header */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <span className="text-xs font-bold text-slate-400">
            PLATFORM STATUS: <span className="text-emerald-400">ONLINE</span>
          </span>
          
          {(user.role === 'rider' || user.role === 'admin') && (
            <div className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-400">
              {user.role === 'admin' ? 'Admin Wallet' : 'Wallet Balance'}: ₹{balance}
            </div>
          )}
        </header>

        {/* Viewport content */}
        <div className="flex-1 overflow-y-auto relative bg-slate-950">
          {children}
        </div>
      </main>
    </div>
  );
}
