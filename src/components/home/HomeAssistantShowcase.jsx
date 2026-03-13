import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SreeModeSelector from '@/components/sree/SreeModeSelector';
import { trackEvent } from '@/components/telemetry/telemetry';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

export default function HomeAssistantShowcase(){
  const [selectedMode, setSelectedMode] = useState('Sri');
  const [navigating, setNavigating] = useState(false);
  const navigate = useNavigate();
  
  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    trackEvent('showcaseModeSelected', { mode });
  };
  
  const handleTryNow = async () => {
    setNavigating(true);
    
    try {
      // Persist selected mode to backend
      await base44.functions.invoke('setAssistantMode', { mode: selectedMode });
      
      if (window.SREE_DEBUG) {
        console.log('[HomeAssistantShowcase] Mode saved, navigating to demo:', selectedMode);
      }
      
      trackEvent('showcaseNavigateToDemo', { mode: selectedMode });
      
      // Navigate to Sree demo page where unified widget is displayed
      navigate('/sree-demo');
    } catch (error) {
      if (window.SREE_DEBUG) {
        console.error('[HomeAssistantShowcase] Failed to save mode:', error);
      }
      // Navigate anyway, mode selector in demo will load from backend or use default
      navigate('/sree-demo');
    } finally {
      setNavigating(false);
    }
  };
  
  return (
    <section className="relative z-10 px-8 lg:px-16 py-20 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-cyan-400 font-mono text-sm tracking-widest mb-3">MEET YOUR ASSISTANTS</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Sri & Sree</h2>
          <p className="text-slate-400 mt-2">Choose the right mode for your use case — from lightweight chat to agentic automation.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <Badge className="mb-3 bg-slate-800 text-slate-200 border-slate-700">Sri</Badge>
              <h3 className="text-xl font-semibold text-white mb-2">Simple Text Assistant</h3>
              <p className="text-slate-400 text-sm mb-4">Text-only, lightweight, perfect for basic tenants.</p>
              <img src="https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=1200&q=80" alt="Sri" className="rounded-lg border border-slate-800"/>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <Badge className="mb-3 bg-purple-500/20 text-purple-300 border-purple-500/30">Sree</Badge>
              <h3 className="text-xl font-semibold text-white mb-2">Advanced Assistant</h3>
              <p className="text-slate-400 text-sm mb-4">Voice + KB + agentic actions for workflows.</p>
              <img src="https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&q=80" alt="Sree" className="rounded-lg border border-slate-800"/>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 border border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-900/60">
              <tr>
                <th className="p-3">Feature</th>
                <th className="p-3">Sri</th>
                <th className="p-3">Sree</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Text Chat','✅','✅'],
                ['Voice','❌','✅'],
                ['KB Retrieval','❌','✅'],
                ['Hotword','❌','✅'],
                ['Screen Context','❌','✅'],
                ['Agentic Actions','❌','✅'],
                ['Best For','Simple chat','Automation & workflows']
              ].map((row,i)=> (
                <tr key={i} className="border-t border-slate-800">
                  <td className="p-3">{row[0]}</td>
                  <td className="p-3">{row[1]}</td>
                  <td className="p-3">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <p className="text-slate-400 text-sm mb-2">Select a mode to try:</p>
            <SreeModeSelector mode={selectedMode} onChange={handleModeChange} persistToBackend={false} />
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleTryNow}
              disabled={navigating}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8 py-3 rounded-lg font-semibold"
            >
              {navigating ? 'Loading...' : `Try ${selectedMode} Now →`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}