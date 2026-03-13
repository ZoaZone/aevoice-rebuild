import { useSession } from '@/hooks/useSession';

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 font-medium">{value || '—'}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, client } = useSession();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and workspace</p>
      </div>

      <Section title="Account">
        <Field label="Full Name"   value={user?.full_name} />
        <Field label="Email"       value={user?.email} />
        <Field label="Role"        value={user?.role} />
        <Field label="User ID"     value={user?.id} />
      </Section>

      <Section title="Workspace">
        <Field label="Client Name"  value={client?.name} />
        <Field label="Client ID"    value={client?.id} />
        <Field label="Status"       value={client?.status} />
        <Field label="Account Type" value={client?.account_type} />
      </Section>
    </div>
  );
}