import { useRef, useState } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RecordingPlayer({ recordingUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  if (!recordingUrl) return null;

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    // Create a temporary anchor element to download the file safely
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `recording-${Date.now()}.mp3`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
      <Button
        size="sm"
        variant="ghost"
        onClick={togglePlay}
        className="h-8 w-8 p-0"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      
      <audio
        ref={audioRef}
        src={recordingUrl}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        <div className="w-full bg-slate-200 h-1 rounded-full mt-1">
          <div 
            className="bg-indigo-600 h-1 rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDownload}
        className="h-8 w-8 p-0"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
