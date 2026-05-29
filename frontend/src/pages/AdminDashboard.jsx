import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import CyberpunkMap from '../components/maps/CyberpunkMap';
const API_URL = 'https://individual-wp27.onrender.com';

import { 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  CloudRain, 
  Sun, 
  Wind,
  Layers, 
  Cpu
} from 'lucide-react';

export default function AdminDashboard() {
  const socket = useSocket();

  const [stats, setStats] = useState({
    orders: { total: 0, active: 0, completed: 0, cancelled: 0 },
    riders: { total: 0, busy: 0, online: 0, offline: 0 },
    customers: 0,
    revenue: 0,
    surgeRevenue: 0
  });

  const [liveRiders, setLiveRiders] = useState([]);
  const [tickerLogs, setTickerLogs] = useState([
    { text: 'Aether core booted. Real-time routing dispatcher operational.', time: '11:00:00', type: 'system' }
  ]);

  const [weatherCondition, setWeatherCondition] = useState('clear');
  const [customSurge, setCustomSurge] = useState(1.5);
  const [selectedZone, setSelectedZone] = useState('NEON SECTOR A');
  const [heatmapView, setHeatmapView] = useState(false);

  const [chartData, setChartData] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLiveRiders(data.liveRiders);
        if (data.chartData) {
          setChartData(data.chartData);
        }
      }
    } catch (err) {
      console.error('Error fetching admin statistics:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('order:new_placed', (data) => {
      addTickerLog(`New order placed: ...${data.orderId.substring(18)}`, 'order');
      fetchStats();
    });

    socket.on('admin:rider_moved', () => {
      fetchStats();
    });

    socket.on('admin:stats_update', (data) => {
      addTickerLog(`Order delivered and split processed: ...${data.orderId.substring(18)}`, 'system');
      fetchStats();
    });

    return () => {
      socket.off('order:new_placed');
      socket.off('admin:rider_moved');
      socket.off('admin:stats_update');
    };
  }, [socket]);

  const addTickerLog = (text, type = 'system') => {
    const time = new Date().toLocaleTimeString();
    setTickerLogs(prev => [{ text, time, type }, ...prev.slice(0, 10)]);
  };

  const handleWeatherChange = (condition) => {
    setWeatherCondition(condition);
    let delay = 0;
    if (condition === 'rainy') delay = 5;
    if (condition === 'stormy') delay = 15;

    if (socket) {
      socket.emit('simulation:weather_change', { condition, delayMinutes: delay });
    }
    
    addTickerLog(`Weather override updated: ${condition.toUpperCase()}`, 'system');
  };

  const handleUpdateSurge = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/admin/surge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedZone,
          surgeMultiplier: Number(customSurge),
          demandLevel: Number(customSurge) > 2.0 ? 'critical' : Number(customSurge) > 1.4 ? 'high' : 'medium'
        })
      });
      const data = await res.json();
      if (data.success) {
        addTickerLog(`Surge modified: ${selectedZone} set to ${customSurge}x`, 'system');
        fetchStats();
      }
    } catch (err) {
      console.error('Surge update error:', err);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="glass-panel p-5 relative overflow-hidden flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">TOTAL REVENUE</span>
          <span className="text-2xl font-black text-cyan-400 font-display">₹{stats.revenue}</span>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ACTIVE JOBS</span>
          <span className="text-2xl font-black text-purple-400 font-display">{stats.orders.active}</span>
          <span className="text-[9px] text-slate-400">Delivered: {stats.orders.completed}</span>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ACTIVE RIDERS</span>
          <span className="text-2xl font-black text-pink-400 font-display">{stats.riders.online}</span>
          <span className="text-[9px] text-slate-400">On job: {stats.riders.busy}</span>
        </div>

      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left column settings & logs */}
        <div className="xl:col-span-4 flex flex-col gap-6">

          {/* Logs panel */}
          <div className="glass-panel p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white tracking-widest font-display border-b border-slate-700 pb-2">
              REAL-TIME DISPATCH LOGS
            </h3>
            
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto text-[11px] font-mono">
              {tickerLogs.map((log, i) => (
                <div key={i} className="flex gap-1.5 items-start border-b border-slate-800 pb-1">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span className={log.type === 'order' ? 'text-cyan-400' : 'text-slate-400'}>{log.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column maps */}
        <div className="xl:col-span-8 h-[60vh] min-h-[460px]">
          <CyberpunkMap 
            showHeatmap={heatmapView} 
            liveRiders={liveRiders}
            showZones={true}
          />
        </div>

      </div>

      {/* Simplified Bar Chart using clean CSS/SVG layout columns */}
      <div className="glass-panel p-5">
        <h3 className="text-xs font-bold text-white tracking-widest font-display border-b border-slate-700 pb-2 mb-4">
          HOURLY ORDER DISTRIBUTION (PEAK WORKLOAD)
        </h3>

        {/* Dynamic bar charts drawing using flex columns */}
        <div className="h-44 flex items-end justify-between gap-2 px-4 pt-4 border-b border-slate-800">
          {chartData.map((data, idx) => (
            <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
              <div 
                className="w-full bg-cyan-500/20 group-hover:bg-cyan-500/40 border-t-2 border-cyan-400 transition-all duration-500 ease-out rounded-t"
                style={{ height: data.height }}
              />
              <span className="text-[10px] text-slate-500 mt-1 font-mono">{data.hour}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
