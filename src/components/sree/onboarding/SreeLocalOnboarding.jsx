import OnboardingCard from "./OnboardingCard";

export default function SreeLocalOnboarding({ kbStatus = "none", onDismiss }) {
  const kbConnected = kbStatus === "connected";
  const kbEmpty = kbStatus === "empty";

  const statusList = [
    { label: kbConnected ? "Knowledge Base Connected" : kbEmpty ? "Knowledge Base Empty" : "No Knowledge Base Found", active: kbConnected },
  ];

  const demo = !kbConnected ? (
    <div>
      <p className="text-slate-300">Demo Q&A (sample):</p>
      <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2">
        <p className="font-medium">Q: What services do you offer?</p>
        <p className="text-slate-300">A: We provide appointment scheduling, customer support, and product inquiries by phone or chat.</p>
      </div>
      <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2 mt-2">
        <p className="font-medium">Q: What are your hours?</p>
        <p className="text-slate-300">A: Our business hours are Mon–Fri, 9am–6pm (local time). After-hours, calls route to voicemail.</p>
      </div>
    </div>
  ) : null;

  return (
    <OnboardingCard
      title="Sree (Local Knowledge)"
      description={
        "Upload your Knowledge Base (Dashboard → Knowledge) then ask questions like: 'What services do you offer?' or 'What are your hours?'"
      }
      statusList={statusList}
      demoContent={demo}
      onDismiss={onDismiss}
    />
  );
}