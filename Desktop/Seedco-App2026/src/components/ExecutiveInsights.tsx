import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export function ExecutiveInsights({ data }: { data: any }) {
  const [insights, setInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data })
        });
        const resData = await response.json();
        setInsights(resData.insights || 'Insights could not be generated.');
      } catch (error) {
        console.error(error);
        setInsights('Error fetching insights. Please check API configuration.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsights();
  }, [data]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-gray-800">Executive Insights</h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-32 space-x-2 text-emerald-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Generating AI insights...</span>
        </div>
      ) : (
        <div className="prose prose-sm text-gray-600 prose-ul:pl-4">
          <div dangerouslySetInnerHTML={{ __html: insights.replace(/\n\n/g, '<br/>').replace(/\*/g, '').replace(/-/g, '•') }} />
        </div>
      )}
    </div>
  );
}
