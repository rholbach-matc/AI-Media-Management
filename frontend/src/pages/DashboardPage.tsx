import { useAuth } from '../hooks/useAuth';

const stats = [
  { label: 'Total outputs', value: '--' },
  { label: 'Total projects', value: '--' },
  { label: 'Recent sessions', value: '--' },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-ink">
          Welcome to Grok Organizer, {user?.display_name}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <section key={stat.label} className="rounded-lg border border-slate-800 bg-panel p-5">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-200">{stat.value}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
