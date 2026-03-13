import OnboardingCard from "./OnboardingCard";

export default function SreeAgenticOnboarding({
  hotwordActive = false,
  screenContextActive = false,
  overlayActive = false,
  kbConnected = false,
  onDismiss,
}) {
  const statusList = [
    { label: kbConnected ? "Knowledge Base Connected" : "Knowledge Base Missing", active: kbConnected },
    { label: hotwordActive ? "Hotword: Active" : "Hotword: Inactive", active: hotwordActive },
    { label: screenContextActive ? "Screen Context: Active" : "Screen Context: Inactive", active: screenContextActive },
    { label: overlayActive ? "Overlay: Active" : "Overlay: Inactive", active: overlayActive },
  ];

  const demo = (
    <div>
      <p className="text-slate-300">Quick start:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Install the AEVOICE Desktop App</li>
        <li>Enable screen context and overlay</li>
        <li>Say “Hey Sree” to activate voice commands</li>
        <li>On any page, try: “Summarize this page”</li>
        <li>Ask: “Extract all phone numbers”</li>
        <li>Ask: “Fill this form”</li>
      </ul>
      <div className="grid sm:grid-cols-3 gap-2 mt-2">
        <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2 text-xs">[Demo] Screen context detected</div>
        <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2 text-xs">[Demo] Overlay shows next steps</div>
        <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2 text-xs">[Demo] Action: Fill form</div>
      </div>
    </div>
  );

  return (
    <OnboardingCard
      title="AI Sree (Agentic Assistant)"
      description="Turn on desktop features for hands-free assistance with on-screen context and actions."
      statusList={statusList}
      demoContent={demo}
      onDismiss={onDismiss}
    />
  );
}