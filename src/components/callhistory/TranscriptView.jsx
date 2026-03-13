import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

export function TranscriptView({ transcript, language }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!transcript) {
    return (
      <div className="text-xs text-slate-400 italic">
        No transcript available
      </div>
    );
  }

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success('Transcript copied to clipboard');
    } catch (_error) {
      toast.error('Failed to copy transcript. Please try again.');
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">Transcript</span>
          {language && (
            <Badge variant="secondary" className="text-xs">
              {language}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={copyTranscript}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      
      <div className={`text-sm text-slate-700 ${
        isExpanded ? '' : 'line-clamp-2'
      }`}>
        {transcript}
      </div>
    </div>
  );
}
