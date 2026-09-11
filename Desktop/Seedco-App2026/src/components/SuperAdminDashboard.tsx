import React, { useState } from 'react';
import { 
  Users, Activity, ShieldCheck, Map, BarChart3, Settings, 
  Search, Filter, ChevronRight, CheckCircle2, XCircle, Clock,
  LogOut, Home, UserCog, PieChart, Shield, Globe, BrainCircuit, HelpCircle, AlertTriangle, TrendingUp, CloudRain, ShieldAlert
} from 'lucide-react';
import { LanguageDropdown } from "./LanguageDropdown";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageKey } from "../lib/i18n";

export function SuperAdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [activeTab, setActiveTab] = useState<"home" | "users" | "analytics" | "admin">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const usersData: { id: string; name: string; role: string; country: string; status: string }[] = [];

  const filteredUsers = usersData.filter(user => 
    (filterRole === "all" || user.role.toLowerCase().includes(filterRole.toLowerCase())) &&
    (user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderHome = () => (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Platform Overview</h2>
        <p className="text-slate-500 text-sm mt-1">NeuroCrop AI Africa Operations</p>
      </div>
      
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-500">No platform overview data has been added yet.</div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-500">System health data is not available yet.</div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-500">No intelligence data has been added yet.</div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-500">No recent activity is available yet.</div>
    </div>
  );

  const renderUsers = () => (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage platform stakeholders</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-[#0B7A4B] focus:border-[#0B7A4B] outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-[#0B7A4B] outline-none text-slate-700 bg-white"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="farmer">Farmer</option>
            <option value="seedco">SeedCo Partner</option>
            <option value="dealer">Agro Dealer</option>
            <option value="distributor">Distributor</option>
            <option value="officer">Agri Officer</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role & Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">No users have been added yet.</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{user.role}</p>
                    <p className="text-xs text-slate-500">{user.country}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                      user.status === "Active" ? "bg-emerald-50 text-emerald-700" :
                      user.status === "Pending" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[#0B7A4B] font-bold text-xs hover:underline">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics & Insights</h2>
        <p className="text-slate-500 text-sm mt-1">Platform usage and growth metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-500">No growth analytics are available yet.</div><div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-500">No module usage data is available yet.</div></div>
    </div>
  );

  const renderAdmin = () => (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Administration</h2>
        <p className="text-slate-500 text-sm mt-1">Configure platform settings and security</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "Platform Management", icon: Globe, desc: "Manage countries, provinces, and districts", action: "Configure Regions" },
          { title: "Security Settings", icon: ShieldCheck, desc: "Audit logs, RBAC, 2FA enforcement", action: "View Security logs" },
          { title: "System Config", icon: Settings, desc: "API keys, AI Models, Backup operations", action: "System Settings" },
          { title: "Content Publishing", icon: Activity, desc: "Announcements, notifications, knowledge base", action: "Manage Content" },
        ].map((card, i) => (
          <button key={i} type="button" onClick={() => alert(`${card.title} is ready for configuration when data is available.`)} className="text-left bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-[#0B7A4B] transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mb-2 group-hover:bg-[#0B7A4B]/10 transition-colors">
              <card.icon className="w-5 h-5 text-slate-600 group-hover:text-[#0B7A4B]" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">{card.title}</h3>
            <p className="text-xs text-slate-500 mb-2">{card.desc}</p>
            <span className="text-xs font-bold text-[#0B7A4B] flex items-center">{card.action} <ChevronRight className="w-3 h-3 ml-1" /></span>
          </button>
        ))}
      </div>
      
      <div className="mt-8">
        <button onClick={onLogout} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-white border border-slate-200 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />
          <span>Secure Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans selection:bg-[#0B7A4B]/30">
      {/* Top Header */}
      <div className="bg-[#0B7A4B] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold leading-tight">Super Admin</h1>
              <p className="text-[10px] text-white/80 font-medium tracking-wider">NEUROCROP AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageDropdown language={language} setLanguage={setLanguage} />
            <button className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "home" && renderHome()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "analytics" && renderAnalytics()}
        {activeTab === "admin" && renderAdmin()}
      </div>

      {/* Fixed Bottom Navigation */}
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
          onClick={() => setActiveTab("users")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "users" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "users" ? "bg-[#0B7A4B]/10" : ""}`}>
            <Users className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Users</span>
        </button>
        <button 
          onClick={() => setActiveTab("analytics")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "analytics" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "analytics" ? "bg-[#0B7A4B]/10" : ""}`}>
            <PieChart className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Analytics</span>
        </button>
        <button 
          onClick={() => setActiveTab("admin")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "admin" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "admin" ? "bg-[#0B7A4B]/10" : ""}`}>
            <UserCog className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Admin</span>
        </button>
      </div>
    </div>
  );
}
