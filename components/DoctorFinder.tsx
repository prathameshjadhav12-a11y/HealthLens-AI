
import React, { useState } from 'react';
import { findNearbyDoctors } from '../services/geminiService';
import { DoctorSearchResult } from '../types';

interface DoctorFinderProps {
  symptoms: string;
}

const DoctorFinder: React.FC<DoctorFinderProps> = ({ symptoms }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoctorSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFindDoctors = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await findNearbyDoctors(symptoms, latitude, longitude);
          setResult(data);
        } catch (err: any) {
          setError(err.message || "Failed to find doctors nearby.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        let msg = "Unable to retrieve your location.";
        if (err.code === 1) msg = "Location permission denied. Please allow access.";
        else if (err.code === 2) msg = "Location unavailable. Please check your connection.";
        else if (err.code === 3) msg = "Location request timed out.";
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Helper to render text content
  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) return <li key={i} className="ml-4 text-slate-600 mb-1">{line.trim().substring(2)}</li>;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-slate-600 mb-2">{line}</p>;
    });
  };

  return (
    <div className="mt-8 bg-indigo-50 rounded-xl border border-indigo-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-indigo-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Find Nearby Medical Help
        </h3>
      </div>

      {!result && !loading && (
        <div>
          <p className="text-indigo-800 mb-4 text-sm">
            Based on your symptoms, we can help you find relevant specialists or clinics near you.
          </p>
          <button
            onClick={handleFindDoctors}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Locate Nearby Doctors
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
          <span className="text-indigo-800 font-medium">Locating specialists near you...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100 mt-2">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
           <div className="prose prose-sm prose-indigo text-slate-700 mb-6">
             {formatContent(result.content)}
           </div>

           {result.mapSources.length > 0 && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {result.mapSources.map((source, idx) => (
                 <a 
                   key={idx}
                   href={source.uri}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex flex-col p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all group"
                 >
                   <div className="flex items-center mb-1">
                     <div className="bg-green-100 p-1.5 rounded-full mr-2 text-green-600">
                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                       </svg>
                     </div>
                     <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 truncate">{source.title}</span>
                   </div>
                   <div className="text-xs text-slate-500 pl-8 flex items-center">
                      <span>View on Google Maps</span>
                      <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                   </div>
                 </a>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default DoctorFinder;
