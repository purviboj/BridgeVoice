import Link from 'next/link';
import StoriesCarousel from '../components/about/StoriesCarousel';

export default function AboutBridgeVoicePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="animate-fade-in-page mx-auto max-w-6xl space-y-8">
        <article className="rounded-3xl bg-gradient-to-r from-[#1E3A8A] to-[#14B8A6] p-8 text-white shadow-sm md:p-12">
          <h1 className="text-3xl font-bold md:text-5xl">About BridgeVoice</h1>
          <p className="mt-4 max-w-4xl text-lg text-cyan-50 md:text-xl">
            BridgeVoice removes language and hearing barriers in healthcare by providing real-time captions,
            translations, and simplified medical summaries for patients.
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-block rounded-lg bg-white px-5 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
          >
            Create Account
          </Link>
        </article>

        <StoriesCarousel />
      </section>
    </main>
  );
}
