'use client';

import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';

type ImpactMetrics = {
  visits_processed: number;
  languages_translated: number;
  summaries_generated: number;
  patients_helped: number;
};

const defaultMetrics: ImpactMetrics = {
  visits_processed: 0,
  languages_translated: 0,
  summaries_generated: 0,
  patients_helped: 0
};

export default function ImpactDashboard() {
  const [metrics, setMetrics] = useState<ImpactMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const apiBaseUrl = getApiBaseUrl();

    const loadMetrics = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/impact-metrics`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as ImpactMetrics;
        if (isMounted) setMetrics(data);
      } catch {
        // Keep dashboard rendered with defaults when backend is unavailable.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="mx-auto mt-8 max-w-6xl rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold md:text-3xl">BridgeVoice Impact Dashboard</h2>
          <p className="mt-2 text-sm text-slate-300">
            Demonstrating real healthcare communication impact.
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-400">
          {loading ? 'Loading metrics...' : 'Live metrics'}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Visits Processed" value={metrics.visits_processed} />
        <MetricCard label="Languages Translated" value={metrics.languages_translated} />
        <MetricCard label="Summaries Generated" value={metrics.summaries_generated} />
        <MetricCard label="Patients Helped" value={metrics.patients_helped} />
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-xs uppercase tracking-wide text-slate-300">{label}</p>
      <p className="mt-2 text-4xl font-semibold">{value.toLocaleString()}</p>
    </article>
  );
}
