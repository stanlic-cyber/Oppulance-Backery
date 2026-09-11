import { PhoneFrame } from "./DeviceFrame";
import { Signal, Battery, ChevronLeft, Info, Send } from "lucide-react";

export function SMSInterface() {
  return (
    <PhoneFrame theme="light" className="bg-gray-100">
      {/* iOS Style Status Bar */}
      <div className="bg-gray-100/80 backdrop-blur-md pt-12 pb-2 px-4 flex justify-between items-center z-20 relative">
        <div className="flex items-center text-blue-500 space-x-1">
           <ChevronLeft className="w-5 h-5" />
           <span className="text-[15px]">Messages</span>
        </div>
        <div className="flex flex-col items-center">
           <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mb-0.5">
             <span className="text-white text-xs font-bold">NC</span>
           </div>
           <span className="text-[10px] text-gray-500 font-medium">NeuroSeedco</span>
        </div>
        <div className="w-[84px] flex justify-end">
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 font-sans h-full">
         
         <div className="flex justify-center mb-4">
            <span className="text-[11px] text-gray-500 font-medium">Text Message • Today 14:02</span>
         </div>

         <div className="flex justify-end">
            <div className="bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[75%] shadow-sm">
               <p className="text-[15px]">MAIZE HARARE</p>
            </div>
         </div>

         <div className="flex justify-start">
            <div className="bg-[#E9E9EB] text-black px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm">
               <p className="text-[15px] whitespace-pre-line leading-relaxed">
                 NC AI:
                 Rain expected in 3 days.
                 Disease risk low.
                 Delay fertilizer application.
               </p>
            </div>
         </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 inset-x-0 bg-gray-100/90 backdrop-blur-md border-t border-gray-200 px-4 py-3 pb-8">
         <div className="flex items-center space-x-3 relative">
            <div className="w-full bg-white border border-gray-300 rounded-full px-4 py-1.5 flex items-center">
               <input type="text" placeholder="Text Message" className="flex-1 bg-transparent outline-none text-[15px]" readOnly />
               <button className="bg-blue-500 rounded-full w-7 h-7 flex items-center justify-center text-white shrink-0 ml-2">
                 <Send className="w-3.5 h-3.5 -ml-0.5" />
               </button>
            </div>
         </div>
      </div>
    </PhoneFrame>
  );
}

export function USSDInterface() {
  return (
    <PhoneFrame theme="dark" className="bg-black text-white relative flex justify-center items-center">
      {/* Lock screen / Home screen background blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-blue-900/30 opacity-50 blur-xl"></div>
      
      {/* iOS USSD Prompt */}
      <div className="relative z-10 w-[85%] bg-gray-200/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl flex flex-col font-sans">
         <div className="p-5 flex-1 min-h-[220px]">
           <p className="text-black font-mono text-sm whitespace-pre-wrap leading-relaxed tracking-tight">
NeuroSeedco Crop Ai Network

1. Weather Advice
2. Crop Health
3. Market Prices
4. Planting Advice
5. Contact Agronomist
6. Emergency Alerts

Reply with option:
           </p>
         </div>
         <div className="border-t border-gray-400/30 flex divide-x divide-gray-400/30">
            <button className="flex-1 py-3.5 text-blue-600 font-normal text-[17px]">Dismiss</button>
            <button className="flex-1 py-3.5 text-blue-600 font-semibold text-[17px]">Reply</button>
         </div>
      </div>
    </PhoneFrame>
  );
}
