'use client';

import { useMemo, useState } from 'react';
import StoryCard from './StoryCard';
import { patientStories } from './stories';

export default function StoriesCarousel() {
  const [index, setIndex] = useState(0);

  const story = useMemo(() => patientStories[index], [index]);

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? patientStories.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % patientStories.length);
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-sm ring-1 ring-cyan-100 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-blue-900 md:text-3xl">Patient Stories</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            aria-label="Previous story"
            className="rounded-full border border-blue-200 bg-white px-3 py-2 text-blue-900 hover:bg-blue-100"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            aria-label="Next story"
            className="rounded-full border border-blue-200 bg-white px-3 py-2 text-blue-900 hover:bg-blue-100"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-6">
        <StoryCard story={story} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        {patientStories.map((item, idx) => (
          <span
            key={item.id}
            className={`h-2 rounded-full transition-all ${idx === index ? 'w-8 bg-blue-800' : 'w-2 bg-blue-200'}`}
          />
        ))}
      </div>
    </section>
  );
}
