import React from 'react';
import { Clock, LogOut } from 'lucide-react';

export function PendingApprovalScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-[#0B7A4B]/20">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Account awaiting approval.</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your registration has been submitted and is currently pending administrator approval. 
            You will receive an email once your account is verified.
          </p>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );
}
