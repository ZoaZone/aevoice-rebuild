import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mic, Minimize2, X } from 'lucide-react';
import SreeAvatar from '@/components/sree/SreeAvatar.jsx';
import { isDesktopApp } from '@/components/utils/desktopContext';

/**
 * SreeDesktop Component
 * Placeholder for future Electron/Tauri desktop app integration
 * 
 * This component will be used when Sree is accessed from a desktop application
 * rather than the web browser. It provides a native app experience.
 */
export default function SreeDesktop({ enabled = true, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const desktop = isDesktopApp();
    if (desktop) {
      console.log('[SreeDesktop] Desktop environment detected');
      // Future: Initialize desktop-specific features
      // - Native notifications
      // - System tray integration
      // - Local storage for offline mode
      // - Desktop voice API integration
    }
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');

    // Placeholder for desktop-optimized chat API
    // Future: Will use local processing when possible
    try {
      // TODO: Implement desktop chat API endpoint
      const response = "Desktop chat response coming soon...";
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('[SreeDesktop] Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    // Future: Integrate with desktop voice API
    console.log('[SreeDesktop] Voice mode:', !isListening ? 'enabled' : 'disabled');
  };

  if (!enabled) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg" 
            alt="Sree" 
            className="w-full h-full rounded-full object-cover"
          />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-2xl border-cyan-500/20">
        <CardHeader className="flex-row items-center justify-between space-y-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          <CardTitle className="text-sm flex items-center gap-2">
            <SreeAvatar className="w-6 h-6 rounded-full object-cover" />
            Sree Desktop
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleVoice}
            >
              <Mic className={`h-4 w-4 ${isListening ? 'text-red-300' : ''}`} />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p className="text-sm">Hi! I'm Sree Desktop Assistant</p>
                <p className="text-xs">Start chatting or use voice mode</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t bg-white">
            <form 
              className="flex gap-2" 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!input.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Send
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}