import React from "react";
import { HelpCircle, ExternalLink, BookOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export default function HelpTooltip({ 
  content, 
  title,
  learnMoreLink,
  videoLink,
  side = "top"
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button className="ml-1.5 p-1 hover:bg-slate-100 rounded-full transition-colors inline-flex">
            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs p-4">
          {title && (
            <p className="font-medium text-slate-900 mb-1">{title}</p>
          )}
          <p className="text-sm text-slate-600">{content}</p>
          {(learnMoreLink || videoLink) && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
              {learnMoreLink && (
                <a 
                  href={learnMoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  <BookOpen className="w-3 h-3" />
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {videoLink && (
                <a 
                  href={videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                >
                  Watch video
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline help component for form fields
export function FieldHelp({ children, step }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 mt-2">
      <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-700">
        {step && <span className="font-medium">Step {step}: </span>}
        {children}
      </div>
    </div>
  );
}

// Step indicator with help
export function StepGuide({ steps, currentStep }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div 
          key={index}
          className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
            index + 1 === currentStep 
              ? "bg-indigo-50 border border-indigo-200" 
              : index + 1 < currentStep
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
            index + 1 === currentStep 
              ? "bg-indigo-600 text-white" 
              : index + 1 < currentStep
              ? "bg-emerald-500 text-white"
              : "bg-slate-300 text-slate-600"
          }`}>
            {index + 1 < currentStep ? "✓" : index + 1}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${
              index + 1 <= currentStep ? "text-slate-900" : "text-slate-500"
            }`}>
              {step.title}
            </p>
            {step.description && (
              <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
            )}
          </div>
          {step.helpLink && index + 1 === currentStep && (
            <a 
              href={step.helpLink}
              target="_blank"
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Help
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}