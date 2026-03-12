import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Monitor, 
  Lightbulb, 
  CheckCircle2, 
  Circle,
  ChevronRight,
  Play
} from 'lucide-react';
import SreeAvatar from '@/components/sree/SreeAvatar.jsx';
import desktopBridge from '@/desktop/desktopBridge';
import DesktopErrorBoundary from '@/components/desktop/DesktopErrorBoundary.jsx';

/**
 * SreeDesktopAgent Component
 * 
 * Desktop AI agent that provides guided assistance for desktop tasks
 * 
 * Features:
 * - Screen context awareness
 * - Step-by-step task guidance
 * - Multi-tasker functionality
 * - Integration with Electron/Tauri desktop wrapper
 * - Real-time assistance based on screen content
 */

// Configuration constants
const SCREEN_CONTEXT_UPDATE_INTERVAL = 3000; // 3 seconds

const SAMPLE_WORKFLOWS = [
  {
    id: 'onboarding',
    title: 'Getting Started with Sree',
    steps: [
      { title: 'Welcome', description: 'Learn about Sree\'s capabilities', completed: false },
      { title: 'Create Your First Agent', description: 'Set up a voice assistant', completed: false },
      { title: 'Configure Knowledge Base', description: 'Add your business information', completed: false },
      { title: 'Test Your Agent', description: 'Try a sample conversation', completed: false },
      { title: 'Go Live', description: 'Deploy to your website', completed: false }
    ]
  },
  {
    id: 'agent-setup',
    title: 'Creating a New Agent',
    steps: [
      { title: 'Choose Agent Type', description: 'Voice, chat, or hybrid', completed: false },
      { title: 'Set Personality', description: 'Define your agent\'s character', completed: false },
      { title: 'Add Knowledge', description: 'Import documents and data', completed: false },
      { title: 'Configure Features', description: 'Enable lead capture, appointments, etc.', completed: false },
      { title: 'Test & Deploy', description: 'Verify and launch', completed: false }
    ]
  },
  {
    id: 'knowledge-base',
    title: 'Building Your Knowledge Base',
    steps: [
      { title: 'Scan Website', description: 'Auto-import website content', completed: false },
      { title: 'Upload Documents', description: 'Add PDFs, docs, FAQs', completed: false },
      { title: 'Review Content', description: 'Verify imported information', completed: false },
      { title: 'Generate Embeddings', description: 'Process for AI search', completed: false },
      { title: 'Test Retrieval', description: 'Try sample queries', completed: false }
    ]
  }
];

export default function SreeDesktopAgent({ 
  config = {},
  workflowId = null
}) {
  const [currentWorkflow, setCurrentWorkflow] = useState(
    workflowId ? SAMPLE_WORKFLOWS.find(w => w.id === workflowId) : SAMPLE_WORKFLOWS[0]
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(currentWorkflow?.steps || []);
  const [contextInfo, setContextInfo] = useState({
    currentApp: 'Unknown',
    currentScreen: 'Dashboard',
    suggestion: 'Click "New Agent" to get started'
  });
  const [isDesktopApp, setIsDesktopApp] = useState(false);

  // Desktop context via desktopBridge API
  useEffect(() => {
    // Check if running in desktop mode
    const isDesktop = desktopBridge.isDesktopApp();
    setIsDesktopApp(isDesktop);
    
    if (!isDesktop) return;
    
    // Poll screen context every 3 seconds
    const cleanup = desktopBridge.pollScreenContext((context) => {
      if (context) {
        setContextInfo(context);
      }
    }, SCREEN_CONTEXT_UPDATE_INTERVAL);
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  const handleStepComplete = (stepIndex) => {
    const newSteps = [...steps];
    newSteps[stepIndex].completed = true;
    setSteps(newSteps);

    // Move to next incomplete step
    const nextIncomplete = newSteps.findIndex((step, idx) => idx > stepIndex && !step.completed);
    if (nextIncomplete !== -1) {
      setCurrentStep(nextIncomplete);
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleWorkflowChange = (workflow) => {
    setCurrentWorkflow(workflow);
    setSteps(workflow.steps);
    setCurrentStep(0);
  };

  const step = steps[currentStep];
  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;
  const avatarUrl = config.avatarUrl || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg";

  return (
    <DesktopErrorBoundary>
      <div className="fixed bottom-6 right-6 z-50 w-96">
      <Card className="shadow-2xl border-2 border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-900/20 text-white">
        <CardHeader className="border-b border-purple-500/30">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <SreeAvatar src={avatarUrl} className="w-8 h-8 rounded-full object-cover border-2 border-purple-400" />
              <span>Sree Desktop Agent</span>
              {isDesktopApp && (
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                  DESKTOP
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Context awareness (desktop only) */}
          {isDesktopApp && (
            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/20">
              <div className="flex items-start gap-2 text-sm">
                <Monitor className="w-4 h-4 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-purple-300 font-medium">Screen Context</p>
                  <p className="text-slate-400 text-xs mt-1">{contextInfo.currentApp} • {contextInfo.currentScreen}</p>
                </div>
              </div>
            </div>
          )}

          {/* Workflow selector */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Current Workflow</label>
            <select
              value={currentWorkflow.id}
              onChange={(e) => {
                const workflow = SAMPLE_WORKFLOWS.find(w => w.id === e.target.value);
                if (workflow) handleWorkflowChange(workflow);
              }}
              className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
            >
              {SAMPLE_WORKFLOWS.map(workflow => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.title}
                </option>
              ))}
            </select>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Current step */}
          {step && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-full ${step.completed ? 'bg-green-500/20' : 'bg-purple-500/20'}`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Play className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    Step {currentStep + 1}: {step.title}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Context-aware suggestion */}
              {isDesktopApp && contextInfo.suggestion && (
                <div className="flex items-start gap-2 bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-300">{contextInfo.suggestion}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handlePreviousStep()}
                  disabled={currentStep === 0}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  Back
                </Button>
                
                {!step.completed && (
                  <Button
                    onClick={() => handleStepComplete(currentStep)}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
                
                <Button
                  onClick={() => handleNextStep()}
                  disabled={currentStep === steps.length - 1}
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step list */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2">All Steps</p>
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                  idx === currentStep 
                    ? 'bg-purple-500/20 border border-purple-500/40' 
                    : 'bg-slate-800/30 border border-transparent hover:border-purple-500/20'
                }`}
              >
                {s.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : idx === currentStep ? (
                  <Play className="w-4 h-4 text-purple-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 text-left ${
                  s.completed ? 'text-slate-400 line-through' : 'text-white'
                }`}>
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </DesktopErrorBoundary>
  );
}