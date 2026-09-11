import React, { useState } from 'react';
import { AlertTriangle, Map, Calendar, Check, X } from 'lucide-react';

export function ActionCenter() {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<"idle" | "loading" | "success">("idle");

  const openModal = (action: string) => {
    setCurrentAction(action);
    setModalOpen(true);
    setActionStatus("idle");
  };

  const confirmAction = () => {
    setActionStatus("loading");
    setTimeout(() => {
      setActionStatus("success");
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full relative">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Command & Action Center</h2>
      
      <div className="space-y-3">
        <button onClick={() => openModal("Trigger Crop Advisory")} className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
          <div className="flex items-center space-x-3">
             <AlertTriangle className="w-5 h-5" />
             <span className="font-bold text-sm">Send Bulk Advisory</span>
          </div>
        </button>

        <button onClick={() => openModal("Dispatch Field Agents")} className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
          <div className="flex items-center space-x-3">
             <Map className="w-5 h-5" />
             <span className="font-bold text-sm">Dispatch Agents to High Risk</span>
          </div>
        </button>

        <button onClick={() => openModal("Schedule Executive Visit")} className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
           <div className="flex items-center space-x-3">
             <Calendar className="w-5 h-5" />
             <span className="font-bold text-sm">Schedule Regional Visit</span>
          </div>
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
               <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to execute: <br/><strong className="text-gray-800">{currentAction}</strong>?</p>
            
            {actionStatus === "idle" && (
                <div className="flex space-x-3">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                <button onClick={confirmAction} className="flex-1 py-2 rounded-lg bg-[#075e54] text-white font-bold hover:bg-[#128c7e] transition-colors text-sm">Confirm</button>
                </div>
            )}
            
            {actionStatus === "loading" && (
                <div className="flex flex-col items-center py-4">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-medium text-emerald-700">Executing...</p>
                </div>
            )}

            {actionStatus === "success" && (
                <div className="flex flex-col items-center py-4 text-emerald-600">
                    <Check className="w-10 h-10 mb-2 bg-emerald-100 p-2 rounded-full" />
                    <p className="font-bold">Action Executed</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
