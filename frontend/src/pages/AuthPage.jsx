import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('bike');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await login(email, password);
      } else {
        const nameTrimmed = name.trim();
        const emailTrimmed = email.trim().toLowerCase();
        const phoneTrimmed = phone.trim();

        // 1. Name validation
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(nameTrimmed)) {
          setErrorMsg('Name must contain only letters and spaces');
          setLoading(false);
          return;
        }

        // 2. Phone validation
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phoneTrimmed)) {
          setErrorMsg('Phone number must be exactly 10 digits');
          setLoading(false);
          return;
        }

        // 3. Email validation
        if (!emailTrimmed.endsWith('@gmail.com')) {
          setErrorMsg('Email must be a valid @gmail.com address');
          setLoading(false);
          return;
        }

        res = await register({
          name: nameTrimmed,
          email: emailTrimmed,
          password,
          role,
          phone: phoneTrimmed,
          vehicleType: role === 'rider' ? vehicleType : undefined
        });
      }

      if (res.success) {
        if (isLogin) {
          onAuthSuccess();
        } else {
          setSuccessMsg('Registration successful! Please login.');
          setIsLogin(true);
          setName('');
          setPhone('');
        }
      } else {
        setErrorMsg(res.message || 'Authentication failed');
      }
    } catch (err) {
      setErrorMsg('Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      
      <div 
        className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-lg relative"
        style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)' }}
      >
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-cyan-500 rounded flex items-center justify-center font-bold text-slate-950 text-xl mx-auto mb-3">
            Æ
          </div>
          <h2 className="text-base font-bold uppercase tracking-wider text-white">
            {isLogin ? 'LOGIN' : 'REGISTER'}
          </h2>
          <span className="text-[10px] text-cyan-400 font-semibold block mt-1">Aether Hyperlocal Delivery Dispatcher</span>
        </div>

        {successMsg && (
          <div className="p-3 mb-4 rounded border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 text-xs text-center font-bold uppercase">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 mb-4 rounded border border-rose-500/35 bg-rose-500/10 text-rose-400 text-xs text-center font-bold uppercase">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          
          {!isLogin && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setName(val);
                  }}
                  placeholder="Enter name"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setPhone(val);
                    }
                  }}
                  placeholder="Enter phone number"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
            />
          </div>

          {!isLogin && (
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Select Role</span>
              <div className="grid grid-cols-3 gap-2">
                {['customer', 'rider', 'admin'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-1 rounded text-[10px] uppercase font-bold border transition-colors ${
                      role === r ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-800 text-slate-500 bg-slate-950'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {role === 'rider' && (
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Vehicle Type</span>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    <option value="bike">BIKE</option>
                    <option value="ev_scooter">EV SCOOTER</option>
                    <option value="drone">DRONE</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-cyan-500 text-slate-950 font-bold uppercase hover:opacity-85 disabled:opacity-50 mt-2 flex items-center justify-center gap-1"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-slate-500">
          {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-cyan-400 hover:underline font-bold"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>

    </div>
  );
}
