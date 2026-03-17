/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  Linkedin, 
  ExternalLink, 
  Phone, 
  MessageSquare, 
  User, 
  Building2, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  History,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AgentInfo {
  name: string;
  whatsapp: string;
  agency: string;
  location?: string;
  sourceUrl: string;
  timestamp: number;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AgentInfo[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('agent_connect_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (info: AgentInfo) => {
    const newHistory = [info, ...history.filter(h => h.sourceUrl !== info.sourceUrl)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('agent_connect_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('agent_connect_history');
  };

  const extractAgentInfo = async () => {
    if (!url.trim()) {
      setError("Please enter a valid LinkedIn, Bayut, or Property Finder profile URL.");
      return;
    }

    if (!url.includes('linkedin.com') && !url.includes('bayut.com') && !url.includes('propertyfinder.ae')) {
      setError("Only LinkedIn, Bayut.com, and Propertyfinder.ae URLs are supported currently.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Extract the professional details of the real estate agent from this URL: ${url}
        
        I need:
        1. Full Name
        2. WhatsApp Number (in international format, e.g., +971...)
        3. Agency Name
        4. Location (if available)
        
        This URL is from ${url.includes('propertyfinder.ae') ? 'Property Finder' : url.includes('bayut.com') ? 'Bayut' : 'LinkedIn'}.
        If the WhatsApp number is not directly visible on the page, use Google Search to find the contact details for this specific agent (Name + Agency).
        Return the data in a clean JSON format.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }, { googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              whatsapp: { type: "STRING", description: "WhatsApp number in international format" },
              agency: { type: "STRING" },
              location: { type: "STRING" }
            },
            required: ["name", "whatsapp", "agency"]
          }
        },
      });

      const data = JSON.parse(response.text || '{}');
      
      if (!data.whatsapp || data.whatsapp === "Not found") {
        throw new Error("Could not find a WhatsApp number for this agent.");
      }

      const agentInfo: AgentInfo = {
        ...data,
        sourceUrl: url,
        timestamp: Date.now()
      };

      setResult(agentInfo);
      saveToHistory(agentInfo);
      setUrl('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while extracting information. The profile might be private or protected.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string = 'main') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Phone size={18} />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">AgentConnect Pro</h1>
          </div>
          <div className="text-xs font-medium text-black/40 uppercase tracking-widest">
            AI-Powered Extraction
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Input & Results */}
          <div className="lg:col-span-7 space-y-8">
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-medium tracking-tight">Find Agent Contact</h2>
                <p className="text-black/50 text-sm">Enter a LinkedIn, Bayut, or Property Finder profile link to extract the WhatsApp number.</p>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-black/30 group-focus-within:text-emerald-600 transition-colors">
                  <Search size={20} />
                </div>
                <input 
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/... or https://www.bayut.com/... or https://www.propertyfinder.ae/..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-black/10 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && extractAgentInfo()}
                />
                <button 
                  onClick={extractAgentInfo}
                  disabled={loading || !url}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-black/10 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Extract'}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </section>

            {/* Result Card */}
            {result && (
              <section className="animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-white border border-black/5 rounded-3xl shadow-xl overflow-hidden">
                  <div className="bg-emerald-600 p-6 text-white flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-widest">
                        <CheckCircle2 size={14} />
                        Agent Found
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight">{result.name}</h3>
                    </div>
                    <a 
                      href={result.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest flex items-center gap-1.5">
                          <Building2 size={12} />
                          Agency
                        </label>
                        <p className="font-medium text-lg">{result.agency}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest flex items-center gap-1.5">
                          <User size={12} />
                          Location
                        </label>
                        <p className="font-medium text-lg">{result.location || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-black/5">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-emerald-50 rounded-2xl p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                              <MessageSquare size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">WhatsApp</p>
                              <p className="text-xl font-bold text-emerald-900">{result.whatsapp}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(result.whatsapp, 'result')}
                            className={cn(
                              "p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                              copiedId === 'result' 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "hover:bg-emerald-100 text-emerald-700"
                            )}
                            title="Copy to clipboard"
                          >
                            {copiedId === 'result' ? (
                              <>
                                <Check size={18} />
                                <span className="animate-in fade-in slide-in-from-right-1">Copied!</span>
                              </>
                            ) : (
                              <Copy size={18} />
                            )}
                          </button>
                        </div>
                        
                        <a 
                          href={`https://wa.me/${result.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                          Chat Now
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {!result && !loading && !error && (
              <div className="h-64 border-2 border-dashed border-black/5 rounded-3xl flex flex-col items-center justify-center text-black/20 space-y-4">
                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                  <Search size={24} />
                </div>
                <p className="text-sm font-medium">Ready to search for agents</p>
              </div>
            )}
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-black/60">
                <History size={18} />
                <h3 className="font-semibold tracking-tight">Recent Extractions</h3>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="p-8 bg-white border border-black/5 rounded-2xl text-center space-y-2">
                  <p className="text-sm text-black/40 font-medium">No history yet</p>
                  <p className="text-xs text-black/30">Your recent agent finds will appear here.</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-white border border-black/5 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => setResult(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm group-hover:text-emerald-600 transition-colors">{item.name}</p>
                        <p className="text-[10px] text-black/40 font-medium uppercase tracking-wider">{item.agency}</p>
                      </div>
                      <div className="text-emerald-600">
                        {item.sourceUrl.includes('linkedin') ? <Linkedin size={14} /> : item.sourceUrl.includes('bayut') ? <div className="text-[10px] font-bold">B</div> : <div className="text-[10px] font-bold">PF</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <Phone size={10} />
                        {item.whatsapp}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.whatsapp, `history-${idx}`);
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            copiedId === `history-${idx}` 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "hover:bg-black/5 text-black/40 hover:text-emerald-600"
                          )}
                          title="Copy number"
                        >
                          {copiedId === `history-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <p className="text-[10px] text-black/30 font-medium">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tips Section */}
            <div className="p-6 bg-emerald-50 rounded-3xl space-y-4">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Pro Tips</h4>
              <ul className="space-y-3">
                {[
                  "LinkedIn profiles work best if they are public.",
                  "Bayut and Property Finder profiles are highly reliable.",
                  "The AI will search Google if the number is hidden.",
                  "International formats are preferred for direct chatting."
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 text-xs text-emerald-900/70 leading-relaxed">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-black/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-black/40 font-medium">
            © {new Date().getFullYear()} AgentConnect Pro. For professional use only.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-xs text-black/40 hover:text-black/60 font-medium transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-black/40 hover:text-black/60 font-medium transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-black/40 hover:text-black/60 font-medium transition-colors">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
