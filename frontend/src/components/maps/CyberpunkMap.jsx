import React from 'react';

// Grid streets coordinates
const STREETS = [
  // Horizontal lines
  { y: 80 }, { y: 160 }, { y: 240 }, { y: 320 }, { y: 400 }, { y: 480 },
  // Vertical lines
  { x: 100 }, { x: 220 }, { x: 340 }, { x: 460 }, { x: 580 }, { x: 700 }
];

export default function CyberpunkMap({ 
  pickupCoords, 
  stopsCoords = [], 
  riderCoords, 
  riderType = 'bike',
  liveRiders = [],
  showHeatmap,
  showZones,
  onMapClick
}) {
  
  // Linear coordinate translation logic from GPS to local box [800 x 600]
  const translateGPS = (coords) => {
    if (!coords) return null;
    const minLng = 77.54, maxLng = 77.64;
    const minLat = 12.92, maxLat = 13.02;
    
    const x = 100 + ((coords[0] - minLng) / (maxLng - minLng)) * 600;
    const y = 480 - ((coords[1] - minLat) / (maxLat - minLat)) * 400;
    
    return {
      x: Math.max(20, Math.min(780, x)),
      y: Math.max(20, Math.min(580, y))
    };
  };

  const handleSvgClick = (e) => {
    if (!onMapClick) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 800;
    const clickY = ((e.clientY - rect.top) / rect.height) * 600;
    
    const minLng = 77.54, maxLng = 77.64;
    const minLat = 12.92, maxLat = 13.02;
    
    // Reverse coordinate mapping
    const lng = minLng + ((clickX - 100) / 600) * (maxLng - minLng);
    const lat = minLat + ((480 - clickY) / 400) * (maxLat - minLat);
    
    const finalLng = parseFloat(Math.max(minLng, Math.min(maxLng, lng)).toFixed(6));
    const finalLat = parseFloat(Math.max(minLat, Math.min(maxLat, lat)).toFixed(6));
    
    onMapClick([finalLng, finalLat]);
  };

  const startPt = translateGPS(riderCoords);
  const pickupPt = translateGPS(pickupCoords);
  const stopPts = stopsCoords.map(s => translateGPS([s.lng, s.lat]));

  // Build SVG path string for route
  let routePath = '';
  if (startPt && pickupPt) {
    routePath = `M ${startPt.x} ${startPt.y} L ${pickupPt.x} ${pickupPt.y}`;
    stopPts.forEach(pt => {
      if (pt) {
        routePath += ` L ${pt.x} ${pt.y}`;
      }
    });
  }

  return (
    <div className="relative w-full h-full border border-slate-700 rounded-lg bg-slate-950 overflow-hidden select-none">
      
      {/* Top Banner Indicator */}
      <div className="absolute top-3 left-3 bg-slate-800/90 px-3 py-1 border border-slate-700 rounded flex items-center gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">ACTIVE MAP FEED</span>
      </div>

      {onMapClick && (
        <div className="absolute bottom-3 left-3 bg-slate-900/90 px-3 py-1 border border-pink-500/40 rounded z-10 text-[9px] text-pink-400 font-bold uppercase tracking-wider">
          * CLICK ON GRID TO RE-POSITION COURIER NODE *
        </div>
      )}

      <svg 
        viewBox="0 0 800 600" 
        className={`w-full h-full ${onMapClick ? 'cursor-crosshair' : ''}`}
        onClick={handleSvgClick}
      >
        {/* Background grids */}
        <defs>
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />

        {/* Street Lines */}
        {STREETS.map((street, i) => (
          <line
            key={i}
            x1={street.x !== undefined ? street.x : 20}
            y1={street.y !== undefined ? street.y : 20}
            x2={street.x !== undefined ? street.x : 780}
            y2={street.y !== undefined ? street.y : 580}
            stroke="rgba(71, 85, 105, 0.3)"
            strokeWidth="2"
          />
        ))}

        {/* Route Path Line */}
        {routePath && (
          <path
            d={routePath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
            strokeDasharray="6,4"
          />
        )}

        {/* Live Active Riders */}
        {liveRiders.map((r, i) => {
          const pt = translateGPS(r.currentLocation.coordinates);
          if (!pt) return null;
          const isBusy = r.status === 'busy';
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="6" fill={isBusy ? '#ec4899' : '#06b6d4'} />
              <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke={isBusy ? '#ec4899' : '#06b6d4'} strokeWidth="1" opacity="0.4" className="animate-ping" />
              <text x={pt.x + 8} y={pt.y - 4} fill="#94a3b8" fontSize="8">{r.vehicleType.toUpperCase()}</text>
            </g>
          );
        })}

        {/* Pickup Pin */}
        {pickupPt && (
          <g>
            <circle cx={pickupPt.x} cy={pickupPt.y} r="8" fill="#10b981" />
            <circle cx={pickupPt.x} cy={pickupPt.y} r="4" fill="#ffffff" />
            <text x={pickupPt.x + 12} y={pickupPt.y + 4} fill="#10b981" fontSize="11" fontWeight="bold">PICKUP</text>
          </g>
        )}

        {/* Stop Dropoff Pins */}
        {stopPts.map((pt, idx) => {
          if (!pt) return null;
          return (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="8" fill="#f43f5e" />
              <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" />
              <text x={pt.x + 12} y={pt.y + 4} fill="#f43f5e" fontSize="11" fontWeight="bold">STOP {idx + 1}</text>
            </g>
          );
        })}

        {/* Assigned Rider Indicator */}
        {startPt && (
          <g>
            <circle cx={startPt.x} cy={startPt.y} r="9" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
            <polygon 
              points={`${startPt.x},${startPt.y - 4} ${startPt.x - 3},${startPt.y + 3} ${startPt.x + 3},${startPt.y + 3}`} 
              fill="#ffffff" 
            />
            <text x={startPt.x - 15} y={startPt.y - 12} fill="#ffffff" fontSize="9" fontWeight="bold">
              {riderType.toUpperCase()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
