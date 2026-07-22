import ImpactDashboard from '@/ImpactDashboard';
import SessionPanel from '@/SessionPanel';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Live transcript and translation tools for BridgeVoice sessions.
          </p>
        </div>

        <SessionPanel sessionId="mobile-demo" />
        <ImpactDashboard />
      </section>
    </main>
  );
}
