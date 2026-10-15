import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  village: string | null;
  loading: boolean;
  error: string | null;
}

interface LocationContextType {
  location: LocationData;
  requestLocation: () => Promise<void>;
  setLocationManually: (data: Partial<LocationData>) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    country: null,
    province: null,
    district: null,
    ward: null,
    village: null,
    loading: false,
    error: null,
  });

  const persistLocationToBackend = (data: Partial<LocationData>) => {
    const token = localStorage.getItem('nc_jwt_token');
    if (!token) return;
    void fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }).catch(() => undefined);
  };

  useEffect(() => {
    const savedLocation = localStorage.getItem('nc_location');
    if (savedLocation) {
      try {
        setLocation(prev => ({ ...prev, ...JSON.parse(savedLocation) }));
      } catch {
        localStorage.removeItem('nc_location');
      }
    }
  }, []);

  const fetchAddressFromCoords = async (lat: number, lon: number): Promise<Partial<LocationData>> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        return {
          country: address.country || 'Zimbabwe',
          province: address.state || address.region || 'Harare',
          district: address.county || address.state_district || null,
          ward: address.suburb || null,
          village: address.village || address.town || address.city || null,
        };
      }
    } catch (e) {
      console.error("Failed to reverse geocode", e);
    }

    return {
      country: 'Zimbabwe',
      province: 'Harare',
      district: null,
      ward: null,
      village: null,
    };
  };

  const requestLocation = async () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        country: prev.country || 'Zimbabwe',
        province: prev.province || 'Harare',
        district: prev.district || null,
        ward: prev.ward || null,
        village: prev.village || null,
        loading: false,
        error: 'Geolocation is not supported by your browser. You can continue with a manual location.'
      }));
      return;
    }

    if (typeof navigator.geolocation.getCurrentPosition !== 'function') {
      setLocation(prev => ({
        ...prev,
        country: prev.country || 'Zimbabwe',
        province: prev.province || 'Harare',
        district: prev.district || null,
        ward: prev.ward || null,
        village: prev.village || null,
        loading: false,
        error: 'Geolocation is unavailable in this browser. You can continue with a manual location.'
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await fetchAddressFromCoords(latitude, longitude);

        setLocation({
          latitude,
          longitude,
          country: address.country || 'Zimbabwe',
          province: address.province || null,
          district: address.district || null,
          ward: address.ward || null,
          village: address.village || null,
          loading: false,
          error: null,
        });
        const savedLocation = {
          latitude,
          longitude,
          country: address.country || 'Zimbabwe',
          province: address.province || null,
          district: address.district || null,
          ward: address.ward || null,
          village: address.village || null,
        };
        localStorage.setItem('nc_location', JSON.stringify(savedLocation));
        persistLocationToBackend(savedLocation);
      },
      (error) => {
        const message = error && typeof error.message === 'string'
          ? error.message
          : 'Unable to access location permissions';

        setLocation(prev => ({
          ...prev,
          country: prev.country || 'Zimbabwe',
          province: prev.province || 'Harare',
          district: prev.district || null,
          ward: prev.ward || null,
          village: prev.village || null,
          loading: false,
          error: `${message}. You can continue with a manual location entry.`,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const setLocationManually = (data: Partial<LocationData>) => {
    setLocation(prev => ({ ...prev, ...data }));
    localStorage.setItem('nc_location', JSON.stringify(data));
    persistLocationToBackend(data);
  };

  return (
    <LocationContext.Provider value={{ location, requestLocation, setLocationManually }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
