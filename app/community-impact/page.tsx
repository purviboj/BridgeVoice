import ImpactDashboard from '@/ImpactDashboard';

export default function CommunityImpactPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Community Impact</h1>
        <p className="mt-4 text-slate-700">
          BridgeVoice is designed to improve healthcare access for multilingual and hearing-impaired patients.
        </p>
        <div className="mt-6">
          <ImpactDashboard />
        </div>
      </section>
    </main>
  );
}
