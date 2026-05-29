import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = 'https://individual-wp27.onrender.com';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, riderProfile } = useAuth();

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('⚡ Connected to Aether Socket Matrix:', socket.id);

      if (user) {
        socket.emit('register', {
          userId: user._id,
          role: user.role,
          riderId: riderProfile ? riderProfile._id : null
        });
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, user, riderProfile]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
