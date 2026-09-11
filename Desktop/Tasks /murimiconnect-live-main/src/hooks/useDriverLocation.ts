import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

export const useDriverLocation = () => {
  const { user, role } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!user || role !== 'driver') return;

    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading,
      speed: position.coords.speed ? position.coords.speed * 3.6 : null, // Convert m/s to km/h
    };

    setCurrentLocation(locationData);

    try {
      // Upsert location to database
      const { error: upsertError } = await supabase
        .from('driver_locations')
        .upsert({
          driver_id: user.id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          heading: locationData.heading,
          speed: locationData.speed,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'driver_id',
        });

      if (upsertError) {
        console.error('Error updating location:', upsertError);
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }, [user, role]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let message = 'Unable to get location';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access in your browser settings.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case err.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    setError(message);
    toast.error(message);
  }, []);

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setIsTracking(true);

    // Update driver presence to online
    if (user && role === 'driver') {
      try {
        await supabase
          .from('driver_profiles')
          .update({
            is_online: true,
            current_status: 'available',
            last_seen: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error updating online status:', err);
      }
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Accept position up to 5 seconds old
      }
    );
  }, [user, role, updateLocation, handleError]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setCurrentLocation(null);
    
    // Update driver presence to offline
    if (user && role === 'driver') {
      try {
        await supabase
          .from('driver_profiles')
          .update({
            is_online: false,
            current_status: 'offline',
            last_seen: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error updating offline status:', err);
      }
    }
  }, [user, role]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentLocation,
    error,
    startTracking,
    stopTracking,
  };
};