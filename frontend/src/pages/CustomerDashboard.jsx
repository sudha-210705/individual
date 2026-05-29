import React, { useState, useEffect } from 'react';
import CyberpunkMap from '../components/maps/CyberpunkMap';
import { MapPin, Plus, Trash, Loader2, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
const API_URL = 'https://individual-wp27.onrender.com';

// Simple deterministic geocoding simulation (hashes text to coordinates near center)
const getCoordsFromAddress = (address, baseLng = 77.5946, baseLat = 12.9716) => {
  if (!address || address.trim() === '') {
    return { lng: baseLng, lat: baseLat };
  }
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate offsets between -0.04 and +0.04 degrees
  const lngOffset = ((hash % 80) / 1000);
  const latOffset = (((hash >> 8) % 80) / 1000);
  
  return {
    lng: parseFloat((baseLng + lngOffset).toFixed(4)),
    lat: parseFloat((baseLat + latOffset).toFixed(4))
  };
};

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

const getStatusLabel = (status) => {
  switch (status) {
    case 'placed': return 'Order Placed';
    case 'searching': return 'Searching for Rider';
    case 'assigned': return 'Rider Assigned (Pending Acceptance)';
    case 'in_transit': return 'Rider has accepted and will be there soon.';
    case 'pickup_arrived': return 'Rider arrived at pickup';
    case 'picked_up': return 'Rider heading to dropoff';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

export default function CustomerDashboard() {
  const socket = useSocket();
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [riderCoords, setRiderCoords] = useState(null);
  const [notification, setNotification] = useState(null);
  const [lastNotifiedStatus, setLastNotifiedStatus] = useState({});
  const activeOrderIdRef = React.useRef(null);
  
  // Text inputs
  const [pickup, setPickup] = useState('MG Road Hub');
  const [stops, setStops] = useState([
    { address: 'Indiranagar Sect 2', recipientName: '', recipientPhone: '' }
  ]);
  
  const [estimation, setEstimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const fetchOrders = () => {
    fetch(`${API_URL}/api/orders?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.orders);
          
          // Find an active in-progress order
          const inProgress = data.orders.find(o => 
            ['placed', 'searching', 'assigned', 'pickup_arrived', 'picked_up', 'in_transit'].includes(o.status)
          );
          
          // Or find if the current active order transitioned to delivered in this session
          const deliveredActive = activeOrderIdRef.current 
            ? data.orders.find(o => o._id === activeOrderIdRef.current && o.status === 'delivered')
            : null;

          const active = inProgress || deliveredActive;
          
          if (active) {
            setActiveOrder(active);
            activeOrderIdRef.current = active._id;
            if (active.rider && !riderCoords) {
              setRiderCoords(active.rider.currentLocation?.coordinates || null);
            }
          } else {
            setActiveOrder(null);
            activeOrderIdRef.current = null;
            setRiderCoords(null);
          }
        }
      });
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeOrder) return;
    const orderId = activeOrder._id;
    const status = activeOrder.status;

    if (status === 'in_transit' && lastNotifiedStatus[orderId] !== 'in_transit') {
      setNotification('Rider has accepted and will be there soon.');
      setLastNotifiedStatus(prev => ({ ...prev, [orderId]: 'in_transit' }));
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    } else if (status === 'delivered' && lastNotifiedStatus[orderId] !== 'delivered') {
      setNotification('Ride Completed! Your package has been delivered successfully.');
      setLastNotifiedStatus(prev => ({ ...prev, [orderId]: 'delivered' }));
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [activeOrder?.status, activeOrder?._id, lastNotifiedStatus]);

  useEffect(() => {
    if (!socket || !activeOrder) return;

    const riderId = activeOrder.rider?._id || activeOrder.rider;

    const handleLocationUpdate = (data) => {
      setRiderCoords(data.coordinates);
    };

    const handleOrderUpdate = (data) => {
      console.log('⚡ Received order update via socket:', data);
      if (data) {
        setActiveOrder(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          if (data.status) {
            updated.status = data.status;
          }
          if (data.rider) {
            updated.rider = {
              ...prev.rider,
              ...data.rider,
              user: {
                ...(prev.rider?.user || {}),
                name: data.rider.name || prev.rider?.user?.name,
                phone: data.rider.phone || prev.rider?.user?.phone
              }
            };
          }
          if (data.status && (!prev.timeline || !prev.timeline.some(t => t.status === data.status))) {
            const newTimeline = Array.isArray(prev.timeline) ? [...prev.timeline] : [];
            let desc = `Status updated to ${data.status}`;
            if (data.status === 'in_transit' && data.rider) {
              desc = `Order accepted by courier ${data.rider.name}. Commencing delivery coordinates updates.`;
            } else if (data.status === 'pickup_arrived') {
              desc = `Rider arrived at pickup grid checkpoint.`;
            } else if (data.status === 'picked_up') {
              desc = `Package payloads secured. Transitioning to delivery stops.`;
            } else if (data.status === 'delivered') {
              desc = `Package payload successfully dispatched & signed for.`;
            } else if (data.status === 'cancelled') {
              desc = `Order cancelled.`;
            }
            newTimeline.push({
              status: data.status,
              description: desc,
              timestamp: new Date()
            });
            updated.timeline = newTimeline;
          }
          return updated;
        });
      }
      fetchOrders();
    };

    if (riderId) {
      socket.on(`rider:${riderId}:location`, handleLocationUpdate);
    }
    socket.on(`order:${activeOrder._id}:update`, handleOrderUpdate);

    return () => {
      if (riderId) {
        socket.off(`rider:${riderId}:location`, handleLocationUpdate);
      }
      socket.off(`order:${activeOrder._id}:update`, handleOrderUpdate);
    };
  }, [socket, activeOrder?._id, activeOrder?.rider?._id || activeOrder?.rider]);

  const handleAddStop = () => {
    setStops([...stops, { 
      address: 'Destination Stop ' + (stops.length + 1), 
      recipientName: '', 
      recipientPhone: '' 
    }]);
  };

  const handleRemoveStop = (idx) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  const handleStopChange = (index, field, value) => {
    const updated = [...stops];
    updated[index][field] = value;
    setStops(updated);
    setEstimation(null); // Clear estimate on edit
  };

  // Run price calculator
  const handleEstimatePrice = async () => {
    setLoading(true);
    
    // Resolve coordinates dynamically based on text hash
    const pCoords = getCoordsFromAddress(pickup);
    const pickupLoc = { address: pickup, lng: pCoords.lng, lat: pCoords.lat };
    
    const resolvedStops = stops.map(s => {
      const sCoords = getCoordsFromAddress(s.address);
      return {
        address: s.address,
        lng: sCoords.lng,
        lat: sCoords.lat,
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone
      };
    });

    try {
      const res = await fetch(`${API_URL}/api/orders/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupLoc,
          stops: resolvedStops,
          weather: 'clear'
        })
      });
      const data = await res.json();
      if (data.success) {
        setEstimation(data.estimation);
      } else {
        alert(data.message || 'Failed to calculate distance & fare.');
      }
    } catch (err) {
      console.error(err);
      alert('Error calculating fare: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit order
  const handlePlaceOrder = async () => {
    if (!estimation) return;
    setBooking(true);
    
    const pCoords = getCoordsFromAddress(pickup);
    const pickupLoc = { address: pickup, lng: pCoords.lng, lat: pCoords.lat };
    
    const resolvedStops = stops.map(s => {
      const sCoords = getCoordsFromAddress(s.address);
      return {
        address: s.address,
        lng: sCoords.lng,
        lat: sCoords.lat,
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone
      };
    });

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupLoc,
          stops: resolvedStops,
          fare: estimation.fare,
          paymentMethod: 'cash'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveOrder(data.order);
        activeOrderIdRef.current = data.order._id;
        setEstimation(null);
        fetchOrders();
      } else {
        alert(data.message || 'Failed to place booking request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error placing booking: ' + err.message);
    } finally {
      setBooking(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    await fetch(`${API_URL}/api/orders/${orderId}/cancel`, { method: 'PUT' });
    setActiveOrder(null);
    activeOrderIdRef.current = null;
    fetchOrders();
  };

  const handleDismissCompletedOrder = (orderId) => {
    setActiveOrder(null);
    activeOrderIdRef.current = null;
    setRiderCoords(null);
    fetchOrders();
  };

  // Compute live remaining distance dynamically
  const getRemainingDistance = () => {
    if (!activeOrder) return 0;
    if (activeOrder.status === 'delivered') return 0;
    const currentPos = riderCoords || (activeOrder.rider?.currentLocation?.coordinates) || [activeOrder.pickup.lng, activeOrder.pickup.lat];
    
    // Determine the next checkpoint target
    let target = [activeOrder.pickup.lng, activeOrder.pickup.lat];
    if (['picked_up', 'in_transit'].includes(activeOrder.status) && activeOrder.stops.length > 0) {
      target = [activeOrder.stops[0].lng, activeOrder.stops[0].lat];
    }
    
    return calculateDistance(currentPos, target);
  };

  const liveDistance = getRemainingDistance();
  
  // Resolve current pickup coordinate markers
  const currentPickupCoords = getCoordsFromAddress(pickup);
  const currentStopCoords = stops.map(s => {
    const coords = getCoordsFromAddress(s.address);
    return { name: s.address, lng: coords.lng, lat: coords.lat };
  });

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* Forms and Tracking Panel */}
      <div className="lg:col-span-4 flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-1">
        
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

        {/* Active tracking cards with inline glows */}
        {activeOrder ? (
          activeOrder.status === 'delivered' ? (
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
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-white tracking-widest font-display uppercase">
                  DISPATCH COMPLETED!
                </h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Package delivered successfully
                </p>
              </div>

              <div className="w-full border border-slate-800 bg-slate-950/60 rounded p-3 text-xs text-left flex flex-col gap-2">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400">Order ID</span>
                  <span className="font-mono text-white">...{activeOrder._id.substring(18)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400">Total Distance</span>
                  <span className="font-mono text-white">{activeOrder.distanceKm} KM</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Fare Paid</span>
                  <span className="font-mono text-emerald-400">₹{activeOrder.fare?.total}</span>
                </div>
              </div>

              <button
                onClick={() => handleDismissCompletedOrder(activeOrder._id)}
                className="w-full py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16, 185, 129, 0.3)] hover:scale-[1.02]"
              >
                Dismiss & Book New Dispatch
              </button>
            </div>
          ) : (
            <div 
              className="glass-panel-pink p-5 flex flex-col gap-3"
              style={{ boxShadow: '0 0 15px rgba(236, 72, 153, 0.25)', border: '1px solid #ec4899' }}
            >
              <h3 className="text-xs font-bold text-white tracking-widest font-display">TRACKING DELIVERIES</h3>
              
              <div className="text-xs flex flex-col gap-2">
                <p className="text-slate-400">Order ID: <span className="text-white">...{activeOrder._id.substring(18)}</span></p>
                <p className="text-slate-400">Status: <span className="text-pink-400 font-bold uppercase">{getStatusLabel(activeOrder.status)}</span></p>
                
                {/* Dynamic distance indicator */}
                <p className="text-slate-400">
                  Remaining Distance:{' '}
                  <span className="text-cyan-400 font-bold font-mono">
                    {liveDistance > 0 ? `${liveDistance} KM` : 'Arrived'}
                  </span>
                </p>
                <p className="text-slate-400">Total Route Distance: <span className="text-white font-mono">{activeOrder.distanceKm} KM</span></p>
                <p className="text-slate-400">Rider Class: <span className="text-cyan-400 font-bold uppercase">{activeOrder.rider?.vehicleType || 'SEARCHING...'}</span></p>
              </div>

              {activeOrder.rider && (
                <div 
                  className="border rounded p-3 my-2 flex flex-col gap-2"
                  style={{
                    backgroundColor: 'rgba(6, 182, 212, 0.05)',
                    borderColor: 'rgba(6, 182, 212, 0.3)'
                  }}
                >
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Assigned Courier Node</span>
                  {activeOrder.status === 'in_transit' && (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded text-[10px] text-cyan-300 font-bold mb-1 animate-pulse">
                      Rider has accepted and will be there soon.
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-white">
                    <span className="text-slate-400">Name:</span>
                    <span className="font-bold">{activeOrder.rider.user?.name || 'Aether Agent'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-bold font-mono text-cyan-400">{activeOrder.rider.user?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white">
                    <span className="text-slate-400">Rating:</span>
                    <span className="text-pink-400 font-bold">{activeOrder.rider.rating?.toFixed(1) || '5.0'} ★</span>
                  </div>
                </div>
              )}

              {/* Logs timeline lists */}
              <div className="border-t border-slate-700/60 pt-3 flex flex-col gap-2 max-h-[140px] overflow-y-auto">
                {activeOrder.timeline?.slice().reverse().map((t, idx) => (
                  <div key={idx} className="text-[10px] text-slate-400 leading-tight">
                    <span className="text-pink-400">•</span> {t.description}
                  </div>
                ))}
              </div>

              {/* Cancel Order */}
              {['placed', 'searching'].includes(activeOrder.status) && (
                <button
                  onClick={() => handleCancelOrder(activeOrder._id)}
                  className="w-full py-2 bg-rose-900 border border-rose-500 rounded text-xs font-bold uppercase text-white hover:bg-rose-800 transition-colors"
                >
                  Abort Order
                </button>
              )}
            </div>
          )
        ) : (
          /* Book Delivery Form */
          <div 
            className="glass-panel p-5 flex flex-col gap-4"
            style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)' }}
          >
            <h3 className="text-xs font-bold text-white tracking-widest font-display uppercase">NEW BOOKING DECK</h3>

            {/* Pickup Input field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-cyan-400 font-bold uppercase">Pickup Address</label>
              <input
                type="text"
                value={pickup}
                onChange={(e) => {
                  setPickup(e.target.value);
                  setEstimation(null);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                placeholder="Type pickup location (e.g. Indiranagar)"
              />
            </div>

            {/* Stops inputs fields */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-pink-400 font-bold uppercase">Dropoff Stops</span>
                {stops.length < 4 && (
                  <button onClick={handleAddStop} className="text-cyan-400 text-xs font-bold hover:underline">
                    + Add Stop
                  </button>
                )}
              </div>

              {stops.map((stop, idx) => (
                <div key={idx} className="p-3 border border-slate-800 bg-slate-900/60 rounded flex flex-col gap-2 relative">
                  {stops.length > 1 && (
                    <button 
                      onClick={() => handleRemoveStop(idx)} 
                      className="absolute top-2 right-2 text-xs text-slate-500 hover:text-pink-500"
                    >
                      Delete
                    </button>
                  )}
                  
                  <span className="text-[9px] text-pink-400 font-bold">STOP {idx + 1}</span>
                  
                  <input
                    type="text"
                    value={stop.address}
                    onChange={(e) => handleStopChange(idx, 'address', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Type stop address (e.g. Koramangala)"
                  />

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input
                      type="text"
                      value={stop.recipientName}
                      onChange={(e) => handleStopChange(idx, 'recipientName', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none"
                      placeholder="Recipient Name"
                    />
                    <input
                      type="text"
                      value={stop.recipientPhone}
                      onChange={(e) => handleStopChange(idx, 'recipientPhone', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none"
                      placeholder="Recipient Phone"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Estimate button */}
            <button
              onClick={handleEstimatePrice}
              disabled={loading}
              className="w-full py-2.5 rounded text-xs font-bold uppercase border border-cyan-500/40 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Calculate Distance & Fare
            </button>

            {/* Estimate breakdowns details */}
            {estimation && (
              <div className="p-3 border border-cyan-500/20 bg-slate-900 rounded text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Distance</span>
                  <span className="font-bold text-white font-mono">{estimation.distanceKm} KM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time estimate</span>
                  <span className="font-bold text-white font-mono">{estimation.estimatedDurationMin} Mins</span>
                </div>
                <div className="flex justify-between text-cyan-400 font-bold border-t border-slate-800 pt-2">
                  <span>Calculated Fare</span>
                  <span className="font-mono">₹{estimation.fare.total}</span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={booking}
                  className="w-full mt-2.5 py-3 rounded bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:opacity-85"
                >
                  Book Dispatch Job
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Map panel widget */}
      <div className="lg:col-span-8 h-[76vh] min-h-[500px]">
        <CyberpunkMap 
          pickupCoords={activeOrder ? [activeOrder.pickup.lng, activeOrder.pickup.lat] : [currentPickupCoords.lng, currentPickupCoords.lat]} 
          stopsCoords={activeOrder ? activeOrder.stops : currentStopCoords} 
          riderCoords={riderCoords}
          riderType={activeOrder?.rider?.vehicleType || 'drone'}
        />
      </div>

    </div>
  );
}
