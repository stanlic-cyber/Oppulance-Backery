import React, { useState } from "react";
import { 
  Home, Map, BrainCircuit, User, Building2, LogOut, ShieldAlert, 
  Droplets, ThermometerSun, Leaf, Users, ChevronRight,
  Globe, Activity, TrendingUp, Search, ArrowUpRight, FileText,
  Bell, Settings, Camera, MapPin, Loader2, HelpCircle
} from "lucide-react";
import { LanguageDropdown } from "./LanguageDropdown";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageKey } from "../lib/i18n";
import { useLocation } from "../lib/LocationContext";
import { useDiseaseAlerts } from "../lib/LiveDataService";

export function AgriculturalOfficerDashboard({ onLogout }: { onLogout: () => void }) {
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [activeTab, setActiveTab] = useState<"home" | "monitoring" | "me">("home");

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: "Welcome to the AI Policy Advisor. I can analyze national agricultural data to generate insights. What do you need?" }
  ]);

  const profilePicRef = React.useRef<HTMLInputElement>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  const { location } = useLocation();
  const { data: diseaseAlerts, loading: diseaseLoading, error: diseaseError } = useDiseaseAlerts();
  const locationDisplay = location.province || location.country || "National";

  const handleActionClick = (title: string) => {
    setModalTitle(title);
    setShowModal(true);
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
            <p className="text-white/80 text-sm font-medium">NeuroSeedco Gov</p>
            <h1 className="text-2xl font-bold">Officer Dashboard</h1>
            <div className="flex items-center text-white/70 text-xs mt-1">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="line-clamp-1">{locationDisplay} Office</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageDropdown language={language} setLanguage={setLanguage} />
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          <p className="text-sm text-white/90">No regional officer data has been added yet.</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No officer records are available yet.</p></div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10">
        {showSearch ? (
          <div className="w-full flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              autoFocus
              placeholder="Search regions or diseases..." 
              className="flex-1 bg-transparent border-none text-sm outline-none text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 p-1 text-slate-400 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Monitoring</h2>
              <p className="text-xs text-slate-500">Disease & Climate Maps</p>
            </div>
            <button onClick={() => setShowSearch(true)} className="bg-[#0B7A4B] text-white p-2 rounded-full shadow-sm"><Search className="w-4 h-4"/></button>
          </>
        )}
      </div>

      <div className="p-4"><div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No monitoring data is available yet.</p></div></div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10 relative">
        <div>
          <h2 className="font-bold text-lg text-slate-900 flex items-center">
            AI Advisor <BrainCircuit className="w-4 h-4 text-[#0B7A4B] ml-2" />
          </h2>
          <p className="text-xs text-slate-500">Policy & intervention insights</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
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
        {chatHistory.length === 1 && (
          <div className="flex flex-wrap gap-2 ml-11">
            <button onClick={() => setChatMessage("Where are disease outbreaks?")} className="text-xs bg-[#0B7A4B]/10 text-[#0B7A4B] font-semibold px-3 py-1.5 rounded-full border border-[#0B7A4B]/20">Where are disease outbreaks?</button>
            <button onClick={() => setChatMessage("Which districts need support?")} className="text-xs bg-[#0B7A4B]/10 text-[#0B7A4B] font-semibold px-3 py-1.5 rounded-full border border-[#0B7A4B]/20">Which districts need support?</button>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-white border-t border-slate-200 shrink-0 mb-safe absolute bottom-16 w-full">
        <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-4 py-2">
          <input 
            type="text" 
            placeholder="Ask AI advisor..." 
            className="flex-1 bg-transparent border-none text-sm outline-none"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage} className="w-8 h-8 bg-[#0B7A4B] text-white rounded-full flex items-center justify-center shadow-sm">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderMe = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 border-b border-slate-200 shadow-sm text-center relative">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
            {profilePicUrl ? (
              <img src={profilePicUrl} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <Building2 className="w-10 h-10 text-slate-400" />
            )}
          </div>
          <button onClick={() => profilePicRef.current?.click()} className="absolute bottom-4 right-0 w-7 h-7 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 hover:text-[#0B7A4B] transition-colors">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <input type="file" ref={profilePicRef} accept="image/*" className="hidden" onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setProfilePicUrl(URL.createObjectURL(e.target.files[0]));
          }
        }} />
        <h2 className="text-2xl font-bold text-slate-900">Ministry Official</h2>
        <p className="text-sm text-slate-500 mt-1 flex items-center justify-center"><MapPin className="w-3 h-3 mr-1" /> {locationDisplay} Department of Agriculture</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            <button onClick={() => handleActionClick('Reports Submitted')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Reports Submitted</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Notifications')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Settings')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium text-slate-700 text-sm">Settings</span>
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
        {activeTab === "monitoring" && renderMonitoring()}
        {activeTab === "me" && renderMe()}
      </div>

      {/* Action Modal */}
      {showModal && (
        <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl rounded-b-none sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 relative z-10 pb-safe">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-lg">{modalTitle}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {modalTitle === 'Reports Submitted' && (
                <p className="text-sm text-slate-500">No reports have been submitted yet.</p>
              )}
              {modalTitle === 'Notifications' && (
                <p className="text-sm text-slate-500">No notifications are available yet.</p>
              )}
              {modalTitle === 'Settings' && (
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Outbreak Alerts</span>
                    <div className="w-10 h-6 bg-[#0B7A4B] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Weekly Area Reports</span>
                    <div className="w-10 h-6 bg-[#0B7A4B] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                </div>
              )}
              {!['Reports Submitted', 'Notifications', 'Settings'].includes(modalTitle) && !modalTitle.startsWith('Read Report:') && (
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
                  <button onClick={() => setModalTitle('Reports Submitted')} className="text-[#0B7A4B] font-bold text-xs flex items-center hover:underline">
                    &larr; Back to Reports
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          onClick={() => setActiveTab("monitoring")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "monitoring" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "monitoring" ? "bg-[#0B7A4B]/10" : ""}`}>
            <Globe className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Monitoring</span>
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
    </div>
  );
}
