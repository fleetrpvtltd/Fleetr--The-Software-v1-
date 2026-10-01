import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '../lib/firebase';
import { useAppStore } from '../store/app-store';

export const useSocket = (onDbUpdate: () => void) => {
  const socketRef = useRef<Socket | null>(null);
  const setSocketConnected = useAppStore((state) => state.setSocketConnected);

  useEffect(() => {
    const connectSocket = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      socketRef.current = io('/', {
        auth: { token },
        path: '/socket.io',
      });

      socketRef.current.on('connect', () => {
        setSocketConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        setSocketConnected(false);
      });

      socketRef.current.on('db_update', () => {
        onDbUpdate();
      });
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onDbUpdate, setSocketConnected]);
};
