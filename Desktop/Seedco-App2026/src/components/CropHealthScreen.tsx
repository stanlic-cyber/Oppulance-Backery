import { PhoneFrame } from "./DeviceFrame";
import maizeLeaf from "../assets/images/nc_maize_leaf_1781830614580.jpg";
import { ArrowLeft, Share2, AlertCircle, CheckCircle, Droplets, Wind, Focus, Thermometer } from "lucide-react";

export function CropHealthScreen() {
  return (
    <PhoneFrame theme="light" className="bg-gray-50">
      {/* Header Image Area */}
      <div className="relative h-[320px] w-full bg-gray-900 group">
        <img 
          src={maizeLeaf} 
          alt="Maize leaf crop health scanning" 
          className="w-full h-full object-cover opacity-80"
        />
        
        {/* Scanning UI overlay */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-emerald-400/50 rounded-3xl group-hover:scale-105 transition-transform duration-700"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 flex flex-col justify-between p-2">
             <div className="flex justify-between">
                <div className="w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                <div className="w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
             </div>
             <div className="flex justify-between">
                <div className="w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                <div className="w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
             </div>
          </div>
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_15px_#34d399] -translate-y-[80px] animate-[scan_3s_ease-in-out_infinite]"></div>
        </div>

        <div className="absolute top-0 inset-x-0 p-6 pt-12 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <button className="p-2.5 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button className="p-2.5 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 relative -mt-6 bg-white rounded-t-[2rem] h-[calc(100%-296px)] overflow-y-auto">
        <div className="flex items-center justify-between">
           <div>
              <div className="flex items-center space-x-2 mb-1">
                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                 <p className="text-xs font-bold tracking-wider text-red-500 uppercase">Detection Alert</p>
              </div>
              <h2 className="text-gray-900 font-display font-semibold text-2xl tracking-tight">Fall Armyworm</h2>
           </div>
           <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-4 border-red-500/20 relative">
                 <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-red-500"
                      strokeDasharray="89, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                 </svg>
                 <span className="font-display font-bold text-gray-900 absolute">89<span className="text-xs">%</span></span>
              </div>
           </div>
        </div>

        {/* Diagnosis */}
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
           <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                 <h4 className="text-sm font-semibold text-gray-900">Critical Treatment Required</h4>
                 <p className="text-xs text-gray-600 mt-1 leading-relaxed">Early-stage larval feeding detected on whorl leaves. Immediate pyrethroid or biological control application recommended within 48 hours to prevent severe yield loss.</p>
              </div>
           </div>
        </div>

        {/* Action Plan */}
        <div>
           <h3 className="text-gray-900 font-display font-semibold text-lg mb-3">AI Recommendations</h3>
           <div className="space-y-3 relative">
              <div className="absolute left-[13px] top-6 bottom-6 w-px bg-gray-200"></div>
              
              <div className="flex items-start space-x-4 relative z-10">
                 <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 border-[3px] border-white shadow-sm mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-700">1</span>
                 </div>
                 <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex-1">
                    <h5 className="text-sm font-semibold text-gray-900 mb-1">Apply Emamectin Benzoate</h5>
                    <p className="text-xs text-gray-500">Dosage: 10g per 15L backpack sprayer. Target the whorl directly.</p>
                 </div>
              </div>
              
              <div className="flex items-start space-x-4 relative z-10">
                 <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 border-[3px] border-white shadow-sm mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-700">2</span>
                 </div>
                 <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex-1">
                    <h5 className="text-sm font-semibold text-gray-900 mb-1">Spray Timing</h5>
                    <p className="text-xs text-gray-500">Apply early morning (before 8 AM) or late evening to avoid rapid evaporation.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Environmental Factors */}
        <div>
           <h3 className="text-gray-900 font-display font-semibold text-lg mb-3">Local Context</h3>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center space-x-3">
                 <Thermometer className="w-4 h-4 text-gray-400" />
                 <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Temp limit</p>
                    <p className="text-xs font-semibold text-gray-900">Below 28°C safe</p>
                 </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center space-x-3">
                 <Wind className="w-4 h-4 text-gray-400" />
                 <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Wind risk</p>
                    <p className="text-xs font-semibold text-gray-900">Low drift risk</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="pt-2 pb-8">
           <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl shadow-[0_10px_20px_-10px_rgba(5,150,105,0.5)] transition-all">
             Save & Add to Monitor Plan
           </button>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
      `}</style>
    </PhoneFrame>
  );
}
