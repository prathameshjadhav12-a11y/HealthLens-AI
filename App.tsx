
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Disclaimer from './components/Disclaimer';
import ResultView from './components/ResultView';
import DoctorFinder from './components/DoctorFinder';
import { analyzeSymptoms } from './services/geminiService';
import { AnalysisResult, HistoryItem } from './types';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Japanese', 'Arabic', 'Portuguese'
];

const App: React.FC = () => {
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // New States
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('healthlens_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g. "data:image/jpeg;base64,") for API usage if strictly raw base64 needed, 
        // but GenAI SDK often handles the data URI format or we parse it.
        // The inlineData expects just the base64 data, so we split.
        const base64Data = base64String.split(',')[1];
        setSelectedImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim() && !selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Pass image and language to service
      const data = await analyzeSymptoms(symptoms, selectedImage, selectedLanguage);
      setResult(data);
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        symptoms: symptoms || (selectedImage ? '[Image Scan Analysis]' : ''),
        timestamp: Date.now(),
        result: data,
      };
      
      const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('healthlens_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('healthlens_history');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">HealthLens AI</h1>
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-widest">Symptom Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Language Selector in Header */}
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <nav className="hidden sm:flex space-x-6">
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                History
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Disclaimer />

        {/* Search Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your symptoms</h2>
              <p className="text-slate-500 text-sm">Describe feelings or upload a photo of visible symptoms (e.g., rashes, swelling).</p>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="relative">
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Example: I've had a red itchy rash on my arm for 2 days..."
                className="w-full h-32 p-4 rounded-xl border border-slate-700 bg-slate-900 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-slate-200 placeholder:text-slate-500"
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                {symptoms.length} chars
              </div>
            </div>

            {/* Instant Scan / Image Upload Area */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                {!selectedImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="flex items-center text-slate-500 group-hover:text-indigo-600">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-semibold text-sm">Instant Scan (Upload Photo)</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload}
                    />
                  </div>
                ) : (
                  <div className="h-16 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between px-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-slate-300 rounded overflow-hidden mr-3">
                        <img src={`data:image/jpeg;base64,${selectedImage}`} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Image attached</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={removeImage}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || (!symptoms.trim() && !selectedImage)}
                className={`
                  sm:w-auto w-full px-8 h-16 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center shrink-0
                  ${isAnalyzing || (!symptoms.trim() && !selectedImage)
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:transform active:scale-95 shadow-indigo-100'}
                `}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scanning...
                  </>
                ) : (
                  <>
                    Run Analysis
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-8 flex items-center">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {isAnalyzing && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-100 rounded-full w-3/4 mb-4"></div>
            <div className="h-4 bg-slate-100 rounded-full w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-3 bg-slate-50 rounded-full w-full"></div>
              <div className="h-3 bg-slate-50 rounded-full w-full"></div>
              <div className="h-3 bg-slate-50 rounded-full w-2/3"></div>
            </div>
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ResultView result={result} />
            <DoctorFinder symptoms={symptoms || (selectedImage ? 'Visual symptoms' : 'General symptoms')} />
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <section className="mt-16 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Recent Checks</h3>
              <button 
                onClick={clearHistory}
                className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear History
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setResult(item.result);
                    setSymptoms(item.symptoms);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 italic">"{item.symptoms}"</p>
                  {item.result.confidence && (
                    <div className="mt-2 flex items-center">
                       <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500" style={{width: `${item.result.confidence.score}%`}}></div>
                       </div>
                       <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">{item.result.confidence.label} Conf.</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">HealthLens AI</span>
          </div>
          <p className="text-sm mb-4 max-w-lg mx-auto">
            Empowering individuals with intelligent, grounded health information. Always consult a medical professional for clinical diagnosis.
          </p>
          <div className="flex justify-center space-x-8 text-xs uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="mt-8 text-[10px] text-slate-600">
            © {new Date().getFullYear()} HealthLens AI. Powered by Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
