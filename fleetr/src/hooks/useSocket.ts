import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let newSocket: Socket | null = null;

    const initSocket = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      newSocket = io('/', {
        auth: { token },
        path: '/socket.io'
      });

      newSocket.on('connect', () => setIsConnected(true));
      newSocket.on('disconnect', () => setIsConnected(false));
      newSocket.on('db_update', (data: any) => {
        console.log('DB Update received', data);
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return { socket, isConnected };
};
