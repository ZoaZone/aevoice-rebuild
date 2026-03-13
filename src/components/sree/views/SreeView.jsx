import SreeAssistant from '@/components/assistant/SreeAssistant';

export default function SreeView({ config }){
  // Reuse existing, fully-featured assistant
  // SreeAssistant already has voice, KB, and all Sree features built-in
  return <SreeAssistant />;
}