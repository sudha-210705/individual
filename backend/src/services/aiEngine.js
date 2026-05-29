/**
 * AI Services Engine
 * Handles basic route ordering, nearest rider matching, ETA estimations, and chatbot replies.
 */

// Simple distance helper using Euclidean formula
const calculateDistance = (point1, point2) => {
  const diffX = point1.lng - point2.lng;
  const diffY = point1.lat - point2.lat;
  return Math.sqrt(diffX * diffX + diffY * diffY) * 100; // Returns rough km
};

/**
 * AI Route Optimizer
 * Orders stops based on simple distance comparison
 */
const optimizeRoute = (pickup, stops) => {
  if (!stops || stops.length <= 1) return stops;
  
  const orderedStops = [];
  const remainingStops = [...stops];
  let currentPosition = pickup;
  
  while (remainingStops.length > 0) {
    let nearestIndex = 0;
    let shortestDistance = calculateDistance(currentPosition, remainingStops[0]);
    
    for (let i = 1; i < remainingStops.length; i++) {
      const dist = calculateDistance(currentPosition, remainingStops[i]);
      if (dist < shortestDistance) {
        shortestDistance = dist;
        nearestIndex = i;
      }
    }
    
    currentPosition = remainingStops[nearestIndex];
    orderedStops.push(remainingStops.splice(nearestIndex, 1)[0]);
  }
  
  return orderedStops;
};

/**
 * Rider Assignment Algorithm
 * Finds the closest available rider and ranks them
 */
const findOptimalRiders = (pickupCoords, riders) => {
  if (!riders || riders.length === 0) return [];
  
  const pickupPoint = { lng: pickupCoords[0], lat: pickupCoords[1] };
  
  const riderScores = riders.map(rider => {
    const riderPoint = { 
      lng: rider.currentLocation.coordinates[0], 
      lat: rider.currentLocation.coordinates[1] 
    };
    const distance = calculateDistance(pickupPoint, riderPoint);
    
    // Simple cost calculation: closer is better, higher rating is better
    let score = distance;
    if (rider.rating) {
      score -= rider.rating * 0.5; // High rating reduces the cost score
    }
    if (rider.vehicleType === 'drone') {
      score -= 1; // Slight preference for drones
    }
    
    return { rider, distance, score };
  });

  // Sort so that the lowest cost score is first
  return riderScores.sort((a, b) => a.score - b.score);
};

/**
 * Predicts delivery ETA
 */
const predictETA = (distanceKm, stopsCount, weatherCondition = 'clear') => {
  // Assume average speed is 30 km/h
  let timeInMinutes = (distanceKm / 30) * 60;
  
  // Add 5 minutes for each stop
  timeInMinutes += (stopsCount + 1) * 5;
  
  // Weather delays
  let delay = 0;
  if (weatherCondition === 'rainy') {
    delay = 10;
  } else if (weatherCondition === 'stormy') {
    delay = 20;
  }
  
  return {
    totalDurationMin: Math.round(timeInMinutes + delay),
    delayMinutes: delay,
    trafficDelay: 2
  };
};

/**
 * Calculates surge pricing multiplier
 */
const calculateSurgePricing = (activeOrdersCount, activeRidersCount, weatherCondition = 'clear') => {
  let multiplier = 1.0;
  
  if (activeRidersCount === 0) {
    return 1.5;
  }
  
  const ratio = activeOrdersCount / activeRidersCount;
  if (ratio > 1.5) {
    multiplier = 1.3;
  } else if (ratio > 1.0) {
    multiplier = 1.1;
  }
  
  if (weatherCondition === 'rainy') {
    multiplier += 0.2;
  } else if (weatherCondition === 'stormy') {
    multiplier += 0.4;
  }
  
  return parseFloat(multiplier.toFixed(2));
};

/**
 * Simple chatbot assistant helper
 */
const getAIChatResponse = async (userPrompt, userRole = 'customer') => {
  const text = userPrompt.toLowerCase();
  
  if (text.includes('status') || text.includes('where')) {
    return "Rider is heading to the next stop. Current ETA is about 8 minutes. You can check the live tracking map for updates.";
  }
  if (text.includes('price') || text.includes('surge')) {
    return "Surge pricing is calculated automatically when there are more orders than riders in the area or during bad weather.";
  }
  if (text.includes('drone')) {
    return "Autonomous drones are dispatched for small payloads under 5kg to avoid street traffic.";
  }
  
  return "Hello! I am your helper bot. How can I assist you with your orders or account today?";
};

module.exports = {
  optimizeRoute,
  findOptimalRiders,
  predictETA,
  calculateSurgePricing,
  getAIChatResponse
};
