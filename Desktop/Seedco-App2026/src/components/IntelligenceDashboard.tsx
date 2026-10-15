import { BrowserFrame } from "./DeviceFrame";
import dashboardMap from "../assets/images/nc_dashboard_map_1781830626475.jpg";
import { cn } from "../lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Users, 
  Map, 
  TrendingUp, 
  AlertTriangle,
  Leaf,
  Activity,
  MoreVertical,
  Search,
  Filter
} from "lucide-react";

// Mock data for the chart
const priceData = [
  { month: 'Jan', price: 210 },
  { month: 'Feb', price: 225 },
  { month: 'Mar', price: 240 },
  { month: 'Apr', price: 235 },
  { month: 'May', price: 255 },
  { month: 'Jun', price: 280 },
  { month: 'Jul', price: 295 },
];

export function IntelligenceDashboard() {
  return (
    <BrowserFrame>
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white flex flex-col h-full shrink-0">
          <div className="p-6 flex items-center space-x-3 mb-4">
             <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-400/30">
               <Leaf className="w-5 h-5 text-emerald-400" />
             </div>
             <div>
                <h1 className="font-display font-bold leading-none tracking-tight">NeuroSeedco Crop Ai</h1>
                <p className="text-[9px] uppercase tracking-widest text-emerald-400/80 mt-1 font-semibold">Command Center</p>
             </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
             <div className="px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center space-x-3 font-medium text-sm border border-emerald-500/20 cursor-pointer">
                <Map className="w-4 h-4" />
                <span>Regional Risk Map</span>
             </div>
             <div className="px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg flex items-center space-x-3 font-medium text-sm cursor-pointer transition-colors">
                <Activity className="w-4 h-4" />
                <span>Disease Outbreaks</span>
             </div>
             <div className="px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg flex items-center space-x-3 font-medium text-sm cursor-pointer transition-colors">
                <Users className="w-4 h-4" />
                <span>Adoption Metrics</span>
             </div>
             <div className="px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg flex items-center space-x-3 font-medium text-sm cursor-pointer transition-colors">
                <TrendingUp className="w-4 h-4" />
                <span>Market Intelligence</span>
             </div>
          </nav>
          
          <div className="p-4 mx-4 mb-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">SC</div>
               <div>
                  <p className="text-xs font-medium text-white">NeuroSeedco Group</p>
                  <p className="text-[10px] text-gray-400">Enterprise License</p>
               </div>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
             <h2 className="text-gray-900 font-display font-semibold text-lg">Southern Africa Regional Insights</h2>
             <div className="flex items-center space-x-4">
                <div className="relative">
                   <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                   <input 
                     type="text" 
                     placeholder="Search regions or data..." 
                     className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-64 transition-all"
                   />
                </div>
                <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                   <Filter className="w-5 h-5" />
                </button>
             </div>
          </header>

          {/* Dashboard Grid */}
          <main className="flex-1 p-8 overflow-y-auto space-y-6">
             {/* Key Metrics */}
             <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Active Farmers", value: "142,850", trend: "+12.5%", positive: true },
                  { label: "Disease Risk Index", value: "High (0.78)", trend: "+0.15", positive: false },
                  { label: "AI Scans Today", value: "24,592", trend: "+8.2%", positive: true },
                  { label: "Avg Yield Est (Maize)", value: "4.2 t/ha", trend: "+0.4 t/ha", positive: true },
                ].map((metric, i) => (
                   <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-medium text-gray-500 tracking-wide uppercase mb-2">{metric.label}</p>
                      <div className="flex items-end justify-between">
                         <h3 className="text-2xl font-display font-semibold text-gray-900">{metric.value}</h3>
                         <span className={cn(
                           "text-xs font-bold px-2 py-0.5 rounded-md mb-1.5",
                           metric.positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                         )}>
                            {metric.trend}
                         </span>
                      </div>
                   </div>
                ))}
             </div>

             <div className="grid grid-cols-3 gap-6 h-[400px]">
                {/* Map Section */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
                   <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/90 backdrop-blur z-10">
                      <h3 className="font-semibold text-gray-900">Climate Risk Heat Map</h3>
                      <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
                   </div>
                   <div className="relative flex-1 bg-gray-50">
                      <img 
                        src={dashboardMap} 
                        alt="Africa Climate Map" 
                        className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-multiply"
                      />
                      {/* Overlay markers */}
                      <div className="absolute top-[60%] left-[60%] w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse" title="High Risk Area - Fall Armyworm"></div>
                      <div className="absolute top-[75%] left-[55%] w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow-lg" title="Moderate Risk - Drought"></div>
                      
                      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-gray-200 shadow-sm text-xs">
                         <div className="flex items-center space-x-2 mb-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span><span className="text-gray-700 font-medium">Critical Risk</span></div>
                         <div className="flex items-center space-x-2 mb-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span><span className="text-gray-700 font-medium">Moderate</span></div>
                         <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span><span className="text-gray-700 font-medium">Low Risk</span></div>
                      </div>
                   </div>
                </div>

                {/* Right Column Charts */}
                <div className="col-span-1 space-y-6 flex flex-col">
                   <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="font-semibold text-gray-900 text-sm">Market Price Trends (Maize)</h3>
                         <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">USD/Ton</span>
                      </div>
                      <div className="flex-1 -ml-4 -mb-2 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={priceData}>
                            <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} width={40} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: '#047857', fontWeight: 600, fontSize: '14px' }}
                              labelStyle={{ color: '#6b7280', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 flex-1 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 pointer-events-none">
                         <AlertTriangle className="w-24 h-24" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-4">Regional Alerts</h3>
                      
                      <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                         <div className="border-l-2 border-red-500 pl-3 py-1">
                            <p className="text-xs font-bold text-red-600 mb-0.5">Pest Outbreak Alert</p>
                            <p className="text-xs text-gray-600">Fall Armyworm clusters detected in Mashonaland Central. +42% week-on-week.</p>
                         </div>
                         <div className="border-l-2 border-amber-500 pl-3 py-1">
                            <p className="text-xs font-bold text-amber-600 mb-0.5">Rain Delay Prediction</p>
                            <p className="text-xs text-gray-600">Onset of effective rains delayed by 14 days in Matabeleland South region.</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </main>
        </div>
      </div>
    </BrowserFrame>
  );
}
