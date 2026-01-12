

import { useCallback, useEffect, useRef, useState } from "react";

export default function useLiveLocation() {
  const watchIdRef = useRef(null);

  const [status, setStatus] = useState("idle"); 
  // idle | requesting | ready | denied | unavailable | timeout | error

  const [coords, setCoords] = useState(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    // Hindari double watch
    if (watchIdRef.current !== null) return;

    setStatus("requesting");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });

        setStatus("ready");
      },
      (err) => {
        switch (err.code) {
          case 1:
            setStatus("denied");
            break;
          case 2:
            setStatus("unavailable");
            break;
          case 3:
            setStatus("timeout");
            break;
          default:
            setStatus("error");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    coords,
    status,
    isReady: status === "ready",
    isRequesting: status === "requesting",
    start,
    stop,
  };
}
