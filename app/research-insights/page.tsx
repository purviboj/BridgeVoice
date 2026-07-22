export default function ResearchInsightsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Research Insights</h1>
        <p className="mt-4 text-slate-700">
          BridgeVoice focuses on accessibility, clear medical communication, and patient understanding.
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-6 text-slate-700">
          <li>Real-time captions improve comprehension for deaf and hard-of-hearing patients.</li>
          <li>Plain-language summaries help reduce confusion after clinical visits.</li>
          <li>Multilingual translation supports more inclusive care delivery.</li>
        </ul>
      </section>
    </main>
  );
}
