import React, { useState, useEffect } from 'react';
import CyberpunkMap from '../components/maps/CyberpunkMap';
import { Battery, Wifi, Coins, Award, Navigation } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

// Distance calculation helper (GPS coordinate distance in km)
const calculateDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const lon1 = p1[0], lat1 = p1[1];
  const lon2 = p2[0], lat2 = p2[1];
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

export default function RiderDashboard() {
  const socket = useSocket();
  const [rider, setRider] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [coordinates, setCoordinates] = useState([77.6056, 12.9546]);
  const [accepting, setAccepting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [lastNotifiedStatus, setLastNotifiedStatus] = useState({});
  const activeTaskIdRef = React.useRef(null);

  useEffect(() => {
    if (socket && rider?._id) {
      socket.emit('register', {
        userId: rider.user._id,
        role: 'rider',
        riderId: rider._id
      });
    }
  }, [socket, rider?._id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('order:assigned_dispatch', (data) => {
      console.log('⚡ Received incoming dispatch request:', data);
      const newTask = {
        _id: data.orderId,
        pickup: data.pickup,
        stops: data.stops,
        distanceKm: data.distanceKm,
        fare: data.fare,
        status: 'searching',
        distanceFromPickup: data.distanceFromPickup
      };
      setNotification('Incoming dispatch request assigned to you!');
      setTimeout(() => setNotification(null), 5000);
      setActiveTask(newTask);
      activeTaskIdRef.current = data.orderId;
    });

    socket.on('order:accepted_by_other', (data) => {
      console.log('Order accepted by another courier:', data);
      if (rider && data.riderId === rider._id) {
        return;
      }
      if (activeTaskIdRef.current === data.orderId) {
        setNotification('Order has been accepted by another courier.');
        setTimeout(() => setNotification(null), 5000);
        setActiveTask(null);
        activeTaskIdRef.current = null;
        fetchRiderHUD();
      }
    });

    return () => {
      socket.off('order:assigned_dispatch');
      socket.off('order:accepted_by_other');
    };
  }, [socket, rider?._id]);

  useEffect(() => {
    if (!socket || !activeTask) return;

    const handleOrderUpdate = (data) => {
      console.log('⚡ Active task update:', data);
      fetchRiderHUD();
    };

    socket.on(`order:${activeTask._id}:update`, handleOrderUpdate);

    return () => {
      socket.off(`order:${activeTask._id}:update`, handleOrderUpdate);
    };
  }, [socket, activeTask?._id]);

  const fetchRiderHUD = () => {
    // Fetch profile metrics
    fetch(`/api/riders/profile?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rider) {
          setRider(data.rider);
          setCoordinates(data.rider.currentLocation.coordinates);
        }
      });

    // Fetch queue dispatches
    fetch(`/api/riders/orders?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTaskHistory(data.orders);
          
          // Find an active in-progress task
          const inProgress = data.orders.find(o => 
            ['assigned', 'searching', 'pickup_arrived', 'picked_up', 'in_transit'].includes(o.status)
          );
          
          // Or find if the current active task transitioned to delivered in this session
          const deliveredActive = activeTaskIdRef.current 
            ? data.orders.find(o => o._id === activeTaskIdRef.current && o.status === 'delivered')
            : null;

          const active = inProgress || deliveredActive;
          
          setActiveTask(active);
          activeTaskIdRef.current = active ? active._id : null;
        }
      });
  };

  useEffect(() => {
    fetchRiderHUD();
    const interval = setInterval(fetchRiderHUD, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOnline = async () => {
    if (!rider) return;
    const nextStatus = rider.status === 'offline' ? 'online' : 'offline';
    
    try {
      const res = await fetch('/api/riders/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchRiderHUD();
      } else {
        alert('Failed to update status: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error toggling status: ' + err.message);
    }
  };

  // Manual Accept order handler
  const handleAcceptOrder = async () => {
    if (!activeTask) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/orders/${activeTask._id}/accept`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        setNotification('Ride accepted successfully!');
        setTimeout(() => setNotification(null), 5000);
        fetchRiderHUD();
      } else {
        alert('Accept failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Accept error: ' + err.message);
    } finally {
      setAccepting(false);
    }
  };

  // Reject order handler
  const handleRejectOrder = async () => {
    if (!activeTask) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/orders/${activeTask._id}/reject`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        setActiveTask(null);
        activeTaskIdRef.current = null;
        fetchRiderHUD();
      } else {
        alert('Reject failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Reject error: ' + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDismissCompletedTask = (taskId) => {
    setActiveTask(null);
    activeTaskIdRef.current = null;
    fetchRiderHUD();
  };

  useEffect(() => {
    if (!activeTask) return;
    const taskId = activeTask._id;
    const status = activeTask.status;

    if (status === 'in_transit' && lastNotifiedStatus[taskId] !== 'in_transit') {
      setNotification('Mission accepted! Commencing dispatch simulation...');
      setLastNotifiedStatus(prev => ({ ...prev, [taskId]: 'in_transit' }));
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    } else if (status === 'delivered' && lastNotifiedStatus[taskId] !== 'delivered') {
      setNotification('Dispatch Mission Completed! Payout credited successfully.');
      setLastNotifiedStatus(prev => ({ ...prev, [taskId]: 'delivered' }));
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [activeTask?.status, activeTask?._id, lastNotifiedStatus]);

  // Map Click Location update/simulation handler
  const handleMapClick = async (coords) => {
    setCoordinates(coords);
    try {
      const res = await fetch('/api/riders/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: coords })
      });
      const data = await res.json();
      if (data.success && socket && rider) {
        socket.emit('rider:location_update', {
          riderId: rider._id,
          coordinates: coords,
          batteryLevel: rider.batteryLevel
        });
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  // Compute live remaining distance dynamically
  const getRemainingDistance = () => {
    if (!activeTask || !coordinates) return 0;
    if (activeTask.status === 'delivered') return 0;
    
    // Determine the next checkpoint target
    let target = [activeTask.pickup.lng, activeTask.pickup.lat];
    if (['picked_up', 'in_transit'].includes(activeTask.status) && activeTask.stops.length > 0) {
      target = [activeTask.stops[0].lng, activeTask.stops[0].lat];
    }
    
    return calculateDistance(coordinates, target);
  };

  const liveDistance = getRemainingDistance();

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* Left HUD lists details */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {notification && (
          <div 
            className="p-3 rounded border text-xs font-bold text-center animate-bounce uppercase tracking-wide"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              borderColor: '#06b6d4',
              color: '#06b6d4',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)'
            }}
          >
            {notification}
          </div>
        )}
        
        {/* HUD metric cards with inline glows */}
        <div 
          className="glass-panel p-5 flex flex-col gap-4"
          style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)' }}
        >
          <h3 className="text-xs font-bold text-white tracking-widest font-display border-b border-slate-700 pb-2">
            PILOT TELEMETRY HUD
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-800 p-2.5 rounded bg-slate-900 flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 font-bold">BATTERY POWER</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{rider?.batteryLevel || 100}%</span>
            </div>
            <div className="border border-slate-800 p-2.5 rounded bg-slate-900 flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 font-bold">NET RANGE</span>
              <span className="text-sm font-bold text-cyan-400">EXCELLENT</span>
            </div>
            <div className="border border-slate-800 p-2.5 rounded bg-slate-900 flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 font-bold">ACCUM INCOME</span>
              <span className="text-sm font-bold text-pink-400 font-mono">₹{Math.round(rider?.todayEarnings || 0)}</span>
            </div>
            <div className="border border-slate-800 p-2.5 rounded bg-slate-900 flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 font-bold">COMPLETED JOBS</span>
              <span className="text-sm font-bold text-purple-400 font-mono">{rider?.totalDeliveries || 0} ITEMS</span>
            </div>
            <div className="col-span-2 border border-slate-800 p-2.5 rounded bg-slate-900 flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 font-bold">REAL-TIME GPS LOCATION</span>
              <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider">
                LONG: {coordinates?.[0]?.toFixed(5) || '77.60560'} | LAT: {coordinates?.[1]?.toFixed(5) || '12.95460'}
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            disabled={!rider}
            className={`w-full py-2.5 rounded text-xs font-bold uppercase transition-colors ${
              !rider 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                : rider.status === 'offline' 
                  ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' 
                  : 'border border-pink-500/50 text-pink-400 hover:bg-pink-500/10'
            }`}
          >
            {!rider ? 'Initializing HUD...' : rider.status === 'offline' ? 'Connect Online' : 'Disconnect'}
          </button>
        </div>

        {/* Active job assignments card */}
        {activeTask ? (
          activeTask.status === 'delivered' ? (
            <div 
              className="glass-panel-green p-5 flex flex-col gap-4 text-center items-center justify-center animate-in zoom-in-95 duration-300"
              style={{ 
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)', 
                border: '1px solid #10b981',
                background: 'rgba(16, 185, 129, 0.05)'
              }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 animate-pulse"
                style={{ boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}
              >
                <Award className="w-8 h-8" />
              </div>
              
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-white tracking-widest font-display uppercase">
                  DISPATCH MISSION COMPLETED!
                </h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Commission recorded successfully
                </p>
              </div>

              <div className="w-full border border-slate-800 bg-slate-950/60 rounded p-3 text-xs text-left flex flex-col gap-2">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400">Order ID</span>
                  <span className="font-mono text-white">...{activeTask._id.substring(18)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400">Total Distance</span>
                  <span className="font-mono text-white">{activeTask.distanceKm} KM</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Your Share (70%)</span>
                  <span className="font-mono text-emerald-400">₹{Math.round((activeTask.fare?.total || 0) * 0.7)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDismissCompletedTask(activeTask._id)}
                className="w-full py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16, 185, 129, 0.3)] hover:scale-[1.02]"
              >
                Search Next Job
              </button>
            </div>
          ) : (
            <div 
              className="glass-panel-pink p-5 flex flex-col gap-3"
              style={{ boxShadow: '0 0 15px rgba(236, 72, 153, 0.25)', border: '1px solid #ec4899' }}
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white tracking-widest font-display">ACTIVE JOB DETAILS</h3>
                <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[9px] uppercase font-bold">
                  {activeTask.status}
                </span>
              </div>
              
              <div className="text-xs flex flex-col gap-1.5">
                <p className="text-slate-400">Fare Payment: <span className="text-white font-mono">₹{activeTask.fare?.total}</span></p>
                
                {/* Dynamic remaining distance instead of static distance */}
                <p className="text-slate-400">
                  Remaining Distance:{' '} 
                  <span className="text-cyan-400 font-bold font-mono">
                    {liveDistance > 0 ? `${liveDistance} KM` : 'Arrived'}
                  </span>
                </p>
                <p className="text-slate-400">Total Route Distance: <span className="text-white font-mono">{activeTask.distanceKm} KM</span></p>
              </div>

              <div className="p-2 border border-slate-800 bg-slate-900 rounded text-[11px] mt-2">
                <span className="text-[9px] text-slate-500 block font-bold">PICKUP ADDRESS</span>
                <span className="text-white">{activeTask.pickup?.address}</span>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {activeTask.stops?.map((stop, idx) => (
                  <div key={idx} className="p-2 border border-slate-800 bg-slate-900 rounded text-[11px]">
                    <span className="text-[9px] text-slate-500 block font-bold">STOP {idx + 1}</span>
                    <span className="text-white">{stop.address}</span>
                  </div>
                ))}
              </div>
              
              {/* Action buttons depending on acceptance status */}
              {['assigned', 'searching'].includes(activeTask.status) ? (
                <button
                  onClick={handleAcceptOrder}
                  disabled={accepting}
                  className="w-full mt-3 py-3 rounded bg-cyan-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-cyan-400"
                >
                  <Navigation className="w-4 h-4" /> Accept & Commence Dispatch
                </button>
              ) : (
                activeTask.status !== 'delivered' && (
                  <p className="text-[10px] text-cyan-400 font-bold uppercase mt-2 text-center animate-pulse">
                    * SIMULATING ACTIVE ROUTING COORDINATES *
                  </p>
                )
              )}
            </div>
          )
        ) : (
          <div className="glass-panel p-5 text-center text-slate-500 text-xs">
            {rider?.status === 'offline' 
              ? 'HUD IS OFFLINE. TOGGLE ONLINE MODE TO ACCEPT COMMISSIONS.' 
              : 'AETHER NET IS SEARCHING COURIER COMMISSIONS FOR YOUR NODE.'}
          </div>
        )}

        {/* Past Rides History Panel */}
        <div 
          className="glass-panel p-5 flex flex-col gap-3"
          style={{ boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
        >
          <h3 className="text-xs font-bold text-white tracking-widest font-display border-b border-slate-700 pb-2 uppercase">
            PAST MISSIONS / DISPATCH LOGS
          </h3>
          
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
            {taskHistory.filter(o => ['delivered', 'cancelled'].includes(o.status)).length === 0 ? (
              <span className="text-[11px] text-slate-500 italic">No past missions recorded.</span>
            ) : (
              taskHistory.filter(o => ['delivered', 'cancelled'].includes(o.status)).map((ride) => (
                <div 
                  key={ride._id} 
                  className="p-2.5 border border-slate-800 bg-slate-950/60 rounded text-[11px] flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] text-slate-400">#{ride._id.substring(18)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      ride.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {ride.status}
                    </span>
                  </div>
                  
                  <div className="text-slate-300 flex flex-col gap-1">
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase font-bold block">Pickup</span>
                      <span className="truncate block">{ride.pickup?.address}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase font-bold block">Dropoff</span>
                      <span className="truncate block">{ride.stops?.[0]?.address || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-slate-900 pt-1.5 mt-0.5">
                    <span className="text-slate-500 text-[9px]">Earnings: <span className="text-emerald-400 font-bold">₹{Math.round((ride.fare?.total || 0) * 0.7)}</span></span>
                    <span className="text-slate-500 text-[9px] font-mono">{new Date(ride.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Map panel widget */}
      <div className="lg:col-span-8 h-[76vh] min-h-[500px]">
        <CyberpunkMap 
          pickupCoords={activeTask ? [activeTask.pickup.lng, activeTask.pickup.lat] : null} 
          stopsCoords={activeTask ? activeTask.stops : []} 
          riderCoords={coordinates}
          riderType={rider?.vehicleType || 'bike'}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Accept / Reject Popup Modal Overlay */}
      {activeTask && ['assigned', 'searching'].includes(activeTask.status) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div 
            className="bg-slate-900 border-2 rounded-lg p-6 max-w-md w-full flex flex-col gap-4 shadow-[0_0_50px_rgba(236,72,153,0.35)] animate-in zoom-in-95 duration-300"
            style={{ borderColor: '#ec4899' }}
          >
            <div className="text-center">
              <div 
                className="inline-flex p-3 rounded-full bg-pink-500/10 text-pink-500 mb-3 border animate-pulse"
                style={{ borderColor: 'rgba(236,72,153,0.3)' }}
              >
                <Navigation className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-white tracking-widest font-display uppercase">
                INCOMING DISPATCH REQUEST
              </h2>
              <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider mt-1">
                2KM RADIUS MATCH FOUND
              </p>
            </div>

            <div className="border border-slate-800 bg-slate-950 rounded p-4 text-xs flex flex-col gap-2">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Dispatch Fee</span>
                <span className="font-bold text-pink-400 font-mono">₹{activeTask.fare?.total}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Trip Distance</span>
                <span className="font-bold text-white font-mono">{activeTask.distanceKm} KM</span>
              </div>
              {activeTask.distanceFromPickup !== undefined && (
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Distance to Pickup</span>
                  <span className="font-bold text-cyan-400 font-mono">{(activeTask.distanceFromPickup).toFixed(2)} KM</span>
                </div>
              )}
              <div className="flex flex-col gap-1 mt-1 text-[11px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Pickup Hub Location</span>
                <span className="text-white bg-slate-900 px-2 py-1 rounded border border-slate-800/80">{activeTask.pickup?.address}</span>
              </div>
              <div className="flex flex-col gap-1 mt-1 text-[11px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Dropoff Location</span>
                <span className="text-white bg-slate-900 px-2 py-1 rounded border border-slate-800/80">
                  {activeTask.stops?.[0]?.address || 'Multiple destinations'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                onClick={handleRejectOrder}
                disabled={accepting}
                className="py-3 rounded border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 font-bold text-xs uppercase transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleAcceptOrder}
                disabled={accepting}
                className="py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
