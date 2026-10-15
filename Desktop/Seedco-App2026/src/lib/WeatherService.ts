import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from './LocationContext';

export interface WeatherData {
  currentTemp: number;
  rainfallToday: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  forecast: { date: string, maxTemp: number, minTemp: number, precipitation: number }[];
}

export function useWeather() {
  const { location } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      if (!location.latitude || !location.longitude) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&hourly=uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const response = await axios.get(url);
        const data = response.data;
        
        const currentUvIndex = data.hourly.uv_index[new Date().getHours()] || 0;
        
        const forecast = data.daily.time.map((timeStr: string, index: number) => ({
          date: timeStr,
          maxTemp: data.daily.temperature_2m_max[index],
          minTemp: data.daily.temperature_2m_min[index],
          precipitation: data.daily.precipitation_sum[index],
        }));

        setWeather({
          currentTemp: data.current.temperature_2m,
          rainfallToday: data.current.precipitation,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          uvIndex: currentUvIndex,
          forecast: forecast.slice(0, 7), // 7 day forecast
        });
      } catch (err) {
        console.error("Weather fetch failed", err);
        setError("Live data is temporarily unavailable. Please refresh or try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [location.latitude, location.longitude]);

  return { weather, loading, error };
}
