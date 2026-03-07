import { PatientStory } from './stories';

export default function StoryCard({ story }: { story: PatientStory }) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-teal-100 text-xl">
          👤
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{story.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{story.anecdote}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        ⚠ {story.barrier}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">How BridgeVoice helps:</span> {story.bridgevoiceHelp}
      </p>
    </article>
  );
}
