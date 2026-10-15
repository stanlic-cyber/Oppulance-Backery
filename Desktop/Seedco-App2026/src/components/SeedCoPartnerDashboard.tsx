import React, { useState } from "react";
import { 
  Home, BarChart2, BrainCircuit, User,
  Building, LogOut, TrendingUp, Users, Target, ShieldAlert,
  ChevronRight, ArrowUpRight, Calendar, Search, MapPin, 
  Settings, Bell, Lock, HelpCircle, FileText
} from "lucide-react";
import { LanguageDropdown } from "./LanguageDropdown";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageKey } from "../lib/i18n";
import { useLocation } from "../lib/LocationContext";
import { useWeather } from "../lib/WeatherService";
import { useMarketPrices } from "../lib/LiveDataService";

const adoptionData = [
  { name: 'DZA', value: 350, forecast: 360 }, // Algeria
  { name: 'AGO', value: 280, forecast: 300 }, // Angola
  { name: 'BEN', value: 150, forecast: 160 }, // Benin
  { name: 'BWA', value: 110, forecast: 115 }, // Botswana
  { name: 'BFA', value: 210, forecast: 220 }, // Burkina Faso
  { name: 'BDI', value: 130, forecast: 135 }, // Burundi
  { name: 'CPV', value: 40, forecast: 45 },   // Cabo Verde
  { name: 'CMR', value: 290, forecast: 310 }, // Cameroon
  { name: 'CAF', value: 90, forecast: 95 },   // Central African Republic
  { name: 'TCD', value: 160, forecast: 170 }, // Chad
  { name: 'COM', value: 30, forecast: 35 },   // Comoros
  { name: 'COD', value: 380, forecast: 400 }, // Democratic Republic of the Congo
  { name: 'COG', value: 140, forecast: 150 }, // Republic of the Congo
  { name: 'CIV', value: 320, forecast: 340 }, // Cote d'Ivoire
  { name: 'DJI', value: 50, forecast: 55 },   // Djibouti
  { name: 'EGY', value: 450, forecast: 470 }, // Egypt
  { name: 'GNQ', value: 70, forecast: 75 },   // Equatorial Guinea
  { name: 'ERI', value: 80, forecast: 85 },   // Eritrea
  { name: 'SWZ', value: 90, forecast: 95 },   // Eswatini
  { name: 'ETH', value: 520, forecast: 550 }, // Ethiopia
  { name: 'GAB', value: 110, forecast: 115 }, // Gabon
  { name: 'GMB', value: 60, forecast: 65 },   // Gambia
  { name: 'GHA', value: 390, forecast: 410 }, // Ghana
  { name: 'GIN', value: 230, forecast: 240 }, // Guinea
  { name: 'GNB', value: 85, forecast: 90 },   // Guinea-Bissau
  { name: 'KEN', value: 550, forecast: 500 }, // Kenya
  { name: 'LSO', value: 75, forecast: 80 },   // Lesotho
  { name: 'LBR', value: 120, forecast: 125 }, // Liberia
  { name: 'LBY', value: 90, forecast: 95 },   // Libya
  { name: 'MDG', value: 270, forecast: 290 }, // Madagascar
  { name: 'MWI', value: 210, forecast: 230 }, // Malawi
  { name: 'MLI', value: 250, forecast: 270 }, // Mali
  { name: 'MRT', value: 100, forecast: 105 }, // Mauritania
  { name: 'MUS', value: 60, forecast: 65 },   // Mauritius
  { name: 'MAR', value: 380, forecast: 400 }, // Morocco
  { name: 'MOZ', value: 310, forecast: 330 }, // Mozambique
  { name: 'NAM', value: 130, forecast: 140 }, // Namibia
  { name: 'NER', value: 190, forecast: 200 }, // Niger
  { name: 'NGA', value: 650, forecast: 700 }, // Nigeria
  { name: 'RWA', value: 180, forecast: 190 }, // Rwanda
  { name: 'STP', value: 20, forecast: 22 },   // Sao Tome and Principe
  { name: 'SEN', value: 260, forecast: 280 }, // Senegal
  { name: 'SYC', value: 15, forecast: 16 },   // Seychelles
  { name: 'SLE', value: 140, forecast: 150 }, // Sierra Leone
  { name: 'SOM', value: 110, forecast: 120 }, // Somalia
  { name: 'ZAF', value: 600, forecast: 620 }, // South Africa
  { name: 'SSD', value: 130, forecast: 140 }, // South Sudan
  { name: 'SDN', value: 290, forecast: 310 }, // Sudan
  { name: 'TZA', value: 450, forecast: 480 }, // Tanzania
  { name: 'TGO', value: 160, forecast: 170 }, // Togo
  { name: 'TUN', value: 220, forecast: 230 }, // Tunisia
  { name: 'UGA', value: 370, forecast: 390 }, // Uganda
  { name: 'ZMB', value: 300, forecast: 350 }, // Zambia
  { name: 'ZWE', value: 400, forecast: 420 }, // Zimbabwe
];

