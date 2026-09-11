import React, { useState } from "react";
import { 
  CloudRain, 
  MapPin, 
  Bell, 
  Droplets,
  Wind,
  Sun,
  ChevronRight,
  Sprout,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  Home,
  MessageSquare,
  TrendingUp,
  User
} from "lucide-react";
import { useLocation } from "../lib/LocationContext";
import { useWeather } from "../lib/WeatherService";
import { useDiseaseAlerts, useAgriculturalData } from "../lib/LiveDataService";

export function FarmerDashboard() {
  const [activeTab, setActiveTab] = useState<"home" | "ai" | "alerts" | "me" | "market">("home");
  const { location } = useLocation();
  const { weather, loading: weatherLoading, error: weatherError } = useWeather();
  const { data: diseaseAlerts, loading: diseaseLoading, error: diseaseError } = useDiseaseAlerts();
  const { data: agData, loading: agLoading, error: agError } = useAgriculturalData();

  const locationDisplay = location.village || location.ward || location.district || location.province || location.country || "Locating...";

  return (
    <div className="relative h-screen w-full bg-gray-50 overflow-x-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-16 pb-6 rounded-b-4xl shadow-sm border-b border-gray-100 z-10 relative">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1 font-mono">Location Overview</p>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h1 className="text-gray-900 font-display font-semibold text-xl tracking-tight line-clamp-1">{locationDisplay}</h1>
            </div>
            {location.country && <p className="text-xs text-gray-400 mt-1">{location.province}, {location.country}</p>}
          </div>
          <button type="button" aria-label="View notifications" className="relative p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors shrink-0">
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
        </div>

        {/* Primary Weather Card */}
        {weatherLoading ? (
          <div className="bg-linear-to-br from-[#022A1E] to-[#0A4A36] rounded-3xl p-8 flex items-center justify-center shadow-lg">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : weatherError ? (
          <div className="bg-linear-to-br from-[#022A1E] to-[#0A4A36] rounded-3xl p-6 shadow-lg shadow-emerald-900/20 text-emerald-100 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
            {weatherError}
          </div>
        ) : weather ? (
          <div className="bg-linear-to-br from-[#022A1E] to-[#0A4A36] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-emerald-900/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <CloudRain className="w-32 h-32" />
            </div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <p className="text-emerald-300 text-sm font-medium mb-1">Today's Forecast</p>
                <div className="flex items-end space-x-2">
                  <span className="text-5xl font-display font-light">{Math.round(weather.currentTemp)}°</span>
                  <span className="text-xl text-emerald-200 mb-1">C</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1">
                <CloudRain className="w-4 h-4 text-emerald-300" />
                <span className="text-sm font-medium text-emerald-50">{weather.rainfallToday}mm Rain</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 relative z-10">
              <div className="flex flex-col space-y-1">
                <Droplets className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-200">Humidity</span>
                <span className="text-sm font-medium">{Math.round(weather.humidity)}%</span>
              </div>
              <div className="flex flex-col space-y-1">
                <Wind className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-200">Wind</span>
                <span className="text-sm font-medium">{Math.round(weather.windSpeed)} km/h</span>
              </div>
              <div className="flex flex-col space-y-1">
                <Sun className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-200">UV Index</span>
                <span className="text-sm font-medium">{weather.uvIndex}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1 pb-28">
        {diseaseError ? (
          <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-2xl flex items-center space-x-3 text-red-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{diseaseError}</p>
          </div>
        ) : diseaseLoading ? (
           <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : diseaseAlerts && diseaseAlerts.length > 0 ? (
          <div id="disease-section" className="space-y-3">
             <h3 className="text-gray-900 font-display font-semibold text-lg flex items-center"><AlertTriangle className="w-5 h-5 text-red-500 mr-2" /> Regional Alerts</h3>
             {diseaseAlerts.map((alert, i) => (
               <div key={i} className={`p-4 rounded-2xl border flex items-start space-x-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-100 text-red-900' : alert.severity === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
                 <div className="flex-1">
                   <h4 className="text-sm font-semibold tracking-tight mb-1">{alert.threat}</h4>
                   <p className="text-xs leading-relaxed opacity-80">{alert.description}</p>
                 </div>
               </div>
             ))}
          </div>
        ) : null}

        {agError ? (
          <div className="bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl flex items-center space-x-3 text-slate-600 text-xs">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            <p>{agError}</p>
          </div>
        ) : agLoading ? (
           <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : agData && agData.season ? (
          <div className="space-y-3">
             <h3 className="text-gray-900 font-display font-semibold text-lg flex items-center"><Sprout className="w-5 h-5 text-[#0B7A4B] mr-2" /> Agricultural Insights</h3>
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{agData.season}</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{agData.status}</span>
                </div>
                <ul className="space-y-2">
                  {agData.insights.map((insight, idx) => (
                     <li key={idx} className="text-xs text-slate-600 flex items-start">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B7A4B] mr-1.5 mt-0.5 shrink-0" />
                        <span>{insight}</span>
                     </li>
                  ))}
                </ul>
             </div>
          </div>
        ) : null}

        {/* AI Action Plan Placeholder */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-gray-900 font-display font-semibold text-lg">AI Action Plan</h3>
            <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700 transition">See all</button>
          </div>
          
          <div className="space-y-3">
             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start space-x-4">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 shrink-0 mt-1">
                <MapIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 tracking-tight mb-1">Generating Location Insights...</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  NeuroCrop AI is analyzing current weather conditions for {locationDisplay} to provide personalized recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* FAB */}
      <button aria-label="Ask AI Assistant" onClick={() => setActiveTab('ai')} className="absolute bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center p-4 bg-gray-900 text-white rounded-full shadow-xl shadow-gray-900/30 cursor-pointer hover:bg-gray-800 transition-transform hover:scale-105 active:scale-95 space-x-2 z-50">
         <span className="font-semibold text-sm pl-2">Ask AI Assistant</span>
         <div className="bg-emerald-500 p-2 rounded-full">
            <span className="block w-4 h-4 bg-white/20 rounded-full animate-pulse" />
         </div>
      </button>

      {/* Bottom navigation (always visible) - fills screen layout */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button 
          onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'home' ? 'text-[#0B7A4B]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('ai'); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
          className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'ai' ? 'text-[#0B7A4B]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Ask AI</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('market'); /* optional: scroll to market section if present */ }}
          className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'market' ? 'text-[#0B7A4B]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Market</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('me'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'me' ? 'text-[#0B7A4B]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Me</span>
        </button>
      </div>

    </div>
  );
}
