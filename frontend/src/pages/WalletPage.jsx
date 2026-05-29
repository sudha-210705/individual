import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const fetchWalletDetails = () => {
    fetch(`${API_URL}/wallet?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWallet(data.wallet);
          setTransactions(data.transactions);
        }
      })
      .catch(err => console.error(err));
  };

  const socket = useSocket();

  useEffect(() => {
    fetchWalletDetails();
    const interval = setInterval(fetchWalletDetails, 3000);

    if (socket) {
      socket.on('rider:wallet_update', fetchWalletDetails);
      socket.on('admin:stats_update', fetchWalletDetails);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('rider:wallet_update', fetchWalletDetails);
        socket.off('admin:stats_update', fetchWalletDetails);
      }
    };
  }, [socket]);

  const displayedTransactions = transactions;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Charger */}
        <div className="flex flex-col gap-6">
          <div
            className="glass-panel p-6 flex flex-col gap-3"
            style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)' }}
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase">AETHER WALLET FUNDING</span>

            <div className="mt-2">
              <span className="text-[10px] text-slate-500 block mb-1">AVAILABLE BALANCE</span>
              <h2 className="text-3xl font-black text-white font-mono">
                ₹{wallet?.balance ?? 0}
              </h2>

              <p className="text-xs text-cyan-400 mt-2">
                Amount to be collected from customers
              </p>            </div>

            <div className="border-t border-slate-800 pt-3 mt-2 text-[10px] text-slate-500">
              Currency Code: <span className="text-white font-bold">INR</span>
            </div>
          </div>


        </div>

        {/* Transactions list */}
        <div className="glass-panel p-5 h-[68vh] flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Ledger History
          </h3>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {displayedTransactions.length === 0 ? (
              <p className="text-[10px] text-slate-500 uppercase p-4 text-center">NO STATEMENTS FOUND</p>
            ) : (
              displayedTransactions.map((tx) => {
                const isDebit = tx.type === 'debit';
                return (
                  <div key={tx._id} className="p-3 border border-slate-800 rounded bg-slate-900/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center border ${isDebit ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                        {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase text-[10px] tracking-wider">
                          {tx.purpose.replace('_', ' ')}
                        </p>
                        <span className="text-[9px] text-slate-500 block">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isDebit ? '-' : '+'}₹{tx.amount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
