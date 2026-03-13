import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    
    // Check if Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay if not dismissed before
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed event to hide prompt
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show iOS prompt if on iOS and not installed
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    // Show prompt for other devices after delay
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (!dismissed && !standalone) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Hide prompt regardless of outcome (accepted or dismissed)
      setShowPrompt(false);
      localStorage.setItem('pwa-prompt-dismissed', 'true');
      setDeferredPrompt(null);
    } else {
      // If no deferred prompt, just hide the instructions
      setShowPrompt(false);
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed
  if (isStandalone) return null;
  
  // Don't show if user dismissed or not ready to show
  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="border-2 border-cyan-500/30 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
                alt="AEVOICE" 
                className="w-10 h-10 rounded-lg object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg">Install AEVOICE</h3>
                <button 
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-300 mb-3">
                {isIOS 
                  ? "Add to your home screen for quick access" 
                  : "Install for a native app experience"}
              </p>
              
              {isIOS ? (
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px]">1</span>
                    Tap the Share button <span className="text-cyan-400">⬆</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px]">2</span>
                    Scroll and tap "Add to Home Screen"
                  </p>
                </div>
              ) : isAndroid && !deferredPrompt ? (
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px]">1</span>
                    Tap the menu <span className="text-cyan-400">⋮</span> in Chrome
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px]">2</span>
                    Tap "Add to Home screen"
                  </p>
                </div>
              ) : deferredPrompt ? (
                <Button 
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 mb-2">
                    Open this page in your browser (outside the preview) to install the app.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDismiss}
                      className="flex-1 bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-lg"
                    >
                      Got it
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Mobile
            </span>
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Desktop
            </span>
            <span>Works Offline</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}