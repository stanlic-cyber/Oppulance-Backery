import { useState, useEffect } from 'react';
import { useLocation } from './LocationContext';
import axios from 'axios';

// Generic hook to fetch live data from the backend. Uses local fallback endpoints when external APIs are not configured.
function useLiveData<T>(type: string) {
  const { location } = useLocation();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only attempt fetch if we have a country context
    if (!location.country) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("nc_jwt_token");
        const params = new URLSearchParams();
        if (location.country) params.append("country", location.country);
        if (location.province) params.append("province", location.province);

        const response = await axios.get(`/api/live-data/${type}?${params.toString()}`, {
          headers: {
            "Authorization": token ? `Bearer ${token}` : ""
          }
        });
        
        if (isMounted) {
          setData(response.data);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(`Error fetching ${type}:`, err);
          if (err.response?.status === 503) {
            setError("Live search requires an API key setup in the backend.");
          } else {
            setError("Live data is temporarily unavailable.");
          }
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [location, type]);

  return { data, loading, error };
}

// Interfaces for typed returns
export interface MarketPrice {
  crop: string;
  price: string;
  trend: 'up' | 'down' | 'stable';
  source?: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  url?: string;
}

export interface DiseaseAlert {
  threat: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface ClimateData {
  forecast: string;
  risks: string[];
}

export interface AgriculturalData {
  season: string;
  status: string;
  insights: string[];
}

export function useMarketPrices() {
  return useLiveData<MarketPrice[]>("market-prices");
}

export function useNearbyBusinesses(type: 'agro_dealer' | 'seedco' | 'market' | 'buyer' | 'warehouse' | 'office') {
  // We can leave this as unavailable for now or implement an OSM Nominatim fetch if needed
  return useLiveData<any>("nearby-businesses");
}

export function useNews() {
  return useLiveData<NewsItem[]>("news");
}

export function useDiseaseAlerts() {
  return useLiveData<DiseaseAlert[]>("disease-alerts");
}

export function usePestAlerts() {
  return useLiveData<DiseaseAlert[]>("disease-alerts"); // Shared with disease
}

export function useClimateData() {
  return useLiveData<ClimateData>("climate-data");
}

export function useAgriculturalData() {
  return useLiveData<AgriculturalData>("agricultural-data");
}

export function useYieldForecast() {
  return useLiveData<any>("yield-forecast");
}
