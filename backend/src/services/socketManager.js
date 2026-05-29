/**
 * Real-time Connection Manager
 * Handles socket.io listeners, coordinates syncs, and simulation events.
 */

const Rider = require('../models/Rider');

// Mappings of user IDs and rider IDs to active sockets
const userSockets = {};
const riderSockets = {};
let ioInstance = null;

const init = (io) => {
  ioInstance = io;
  console.log('Socket server initialized successfully');

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register active user session
    socket.on('register', ({ userId, role, riderId }) => {
      socket.userId = userId;
      socket.role = role;
      
      userSockets[userId] = socket.id;
      
      if (role === 'rider' && riderId) {
        socket.riderId = riderId;
        riderSockets[riderId] = socket.id;
        socket.join(`rider:${riderId}`);
        console.log(`Rider registered on socket: ${riderId} and joined room rider:${riderId}`);
      } else if (role === 'admin') {
        socket.join('admins');
        console.log(`Admin registered on socket: ${userId} and joined room admins`);
      } else {
        console.log(`User registered on socket: ${userId}`);
      }
    });

    // Handle rider location stream
    socket.on('rider:location_update', async ({ riderId, coordinates, batteryLevel }) => {
      try {
        const rider = await Rider.findById(riderId);
        if (rider) {
          rider.currentLocation.coordinates = coordinates;
          if (batteryLevel !== undefined) {
            rider.batteryLevel = batteryLevel;
          }
          await rider.save();

          // Broadcast location to listener clients
          io.emit(`rider:${riderId}:location`, { coordinates, batteryLevel });
          
          // Broadcast to admin dashboard
          io.to('admins').emit('admin:rider_moved', {
            riderId,
            coordinates,
            batteryLevel
          });
        }
      } catch (err) {
        console.error('Error updating location via socket:', err.message);
      }
    });

    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`Joined room: ${room}`);
    });

    // Simulators
    socket.on('simulation:weather_change', ({ condition, delayMinutes }) => {
      io.emit('system:weather_update', { condition, delayMinutes });
    });

    socket.on('simulation:drone_alert', ({ droneId, status, coords }) => {
      io.emit('system:drone_telemetry', { droneId, status, coords });
    });

    socket.on('ticket:message', ({ ticketId, message }) => {
      io.to(`ticket:${ticketId}`).emit('ticket:new_message', message);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      if (socket.userId) {
        delete userSockets[socket.userId];
      }
      if (socket.riderId) {
        delete riderSockets[socket.riderId];
      }
    });
  });
};

const sendToUser = (userId, event, data) => {
  const socketId = userSockets[userId];
  if (socketId && ioInstance) {
    ioInstance.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const sendToRider = (riderId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`rider:${riderId}`).emit(event, data);
    return true;
  }
  return false;
};

const sendToRoom = (room, event, data) => {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
    return true;
  }
  return false;
};

const broadcast = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

module.exports = {
  init,
  sendToUser,
  sendToRider,
  sendToRoom,
  broadcast
};
