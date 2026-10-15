import React, { useState, useEffect } from "react";
import { 
  Home, MessageSquare, TrendingUp, User, 
  CloudSun, AlertTriangle, ShieldCheck, Activity,
  Leaf, Sprout, MapPin,
  Search, Send, Upload, Mic, ChevronRight, Settings, Plus, Camera,
  Map
} from "lucide-react";
import { LanguageDropdown } from "./LanguageDropdown";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageKey, t } from "../lib/i18n";
import { authService } from "../lib/auth-service";
import { useLocation } from "../lib/LocationContext";
import { useWeather } from "../lib/WeatherService";
import { useMarketPrices } from "../lib/LiveDataService";

export function Dashboard({ onLogout, onEditProfile }: { onLogout?: () => void, onEditProfile?: () => void }) {
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [activeTab, setActiveTab] = useState<"home" | "ai" | "market" | "me">("home");
  const [chatMessage, setChatMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null);
  const [learningSeed, setLearningSeed] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const profilePicRef = React.useRef<HTMLInputElement>(null);
  const recordingIntervalRef = React.useRef<number | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const { location } = useLocation();
  const { weather, loading: weatherLoading, error: weatherError } = useWeather();
  const { data: liveMarketPrices, loading: marketLoading, error: marketError } = useMarketPrices();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;

    setUserData(user);
    setNotifications([]);
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const userName = userData ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.name || userData.email : "";
  const locationName = location.village || location.ward || location.district || location.province || location.country || "Location unavailable";

  const handleDashboardAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    try {
      if (authMode === "login") {
        await authService.signIn(authEmail, authPassword, "farmer");
      } else {
        await authService.signUp({ email: authEmail, role: "farmer", firstName: "", lastName: "" }, authPassword);
      }
    } catch (error: any) {
      setAuthError(error?.message || "Unable to authenticate farmer account.");
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    const currentMessage = chatMessage;
    const newHistory = [...chatHistory, { role: 'user' as const, text: currentMessage }];
    setChatHistory(newHistory);
    setChatMessage("");
    
    try {
      const token = localStorage.getItem("nc_jwt_token");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ message: currentMessage, language })
      });
      
      const data = await response.json();
      if (data.reply) {
        const updatedHistory = [...newHistory, { role: 'ai' as const, text: data.reply }];
        setChatHistory(updatedHistory);
      } else {
        setChatHistory([...newHistory, { role: 'ai', text: "Sorry, I couldn't process that request." }]);
      }
    } catch (err) {
      setChatHistory([...newHistory, { role: 'ai', text: "Connection error. Please try again later." }]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, source: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const newHistory = [...chatHistory, { role: 'user' as const, text: `[${source} Uploaded]: ${file.name}` }];
      setChatHistory(newHistory);
      
      setTimeout(() => {
        setChatHistory([...newHistory, {
          role: 'ai',
          text: `I've analyzed the image you provided. I detect signs of Nitrogen deficiency. Consider applying a top-dressing fertilizer.\n\nConfidence: 85% | Yield Impact: +10%`
        }]);
      }, 1500);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
      const newHistory = [...chatHistory, { role: 'user' as const, text: `[Voice Note]: 00:${recordingTime.toString().padStart(2, '0')} audio` }];
      setChatHistory(newHistory);
      setRecordingTime(0);
      
      setTimeout(() => {
        setChatHistory([...newHistory, {
          role: 'ai',
          text: `I heard your voice note. Based on your description of the leaves turning yellow, it sounds like nutrient deficiency or poor drainage. Let's monitor the moisture levels.\n\nConfidence: 78%`
        }]);
      }, 1500);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const [pushEnabled, setPushEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [passwordMode, setPasswordMode] = useState(false);

  const handleActionClick = (action: string) => {
    setModalTitle(action);
    if (action === 'View Catalog') setCatalogCategory(null);
    setShowModal(true);
    setPasswordMode(false);
  };

  const renderHome = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-[#0B7A4B] text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-white/80 text-sm font-medium">NeuroSeedco Crop AI</p>
            <h1 className="text-2xl font-bold">{greeting}, {userName}!</h1>
            <p className="text-white/75 text-xs mt-1">{locationName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageDropdown language={language} setLanguage={setLanguage} />
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CloudSun className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
          {weatherLoading && <p className="text-sm text-white/80">Loading live weather...</p>}
          {weatherError && <p className="text-sm text-amber-100">{weatherError}</p>}
          {weather && (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-light">{Math.round(weather.currentTemp)}°C</p>
                <p className="text-sm text-white/80">{weather.rainfallToday} mm rain today</p>
              </div>
              <div className="text-right text-sm text-white/80 space-y-1">
                <p>Humidity {Math.round(weather.humidity)}%</p>
                <p>Wind {Math.round(weather.windSpeed)} km/h</p>
                <p>UV index {weather.uvIndex}</p>
              </div>
            </div>
          )}
          {!weatherLoading && !weatherError && !weather && (
            <p className="text-sm text-white/80">Set your location to see live weather.</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-2">Your dashboard</h3>
          <p className="text-sm text-slate-600">Live farm recommendations will appear here when data becomes available.</p>
        </div>
      </div>
    </div>
  );

  const renderAskAI = () => (
    <div className="flex flex-col h-screen bg-slate-50 pb-16">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10 relative">
        <div>
          <h2 className="font-bold text-lg text-slate-900 flex items-center">
            NeuroSeedco Crop AI <ShieldCheck className="w-4 h-4 text-[#0B7A4B] ml-1" />
          </h2>
          <p className="text-xs text-slate-500">Your Personal Agronomist</p>
        </div>
        <button type="button" aria-label="Open settings" onClick={() => handleActionClick('Settings')} className="p-2 bg-slate-100 rounded-full text-slate-600">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {chatHistory.length === 0 && (
          <div className="min-h-72 flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-2xl font-semibold text-slate-900">How can I help with your farm?</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md">Ask about crops, planting dates, weather, pests, or SeedCo products.</p>
          </div>
        )}
        
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-[#0B7A4B] flex items-center justify-center shrink-0 mr-3 mt-1">
                <Activity className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`${
              msg.role === 'user' 
                ? 'bg-[#0B7A4B] text-white rounded-2xl rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-none'
            } p-3 sm:p-4 shadow-sm max-w-[85%] whitespace-pre-wrap text-sm`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-white border-t border-slate-200 shrink-0 mb-safe">
        <input 
          type="file" 
          accept="image/*" 
          ref={cameraInputRef} 
          aria-label="Upload an image from camera"
          className="hidden" 
          onChange={(e) => handleFileUpload(e, 'Camera')} 
        />
        <input 
          type="file" 
          accept="image/*,application/pdf" 
          ref={fileInputRef} 
          aria-label="Upload a file"
          className="hidden" 
          onChange={(e) => handleFileUpload(e, 'File')} 
        />
        <div className="flex items-end space-x-2">
          <div className="flex space-x-1 mb-1">
            <button type="button" aria-label="Upload photo from camera" onClick={() => cameraInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full transition-colors shrink-0">
              <Camera className="w-5 h-5" />
            </button>
            <button type="button" aria-label="Upload a file" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full transition-colors shrink-0">
              <Upload className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 flex items-end relative">
            <textarea 
              placeholder={isRecording ? `Recording... 00:${recordingTime.toString().padStart(2, '0')}` : "Ask me anything..."} 
              value={chatMessage}
              disabled={isRecording}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-transparent border-none text-sm p-3 max-h-32 min-h-11 resize-none focus:ring-0 outline-none"
              rows={1}
              aria-label="Chat message"
            />
            <button 
              type="button"
              aria-label="Send message"
              onClick={handleSendMessage}
              disabled={!chatMessage.trim() || isRecording}
              className="p-2 text-[#0B7A4B] disabled:text-slate-400 hover:bg-[#0B7A4B]/10 rounded-full transition-colors mb-1 mr-1 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <button 
            type="button"
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
            onClick={toggleRecording} 
            className={`p-3 rounded-full transition-colors shrink-0 shadow-sm mb-0.5 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-[#0B7A4B] hover:bg-[#09663E] text-white'}`}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const [dealers, setDealers] = useState<any[]>([
    { name: "Farm & City Centre", lat: -17.8216, lng: 31.0492, status: "In Stock: SC 719" },
    { name: "AgroVet Supplies", lat: -17.8250, lng: 31.0530, status: "In Stock: Fertilizer" },
    { name: "SeedCo Distribution Depot", lat: -17.8300, lng: 31.0450, status: "In Stock: SC 513" },
    { name: "Agricura Retail", lat: -17.8180, lng: 31.0600, status: "In Stock: Pesticides" }
  ]);
  const [sortedDealers, setSortedDealers] = useState<any[]>([]);

  useEffect(() => {
    // Location Intelligence: Calculate nearest dealers
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
      const d = R * c; 
      return d;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          const sorted = dealers.map(dealer => ({
            ...dealer,
            dist: calculateDistance(userLat, userLng, dealer.lat, dealer.lng).toFixed(1) + " km"
          })).sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
          
          setSortedDealers(sorted);
        },
        (error) => {
          console.error("Location error:", error);
          // Fallback location (Harare center)
          const fallbackLat = -17.8252;
          const fallbackLng = 31.0335;
          const sorted = dealers.map(dealer => ({
            ...dealer,
            dist: calculateDistance(fallbackLat, fallbackLng, dealer.lat, dealer.lng).toFixed(1) + " km"
          })).sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
          setSortedDealers(sorted);
        }
      );
    }
  }, []);

  const renderMarket = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 sm:p-6 border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Market Intelligence</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search crops, prices, dealers..." 
            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0B7A4B]"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span className="flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-[#0B7A4B]" /> Live Crop Prices</span>
            <span className="flex items-center text-[10px] font-bold text-red-500 animate-pulse"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>LIVE</span>
          </h3>
          {marketLoading && <p className="text-sm text-slate-500 py-4">Loading live market prices...</p>}
          {marketError && <p className="text-sm text-amber-700 py-4">{marketError}</p>}
          {!marketLoading && !marketError && liveMarketPrices && liveMarketPrices.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {liveMarketPrices.map((crop, i) => (
                <div key={i} className="bg-white p-4 min-h-24 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1">{crop.crop}</p>
                  <div className="flex justify-between items-end">
                    <p className="text-lg font-bold text-slate-900">{crop.price}</p>
                    <span className={`text-[10px] font-bold ${crop.trend === 'up' ? 'text-emerald-600' : crop.trend === 'down' ? 'text-red-600' : 'text-slate-400'}`}>
                      {crop.trend.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!marketLoading && !marketError && (!liveMarketPrices || liveMarketPrices.length === 0) && <p className="text-sm text-slate-500 py-4">No live market prices are available yet.</p>}
        </div>

        <div>
          <h3 className="font-bold text-slate-900 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-[#0B7A4B]" /> Nearby Agro Dealers
          </h3>
          <div className="space-y-4">
            {(sortedDealers.length > 0 ? sortedDealers : [
              { name: "Farm & City Centre", dist: "2.4 km", status: "In Stock: SC 719" },
              { name: "AgroVet Supplies", dist: "5.1 km", status: "In Stock: Fertilizer" }
            ]).slice(0, 3).map((dealer, i) => (
              <div key={i} className="w-full text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{dealer.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{dealer.dist} • {dealer.status}</p>
                  <p className="text-xs text-slate-500 mt-2">Inventory: seed varieties, fertilizer, herbicide, fungicide, sprayers and farm tools</p>
                </div>
                <button type="button" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1${location.latitude && location.longitude ? `&origin=${location.latitude},${location.longitude}` : ''}&destination=${dealer.lat || -17.8252},${dealer.lng || 31.0335}&travelmode=driving`, "_blank", "noopener,noreferrer")} className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0" aria-label={`View ${dealer.name} on map`}>
                  <Map className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0B7A4B] text-white p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Sprout className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold mb-2">SeedCo Recommendations</h3>
            <p className="text-sm text-white/80 mb-4 max-w-[80%]">Discover seed varieties optimized for your region's forecasted climate.</p>
            <button onClick={() => handleActionClick('View Catalog')} className="bg-white text-[#0B7A4B] px-4 py-2 rounded-lg text-sm font-bold shadow-sm">View Catalog</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMe = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 border-b border-slate-200 flex items-center space-x-4 shadow-sm relative">
        <div className="relative w-16 h-16 shrink-0">
          <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            {profilePicUrl ? <img src={profilePicUrl} className="w-full h-full object-cover" alt="Profile" /> : <User className="w-8 h-8 text-slate-400" />}
          </div>
          <button type="button" aria-label="Upload profile photo" onClick={() => { if (profilePicRef.current) profilePicRef.current.click(); }} className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 hover:text-[#0B7A4B] transition-colors">
            <Camera className="w-3 h-3" />
          </button>
        </div>
        <input type="file" ref={profilePicRef} accept="image/*" className="hidden" aria-label="Upload profile image" onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setProfilePicUrl(URL.createObjectURL(e.target.files[0]));
          }
        }} />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{userData ? `${userData.firstName} ${userData.lastName}` : "Farmer"}</h2>
          <p className="text-sm text-slate-500 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> {userData?.district || userData?.country || "Location pending"}</p>
        </div>
        <button type="button" aria-label="Open settings" onClick={() => handleActionClick('Settings')} className="p-2 bg-slate-100 rounded-full text-slate-600">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* My Crops Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center">
              <Leaf className="w-4 h-4 mr-2 text-[#0B7A4B]" /> My Crops
            </h3>
            <button onClick={() => handleActionClick('Add Crop')} className="text-xs font-bold text-[#0B7A4B] flex items-center bg-[#0B7A4B]/10 px-2 py-1 rounded-md">
              <Plus className="w-3 h-3 mr-1" /> Add Crop
            </button>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">No crops added yet. Add a crop when you are ready to track it.</p>
          </div>
        </div>

        {/* Advanced Features Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            <button onClick={() => handleActionClick('Farm Health Report')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Farm Health Report</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Yield & Profit History')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Yield & Profit History</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Learning Hub')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Learning Hub</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Settings & Logout */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
           {onLogout && (
            <button onClick={onLogout} className="w-full py-3 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 transition-colors">
              Sign Out
            </button>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">NeuroSeedco Crop AI v2.1.0 • Data Sync Active</p>
      </div>
    </div>
  );

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <form onSubmit={handleDashboardAuth} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div><p className="text-sm font-medium text-[#0B7A4B]">NeuroSeedco Crop AI</p><h1 className="text-2xl font-bold text-slate-900">Farmer {authMode === "login" ? "login" : "sign up"}</h1><p className="text-sm text-slate-500 mt-1">Use your farmer account to access the dashboard.</p></div>
          {authError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{authError}</p>}
          <input required type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email address" className="w-full p-3 border border-slate-200 rounded-xl" />
          <input required type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Password" className="w-full p-3 border border-slate-200 rounded-xl" />
          <button type="submit" className="w-full py-3 bg-[#0B7A4B] text-white rounded-xl font-bold">{authMode === "login" ? "Log in" : "Create farmer account"}</button>
          <button type="button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="w-full text-sm font-semibold text-[#0B7A4B]">{authMode === "login" ? "New farmer? Sign up" : "Already have an account? Log in"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <div className="min-h-screen bg-white relative overflow-hidden flex flex-col md:flex-row">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
          {activeTab === "home" && renderHome()}
          {activeTab === "ai" && renderAskAI()}
          {activeTab === "market" && renderMarket()}
          {activeTab === "me" && renderMe()}
        </div>

        {/* Fixed Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "home" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Home</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("ai")}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "ai" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Ask AI</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("market")}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "market" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Market</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("me")}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "me" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Profile</span>
          </button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="absolute inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-900">{modalTitle}</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {modalTitle === 'Action plan' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700"><strong>Pest Warning: Fall Armyworm</strong></p>
                    <ul className="text-sm text-slate-600 list-decimal pl-4 space-y-2">
                      <li>Scout fields immediately, especially field edges.</li>
                      <li>Apply Cypermethrin or recommended biopesticides if larvae are spotted.</li>
                      <li>Check whorls of young plants for sawdust-like frass.</li>
                    </ul>
                  </div>
                )}
                {modalTitle === 'View calendar' && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-900">Optimal Planting Window</p>
                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm">
                      <p><strong>Start:</strong> Tomorrow, 6:00 AM</p>
                      <p><strong>End:</strong> 3 Days from now</p>
                      <p className="mt-2 text-xs">Based on predicted rainfall and current soil moisture (45%).</p>
                    </div>
                  </div>
                )}
                {modalTitle === 'View Catalog' && (
                  <div className="space-y-4">
                    {!catalogCategory ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Maize Seeds', 'Soya Seeds', 'Wheat Seeds', 'Vegetables'].map((category) => (
                          <button key={category} type="button" onClick={() => setCatalogCategory(category)} className="p-8 border border-slate-200 rounded-2xl text-left hover:border-[#0B7A4B] hover:bg-emerald-50 transition-colors">
                            <Sprout className="w-8 h-8 text-[#0B7A4B] mb-4" />
                            <p className="font-bold text-lg text-slate-900">{category}</p>
                            <p className="text-sm text-slate-500 mt-1">View varieties and growing requirements</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button type="button" onClick={() => setCatalogCategory(null)} className="text-sm font-semibold text-[#0B7A4B]">Back to categories</button>
                        <h4 className="text-xl font-bold text-slate-900">{catalogCategory}</h4>
                        {[{
                          name: 'SC 719', crop: 'Maize', rainfall: '450-800 mm', planting: 'November-January', environment: 'Warm soils, good drainage', maturity: '120-140 days'
                        }, {
                          name: 'SC 513', crop: 'Maize', rainfall: '400-700 mm', planting: 'November-January', environment: 'Low to medium altitude', maturity: '115-130 days'
                        }, {
                          name: 'SC Safari', crop: 'Soybean', rainfall: '500-900 mm', planting: 'December-January', environment: 'Fertile, well-drained soils', maturity: '110-125 days'
                        }, {
                          name: 'SC Nduna', crop: 'Wheat', rainfall: '350-600 mm', planting: 'April-May', environment: 'Cool season, fertile soils', maturity: '120-150 days'
                        }].filter(seed => catalogCategory === 'Maize Seeds' ? seed.crop === 'Maize' : catalogCategory === 'Soya Seeds' ? seed.crop === 'Soybean' : catalogCategory === 'Wheat Seeds' ? seed.crop === 'Wheat' : true).map(seed => (
                          <div key={seed.name} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-start gap-4"><div><h4 className="text-lg font-bold text-slate-900">{seed.name}</h4><p className="text-sm text-[#0B7A4B] font-semibold">{seed.crop}</p></div><span className="text-xs font-semibold bg-white px-3 py-1 rounded-full text-slate-600">SeedCo</span></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600"><p><strong>Rainfall:</strong> {seed.rainfall}</p><p><strong>Planting:</strong> {seed.planting}</p><p><strong>Environment:</strong> {seed.environment}</p><p><strong>Maturity:</strong> {seed.maturity}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {modalTitle === 'Add Crop' && (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setShowModal(false); }}>
                    <div>
                      <label htmlFor="crop-type" className="block text-xs font-semibold text-slate-700 mb-1">Crop Type</label>
                      <select id="crop-type" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-[#0B7A4B] focus:border-[#0B7A4B]">
                        <option>Maize (SC 719)</option>
                        <option>Soybeans</option>
                        <option>Wheat</option>
                        <option>Sorghum</option>
                        <option>Cotton</option>
                        <option>Tobacco</option>
                        <option>Sugar Beans</option>
                        <option>Sunflower</option>
                        <option>Barley</option>
                        <option>Potatoes</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-name" className="block text-xs font-semibold text-slate-700 mb-1">Field Name</label>
                      <input id="field-name" type="text" placeholder="e.g., North Field" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-[#0B7A4B] focus:border-[#0B7A4B]" />
                    </div>
                    <div>
                      <label htmlFor="planting-date" className="block text-xs font-semibold text-slate-700 mb-1">Planting Date</label>
                      <input id="planting-date" type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-[#0B7A4B] focus:border-[#0B7A4B]" />
                    </div>
                    <button type="submit" className="w-full bg-[#0B7A4B] text-white py-2 rounded-lg text-sm font-bold shadow-sm">Save Crop</button>
                  </form>
                )}
                {modalTitle === 'Farm Health Report' && (
                  <div className="py-8 text-center">
                    <h4 className="font-bold text-slate-900">No farm health data yet</h4>
                    <p className="text-sm text-slate-600 mt-2">Add a crop and connect farm data to generate this report.</p>
                  </div>
                )}
                {modalTitle === 'Yield & Profit History' && (
                  <div className="py-8 text-center">
                    <h4 className="font-bold text-slate-900">No yield or profit data yet</h4>
                    <p className="text-sm text-slate-600 mt-2">Your history will appear after harvest data is recorded.</p>
                  </div>
                )}
                {modalTitle === 'Learning Hub' && (
                  <div className="space-y-3">
                    {[
                      { seed: 'SC 719 Maize', time: '5 min read' }, { seed: 'SC Safari Soybean', time: '6 min read' }, { seed: 'SC Nduna Wheat', time: '7 min read' }, { seed: 'Vegetable varieties', time: '8 min read' }
                    ].map((article) => (
                      <button key={article.seed} onClick={() => { setLearningSeed(article.seed); setModalTitle(`Learning: ${article.seed}`); }} className="w-full text-left p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
                        <h4 className="text-base font-semibold text-slate-800 mb-1">How to grow {article.seed}</h4>
                        <p className="text-xs text-slate-500">{article.time} • From planting to harvest</p>
                      </button>
                    ))}
                  </div>
                )}
                {modalTitle.startsWith('Learning:') && (
                  <div className="space-y-4 text-sm text-slate-700">
                    <button type="button" onClick={() => setModalTitle('Learning Hub')} className="text-sm font-semibold text-[#0B7A4B]">Back to Learning Hub</button>
                    <h4 className="text-xl font-bold text-slate-900">How to grow {learningSeed}</h4>
                    <ol className="list-decimal pl-5 space-y-3"><li>Choose a suitable field and prepare well-drained soil.</li><li>Plant at the recommended spacing and season for your area.</li><li>Monitor moisture, weeds, pests and crop growth every week.</li><li>Apply suitable nutrition based on soil and crop observations.</li><li>Harvest when the crop reaches maturity, then dry and store it safely.</li></ol>
                  </div>
                )}
                {/* Settings Modal */}
                {modalTitle === 'Settings' && (
                  <div className="space-y-4">
                    <div className="space-y-2 border-b pb-4">
                      <h4 className="font-bold text-slate-900">Profile Configuration</h4>
                      <button onClick={onEditProfile} className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">Edit Personal Information</button>
                      <button onClick={onEditProfile} className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">Update Farm Location</button>
                    </div>
                    <div className="space-y-2 border-b pb-4">
                      <h4 className="font-bold text-slate-900">Preferences</h4>
                      <button onClick={() => setPushEnabled(!pushEnabled)} className="w-full flex justify-between p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                        <span>Push Notifications</span>
                        <span className={`font-bold ${pushEnabled ? 'text-[#0B7A4B]' : 'text-slate-400'}`}>{pushEnabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                      <button onClick={() => setOfflineEnabled(!offlineEnabled)} className="w-full flex justify-between p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                        <span>Offline Sync</span>
                        <span className={`font-bold ${offlineEnabled ? 'text-[#0B7A4B]' : 'text-slate-400'}`}>{offlineEnabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </div>
                    <div className="space-y-2 border-b pb-4">
                      <h4 className="font-bold text-slate-900">Security</h4>
                      {!passwordMode ? (
                        <button onClick={() => setPasswordMode(true)} className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">Change Password</button>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                          <input type="password" placeholder="New Password" className="w-full p-2 border rounded" />
                          <input type="password" placeholder="Confirm Password" className="w-full p-2 border rounded" />
                          <button onClick={() => setPasswordMode(false)} className="w-full bg-[#0B7A4B] text-white py-2 rounded font-bold">Update Password</button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 pb-2">
                      <h4 className="font-bold text-slate-900">Documents</h4>
                      <button onClick={() => handleActionClick('Farmer Registration Document')} className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition flex items-center justify-between">
                        <span>Farmer Registration Document</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
                
                {modalTitle === 'Farmer Registration Document' && (
                  <div className="space-y-4 text-sm text-slate-700">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="font-bold text-slate-900 text-lg mb-4 text-center">NeuroSeedco Crop AI<br/>Official Farmer Registration</h4>
                      <div className="space-y-2 mb-4 border-b pb-4">
                        <p><strong>Name:</strong> {userData?.firstName} {userData?.lastName}</p>
                        <p><strong>Status:</strong> Active & Verified</p>
                        <p><strong>Region:</strong> {userData?.province}, {userData?.country}</p>
                        <p><strong>Registration Date:</strong> {new Date(userData?.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-24 h-24 border-4 border-emerald-600 rounded-full flex items-center justify-center rotate-[-15deg] opacity-80">
                          <span className="text-emerald-600 font-bold text-xl">VERIFIED</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setModalTitle('Settings')} className="text-[#0B7A4B] font-bold flex items-center hover:underline">
                      &larr; Back to Settings
                    </button>
                  </div>
                )}
                
                {modalTitle === 'Action plan' && (
                  <div className="space-y-4 text-sm text-slate-700">
                    <h4 className="font-bold text-slate-900">Frost Protection Action Plan</h4>
                    <p>1. Cover sensitive crops with frost cloths or plastic tarps during the night.</p>
                    <p>2. Water the soil thoroughly in the late afternoon; moist soil holds heat better.</p>
                    <p>3. Consider using smudge pots or outdoor heaters if the drop is severe.</p>
                    <button className="w-full mt-4 bg-[#0B7A4B] text-white py-2 rounded-lg font-bold">Mark as Implemented</button>
                  </div>
                )}

                {modalTitle === 'View calendar' && (
                  <div className="space-y-4 text-sm text-slate-700">
                    <h4 className="font-bold text-slate-900">Upcoming Agronomic Tasks</h4>
                    <div className="space-y-2">
                      <div className="p-3 border rounded-lg border-l-4 border-l-[#0B7A4B] bg-slate-50">
                        <p className="font-bold">Today</p>
                        <p>Winter Wheat Top Dressing (Ammonium Nitrate)</p>
                      </div>
                      <div className="p-3 border rounded-lg border-l-4 border-l-amber-500 bg-slate-50">
                        <p className="font-bold">Tomorrow</p>
                        <p>Frost protection setup for sensitive vegetables</p>
                      </div>
                      <div className="p-3 border rounded-lg bg-slate-50">
                        <p className="font-bold">Next Week</p>
                        <p>Soil pH Testing</p>
                      </div>
                    </div>
                  </div>
                )}

                {modalTitle === 'Add Crop' && (
                  <div className="space-y-4 text-sm text-slate-700">
                    <h4 className="font-bold text-slate-900">Register New Crop</h4>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="modal-crop-type" className="block text-xs font-bold mb-1">Crop Type</label>
                        <select id="modal-crop-type" className="w-full p-2 border rounded-lg"><option>Maize</option><option>Wheat</option><option>Soybeans</option></select>
                      </div>
                      <div>
                        <label htmlFor="modal-crop-variety" className="block text-xs font-bold mb-1">Variety (e.g. SC 719)</label>
                        <input id="modal-crop-variety" type="text" className="w-full p-2 border rounded-lg" placeholder="Enter variety" />
                      </div>
                      <div>
                        <label htmlFor="modal-planting-date" className="block text-xs font-bold mb-1">Planting Date</label>
                        <input id="modal-planting-date" type="date" className="w-full p-2 border rounded-lg" />
                      </div>
                      <button className="w-full bg-[#0B7A4B] text-white py-2 rounded-lg font-bold">Save Crop</button>
                    </div>
                  </div>
                )}

                {/* Fallback for anything else */}
                {!['Settings', 'Action plan', 'View calendar', 'View Catalog', 'Add Crop', 'Farm Health Report', 'Yield & Profit History', 'Learning Hub'].includes(modalTitle) && !modalTitle.startsWith('Learning:') && !modalTitle.startsWith('View Map:') && !modalTitle.startsWith('Product Details:') && !modalTitle.startsWith('Read Article:') && (
                  <p className="text-slate-600 text-sm">
                    This feature is currently under development. Please check back later.
                  </p>
                )}
                {modalTitle.startsWith('View Map:') && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700">Displaying directions and details for <strong>{modalTitle.replace('View Map: ', '')}</strong>.</p>
                    <div className="w-full h-40 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Map className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">Map View Loading...</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 text-sm mb-2">Available Inventory</h4>
                      <div className="space-y-2">
                        {[
                          { item: "SC719 Maize Seed", stock: "In Stock" },
                          { item: "Ammonium Nitrate", stock: "Low Stock" },
                          { item: "SC Squire Soya", stock: "In Stock" },
                          { item: "Glyphosate 5L", stock: "In Stock" },
                        ].map((inv, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                            <span className="text-slate-800 font-medium">{inv.item}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${inv.stock === 'In Stock' ? 'text-[#0B7A4B] bg-[#0B7A4B]/10' : 'text-amber-700 bg-amber-100'}`}>{inv.stock}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {modalTitle.startsWith('Product Details:') && (
                  <div className="space-y-3 text-sm text-slate-700">
                    <p>Details for <strong>{modalTitle.replace('Product Details: ', '')}</strong>.</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>High yield potential</li>
                      <li>Drought tolerant</li>
                      <li>Disease resistant variety</li>
                    </ul>
                  </div>
                )}
                {modalTitle.startsWith('Read Article:') && (
                  <div className="space-y-4 text-sm text-slate-700 pb-6">
                    <h4 className="font-bold text-slate-900 text-lg mb-4 border-b pb-2">{modalTitle.replace('Read Article: ', '')}</h4>
                    {modalTitle.includes('SC 719') ? (
                      <>
                        <p>SeedCo SC 719 is a late-maturing white maize hybrid that requires optimal conditions for maximum yield.</p>
                        <p><strong>Planting:</strong> Ensure a planting depth of 5cm. Space rows 90cm apart and stations 25cm apart.</p>
                        <p><strong>Fertilization:</strong> Apply basal fertilizer (Compound D) at planting. Top dressing (Ammonium Nitrate) should be applied at 4 weeks and 8 weeks after emergence.</p>
                        <p><strong>Pest Control:</strong> Regularly scout for Fall Armyworm and apply appropriate pesticides such as Coragen or Ecotrex immediately upon detection.</p>
                      </>
                    ) : modalTitle.includes('Fall Armyworm') ? (
                      <>
                        <p>Fall Armyworm (FAW) is a devastating pest that can significantly reduce maize yields if not managed properly.</p>
                        <p><strong>Identification:</strong> Look for window-pane feeding marks on leaves and sawdust-like frass in the whorl.</p>
                        <p><strong>Scouting:</strong> Begin scouting early, from the seedling stage. Check 100 plants randomly across your field.</p>
                        <p><strong>Management:</strong> Use integrated pest management. If using chemicals, rotate modes of action to prevent resistance. Early morning or late evening spraying is most effective as the worms emerge to feed.</p>
                      </>
                    ) : (
                      <>
                        <p>Proper fertilizer usage is key to maximizing return on investment while maintaining soil health.</p>
                        <p><strong>Soil Testing:</strong> Always start with a soil test to understand the nutrient profile of your field.</p>
                        <p><strong>Basal vs Top Dressing:</strong> Basal fertilizers provide early nutrients, while top dressing supplies nitrogen during rapid growth phases.</p>
                        <p><strong>Application:</strong> Apply top dressing when the soil is moist to prevent nitrogen loss through volatilization.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