const riskData = [
  { subject: 'Drought', A: 120, fullMark: 150 },
  { subject: 'Pests', A: 98, fullMark: 150 },
  { subject: 'Supply', A: 86, fullMark: 150 },
  { subject: 'Market', A: 99, fullMark: 150 },
  { subject: 'Policy', A: 65, fullMark: 150 },
];

export function SeedCoPartnerDashboard({ onLogout }: { onLogout: () => void }) {
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [activeTab, setActiveTab] = useState<"home" | "intelligence" | "me">("home");
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const profilePicRef = React.useRef<HTMLInputElement>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const recordingIntervalRef = React.useRef<number | null>(null);

  const { location } = useLocation();
  const locationDisplay = location.province || location.country || "Africa";
  const { weather, loading: weatherLoading, error: weatherError } = useWeather();
  const { data: marketPrices, loading: marketLoading, error: marketError } = useMarketPrices();

  const handleActionClick = (title: string) => {
    setModalTitle(title);
    setShowModal(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, source: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setChatHistory(previous => [...previous, { role: 'user', text: `[${source} uploaded]: ${file.name}` }]);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recordingIntervalRef.current) window.clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
      setChatHistory(previous => [...previous, { role: 'user', text: `[Voice note recorded: ${recordingTime}s]` }]);
      setRecordingTime(0);
      return;
    }
    setIsRecording(true);
    recordingIntervalRef.current = window.setInterval(() => setRecordingTime(time => time + 1), 1000);
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
        setChatHistory([...newHistory, { role: 'ai', text: data.reply }]);
      } else {
        setChatHistory([...newHistory, { role: 'ai', text: "Sorry, I couldn't process that request." }]);
      }
    } catch (err) {
      setChatHistory([...newHistory, { role: 'ai', text: "Connection error. Please try again later." }]);
    }
  };

  const renderHome = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-[#0B7A4B] text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-white/80 text-sm font-medium">NeuroSeedco Crop AI</p>
            <h1 className="text-2xl font-bold">Partner Command Center</h1>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageDropdown language={language} setLanguage={setLanguage} />
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          <p className="text-sm text-white/90">No partner data has been added yet.</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="text-sm text-slate-500">No dashboard records are available yet.</p>
        </div>
      </div>
    </div>
  );

  const renderIntelligence = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-lg text-slate-900">Intelligence</h2>
          <p className="text-xs text-slate-500">Market forecasting & analysis</p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Live weather: {locationDisplay}</h3>
            {weatherLoading && <p className="text-sm text-slate-500">Loading live weather...</p>}
            {weatherError && <p className="text-sm text-amber-700">{weatherError}</p>}
            {weather && <div className="grid grid-cols-2 gap-3 text-sm text-slate-600"><p><strong>{Math.round(weather.currentTemp)}°C</strong><br />Temperature</p><p><strong>{Math.round(weather.humidity)}%</strong><br />Humidity</p><p><strong>{weather.rainfallToday} mm</strong><br />Rain today</p><p><strong>{Math.round(weather.windSpeed)} km/h</strong><br />Wind</p></div>}
            {!weatherLoading && !weatherError && !weather && <p className="text-sm text-slate-500">Allow location access to load weather intelligence.</p>}
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Live market prices</h3>
            {marketLoading && <p className="text-sm text-slate-500">Loading market data...</p>}
            {marketError && <p className="text-sm text-amber-700">{marketError}</p>}
            {marketPrices && marketPrices.length > 0 && <div className="space-y-3">{marketPrices.slice(0, 5).map((price: any, index: number) => <div key={index} className="flex justify-between text-sm border-b border-slate-100 pb-2"><span>{price.crop || price.name || "Market item"}</span><strong>{price.price ?? "N/A"}</strong></div>)}</div>}
            {!marketLoading && !marketError && (!marketPrices || marketPrices.length === 0) && <p className="text-sm text-slate-500">No live market prices are available yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAskAI = () => (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10 relative">
        <div>
          <h2 className="font-bold text-lg text-slate-900 flex items-center">
            NeuroSeedco Crop AI <BrainCircuit className="w-4 h-4 text-[#0B7A4B] ml-2" />
          </h2>
          <p className="text-xs text-slate-500">Strategic executive assistant</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {chatHistory.length === 0 && <div className="min-h-64 flex flex-col items-center justify-center text-center"><h3 className="text-2xl font-semibold text-slate-900">How can I help?</h3><p className="text-sm text-slate-500 mt-2">Ask any partner, market, or agriculture question.</p></div>}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-[#0B7A4B] flex items-center justify-center shrink-0 mr-3 mt-1">
                <BrainCircuit className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`${msg.role === 'user' ? 'bg-[#0B7A4B] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'} p-3 sm:p-4 rounded-2xl shadow-sm max-w-[85%] text-sm whitespace-pre-wrap`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-white border-t border-slate-200 shrink-0 mb-safe absolute bottom-16 w-full">
        <input ref={cameraInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFileUpload(event, 'Camera')} />
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={(event) => handleFileUpload(event, 'File')} />
        <div className="flex items-center space-x-2 bg-slate-100 rounded-2xl px-3 py-2">
          <button type="button" aria-label="Upload file" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-[#0B7A4B]"><FileText className="w-5 h-5" /></button>
          <button type="button" aria-label="Upload photo" onClick={() => cameraInputRef.current?.click()} className="p-2 text-slate-500 hover:text-[#0B7A4B]"><MapPin className="w-5 h-5" /></button>
          <input 
            type="text" 
            placeholder={isRecording ? `Recording ${recordingTime}s...` : "Ask NeuroSeedco Crop AI..."} 
            className="flex-1 bg-transparent border-none text-sm outline-none"
            value={chatMessage}
            disabled={isRecording}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage} className="w-8 h-8 bg-[#0B7A4B] text-white rounded-full flex items-center justify-center shadow-sm">
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button type="button" aria-label={isRecording ? "Stop recording" : "Start voice recording"} onClick={toggleRecording} className={`p-2 rounded-full ${isRecording ? "bg-red-500 text-white" : "text-slate-500 hover:text-[#0B7A4B]"}`}><span className="text-sm">{isRecording ? "Stop" : "Voice"}</span></button>
        </div>
      </div>
    </div>
  );

  const renderMe = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 border-b border-slate-200 shadow-sm text-center relative">
        <button onClick={() => handleActionClick('Partner Settings')} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition">
          <Settings className="w-5 h-5" />
        </button>
        <div className="relative inline-block mt-2">
          <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
            {profilePicUrl ? <img src={profilePicUrl} className="w-full h-full object-cover" alt="Profile" /> : <User className="w-10 h-10 text-slate-400" />}
          </div>
          <button onClick={() => profilePicRef.current?.click()} className="absolute bottom-4 right-0 w-7 h-7 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 hover:text-[#0B7A4B] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </button>
        </div>
        <input type="file" ref={profilePicRef} accept="image/*" className="hidden" onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setProfilePicUrl(URL.createObjectURL(e.target.files[0]));
          }
        }} />
        <h2 className="text-2xl font-bold text-slate-900">Partner Executive</h2>
        <p className="text-sm text-slate-500 mt-1 flex items-center justify-center"><MapPin className="w-3 h-3 mr-1" /> {locationDisplay} Region</p>
        <div className="mt-4 inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
          <Building className="w-3 h-3" />
          <span>Strategy & Expansion</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            <button onClick={() => handleActionClick('Reports Generated')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Reports Generated</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Notifications')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Security')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Security</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Settings')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Help Centre')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-medium text-slate-700 text-sm">Help Centre</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <button onClick={onLogout} className="w-full bg-white border border-red-200 text-red-600 py-4 rounded-2xl font-bold shadow-sm hover:bg-red-50 flex items-center justify-center transition-colors">
          <LogOut className="w-5 h-5 mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeTab === "home" && renderHome()}
        {activeTab === "intelligence" && renderIntelligence()}
        {activeTab === "me" && renderMe()}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-50">
        <button 
          onClick={() => setActiveTab("home")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "home" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "home" ? "bg-[#0B7A4B]/10" : ""}`}>
            <Home className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab("intelligence")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "intelligence" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "intelligence" ? "bg-[#0B7A4B]/10" : ""}`}>
            <BarChart2 className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Intelligence</span>
        </button>
        <button 
          onClick={() => setActiveTab("me")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "me" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "me" ? "bg-[#0B7A4B]/10" : ""}`}>
            <User className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Me</span>
        </button>
      </div>

      {/* Action Modal */}
      {showModal && (
        <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl rounded-b-none sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 relative z-10 pb-safe">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-lg">{modalTitle}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {modalTitle === 'Reports Generated' && (
                <p className="text-sm text-slate-500">No reports have been generated yet.</p>
              )}

              {modalTitle === 'Notifications' && (
                <p className="text-sm text-slate-500">No notifications yet.</p>
              )}

              {modalTitle === 'Security' && (
                <p className="text-sm text-slate-500">No security settings have been configured yet.</p>
              )}

              {modalTitle === 'Settings' && (
                <p className="text-sm text-slate-500">No partner settings have been configured yet.</p>
              )}

              {modalTitle === 'Help Centre' && (
                <div className="space-y-4 text-sm text-slate-700">
                  <p>How can we help you today?</p>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors flex justify-between items-center">
                      <span className="font-medium">FAQ & Guides</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button className="w-full text-left p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors flex justify-between items-center">
                      <span className="font-medium">Contact Support</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button className="w-full text-left p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors flex justify-between items-center">
                      <span className="font-medium">System Status</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">All Systems Operational</span>
                    </button>
                  </div>
                </div>
              )}

              {modalTitle === 'Partner Settings' && (
                <div className="space-y-4">
                  <div className="space-y-2 border-b pb-4">
                    <h4 className="font-bold text-slate-900">Notifications</h4>
                    <button className="w-full flex justify-between p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                      <span>Push Notifications</span>
                      <span className="text-[#0B7A4B] font-bold">Enabled</span>
                    </button>
                    <button className="w-full flex justify-between p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                      <span>Email Alerts</span>
                      <span className="text-[#0B7A4B] font-bold">Enabled</span>
                    </button>
                  </div>
                  <div className="space-y-2 border-b pb-4">
                    <h4 className="font-bold text-slate-900">Security</h4>
                    <button className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">Change Password</button>
                    <button className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">Two-Factor Authentication</button>
                  </div>
                  <div className="space-y-2 pb-2">
                    <h4 className="font-bold text-slate-900">Help Centre</h4>
                    <button className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">Contact Support</button>
                    <button className="w-full text-left p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">FAQ & Guides</button>
                  </div>
                </div>
              )}

              {!['Reports Generated', 'Notifications', 'Security', 'Partner Settings', 'Settings', 'Help Centre'].includes(modalTitle) && !modalTitle.startsWith('Read Report:') && (
                <p className="text-slate-600 text-sm">
                  This feature is currently under development. Please check back later.
                </p>
              )}
              {modalTitle.startsWith('Read Report:') && (
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/6 animate-pulse mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse mb-2"></div>
                    <p className="text-xs text-slate-500 mt-4 italic">Document content loaded. Simulated view for demonstration.</p>
                  </div>
                  <button onClick={() => setModalTitle('Reports Generated')} className="text-[#0B7A4B] font-bold text-xs flex items-center hover:underline">
                    &larr; Back to Reports
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
