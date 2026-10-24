import { useState, useEffect } from 'react';

export function useNetworkSpeed() {
  const [speed, setSpeed] = useState('unknown');
  useEffect(() => {
    const conn = navigator.connection;
    if (conn) {
      const update = () => setSpeed(conn.effectiveType || 'unknown');
      update();
      conn.addEventListener('change', update);
      return () => conn.removeEventListener('change', update);
    }
  }, []);
  return speed;
}
