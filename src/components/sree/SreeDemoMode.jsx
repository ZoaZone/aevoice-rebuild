import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";

// Demo scenarios for Sree path-breaking assistant
const DEMO_SCENARIOS = [
  {
    id: "voice-conversation",
    title: "Voice Conversation",
    description: "Experience natural voice interaction with Sree",
    steps: [
      "User: Hello Sree",
      "Sree: Hi! I'm Sree, your path-breaking AI assistant. How can I help you today?",
      "User: Tell me about your capabilities",
      "Sree: I can help with voice conversations, lead capture, knowledge base queries, and more!"
    ]
  },
  {
    id: "lead-capture",
    title: "Lead Capture",
    description: "See how Sree captures leads automatically",
    steps: [
      "User: I'm interested in your services",
      "Sree: Great! Let me collect some information. What's your name?",
      "User: John Doe",
      "Sree: Thanks John! What's your email address?",
      "User: john@example.com",
      "Sree: Perfect! I've captured your information and someone will contact you soon."
    ]
  },
  {
    id: "knowledge-base",
    title: "Knowledge Base Query",
    description: "Watch Sree answer questions from your knowledge base",
    steps: [
      "User: What are your business hours?",
      "Sree: Based on our knowledge base, we're open Monday-Friday 9am-6pm EST.",
      "User: Do you offer support?",
      "Sree: Yes! We provide 24/7 email support and live chat during business hours."
    ]
  }
];

/**
 * SreeDemoMode - Demo and kiosk mode for Sree widget
 * Features:
 * - Multiple demo scenarios
 * - Auto-play functionality
 * - Kiosk mode support
 * - Navigation controls
 * - Path-breaking AI showcase
 */
export default function SreeDemoMode({ kioskMode = false, autoPlay = false }) {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const scenario = DEMO_SCENARIOS[currentScenario];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      if (currentStep < scenario.steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Move to next scenario or loop
        if (currentScenario < DEMO_SCENARIOS.length - 1) {
          setCurrentScenario(currentScenario + 1);
          setCurrentStep(0);
        } else if (kioskMode) {
          // Loop back to start in kiosk mode
          setCurrentScenario(0);
          setCurrentStep(0);
        } else {
          setIsPlaying(false);
        }
      }
    }, 3000); // 3 seconds per step

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, currentScenario, scenario.steps.length, kioskMode]);

  const handleNext = () => {
    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentScenario < DEMO_SCENARIOS.length - 1) {
      setCurrentScenario(currentScenario + 1);
      setCurrentStep(0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentScenario > 0) {
      setCurrentScenario(currentScenario - 1);
      setCurrentStep(DEMO_SCENARIOS[currentScenario - 1].steps.length - 1);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 p-8">
      {kioskMode && (
        <div className="fixed top-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
          KIOSK MODE
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sree - Path-Breaking AI Assistant
          </h1>
          <p className="text-lg text-gray-600">
            Experience the future of AI-powered conversations
          </p>
        </div>

        <Card className="p-8 shadow-2xl bg-white/90 backdrop-blur">
          {/* Scenario Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {scenario.title}
            </h2>
            <p className="text-gray-600">{scenario.description}</p>
          </div>

          {/* Demo Steps */}
          <div className="space-y-4 min-h-[300px]">
            {scenario.steps.slice(0, currentStep + 1).map((step, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  step.startsWith("User:")
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : "bg-purple-50 border-l-4 border-purple-500"
                }`}
              >
                <p className="text-gray-800">{step}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentScenario === 0 && currentStep === 0}
              variant="outline"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={togglePlay}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Play
                </>
              )}
            </Button>

            <Button
              onClick={handleNext}
              disabled={
                currentScenario === DEMO_SCENARIOS.length - 1 &&
                currentStep === scenario.steps.length - 1
              }
              variant="outline"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Scenario Navigation */}
          <div className="mt-6 flex justify-center gap-2">
            {DEMO_SCENARIOS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentScenario(idx);
                  setCurrentStep(0);
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  idx === currentScenario
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
