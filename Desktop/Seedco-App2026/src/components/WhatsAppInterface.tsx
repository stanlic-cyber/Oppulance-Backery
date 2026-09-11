import { PhoneFrame } from "./DeviceFrame";
import maizeLeaf from "../assets/images/nc_maize_leaf_1781830614580.jpg";
import { Phone, Video, MoreVertical, Plus, Camera, Mic, Check, CheckCheck } from "lucide-react";

export function WhatsAppInterface() {
  return (
    <PhoneFrame theme="light" className="bg-[#EFEAE2]">
      {/* WhatsApp Header */}
      <div className="bg-[#008069] text-white flex items-center px-4 py-3 space-x-3 shadow-md z-10 relative">
        <div className="flex items-center flex-1">
          <div className="relative">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-400 p-1 overflow-hidden">
               <div className="w-full h-full bg-[#022A1E] rounded-full flex items-center justify-center font-display font-bold text-[10px]">NC</div>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="ml-3">
             <h2 className="font-semibold text-base leading-tight">NeuroSeedco Crop Ai <span className="inline-flex items-center justify-center bg-gray-200 text-gray-500 rounded-full w-3 h-3 text-[8px] ml-1">✓</span></h2>
             <p className="text-xs text-white/80">Active now</p>
          </div>
        </div>
        <div className="flex space-x-4 items-center">
          <Video className="w-5 h-5 opacity-80" />
          <Phone className="w-5 h-5 opacity-80" />
          <MoreVertical className="w-5 h-5 opacity-80" />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 font-sans text-[15px] h-full" 
           style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', opacity: 0.95 }}>
        
        {/* Date bubble */}
        <div className="flex justify-center my-2">
           <span className="bg-amber-100/80 text-amber-900/80 text-xs px-3 py-1 rounded-lg backdrop-blur-sm shadow-sm uppercase font-medium">Today</span>
        </div>

        {/* Message 1: Farmer */}
        <div className="flex justify-end">
           <div className="bg-[#dcf8c6] px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] shadow-sm relative text-gray-900">
              <span className="block mb-4">Hello</span>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-500 flex items-center">09:41 <CheckCheck className="w-3 h-3 ml-1 text-blue-500" /></span>
           </div>
        </div>

        {/* Message 2: NeuroSeedco Crop Ai */}
        <div className="flex justify-start">
           <div className="bg-white px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] shadow-sm relative text-gray-900 pb-5">
              <span className="block whitespace-pre-line">
                Welcome to NeuroSeedco Crop Ai.
                How can I assist you today?
                
                1. Weather Advice
                2. Crop Health
                3. Market Prices
                4. Planting Advice
              </span>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">09:41</span>
           </div>
        </div>

        {/* Message 3: Farmer Image Upload */}
        <div className="flex justify-end">
           <div className="bg-[#dcf8c6] p-1 rounded-lg rounded-tr-none max-w-[70%] shadow-sm relative text-gray-900 pb-5">
              <img src={maizeLeaf} alt="Uploaded leaf" className="w-full h-48 object-cover rounded-md mb-1" />
              <span className="block px-2 text-sm">Please check my maize. The leaves have holes.</span>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-500 flex items-center">09:45 <CheckCheck className="w-3 h-3 ml-1 text-blue-500" /></span>
           </div>
        </div>

        {/* Message 4: NeuroSeedco Crop Ai Image Response */}
        <div className="flex justify-start">
           <div className="bg-white px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] shadow-sm relative text-gray-900 pb-5">
              <div className="border-l-4 border-amber-500 bg-amber-50 p-2 mb-2 rounded-r flex items-center space-x-2">
                 <span className="text-amber-800 text-xs font-bold uppercase tracking-wide">Analysis Complete</span>
              </div>
              <span className="block font-medium mb-1 border-b border-gray-100 pb-1">🤖 Possible Fall Armyworm detected.</span>
              <span className="block text-gray-600 mb-2">Confidence: <strong className="text-amber-600">89%</strong></span>
              
              <span className="block font-medium text-emerald-700">Recommended Action:</span>
              <span className="block text-gray-700">Apply treatment within 48 hours. Prefer Emamectin Benzoate applied to the whorls directly.</span>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">09:46</span>
           </div>
        </div>

        {/* Message 5: Farmer Question */}
        <div className="flex justify-end">
           <div className="bg-[#dcf8c6] px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] shadow-sm relative text-gray-900 pb-5">
              <span className="block">Should I spray today? What about the weather?</span>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-500 flex items-center">09:50 <CheckCheck className="w-3 h-3 ml-1 text-gray-400" /></span>
           </div>
        </div>
        
        {/* Message 6: NeuroSeedco Crop Ai Weather advice */}
        <div className="flex justify-start mb-20">
           <div className="bg-white px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] shadow-sm relative text-gray-900 pb-5">
              <span className="block whitespace-pre-line">
                🌧️ Rain expected in 4 days.
                
                Delay fertilizer application by 3 days to prevent runoff. You have a clear window to spray insecticide today.
                
                📊 Expected yield improvement: +12%.
              </span>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">09:50</span>
           </div>
        </div>

      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#f0f2f5] p-2 flex items-end space-x-2 z-20">
         <button className="text-gray-500 p-2"><Plus className="w-6 h-6" /></button>
         <div className="flex-1 bg-white rounded-2xl border border-white flex items-end px-3 py-1.5 shadow-sm">
            <textarea 
              rows={1} 
              placeholder="Message"
              className="flex-1 w-full outline-none resize-none max-h-24 bg-transparent text-gray-800 text-[15px] pt-1" 
              readOnly
            />
            <button className="text-gray-400 mb-1 ml-2"><Camera className="w-6 h-6" /></button>
         </div>
         <button className="bg-[#00a884] text-white p-3 rounded-full flex-shrink-0 shadow-sm"><Mic className="w-5 h-5" /></button>
      </div>
    </PhoneFrame>
  );
}
