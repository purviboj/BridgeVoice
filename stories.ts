export type PatientStory = {
  id: string;
  title: string;
  anecdote: string;
  barrier: string;
  bridgevoiceHelp: string;
};

export const patientStories: PatientStory[] = [
  {
    id: 'macqueen',
    title: 'Richard MacQueen – Misinterpreted Test Result',
    anecdote:
      'Richard, a deaf patient, misread his HIV test results due to no interpreter being provided. For two days he believed he was positive, causing severe emotional distress.',
    barrier: 'No interpreter support led to a severe misunderstanding of critical test results.',
    bridgevoiceHelp:
      'Live captions and verified translations prevent this type of dangerous misinterpretation.'
  },
  {
    id: 'jebian',
    title: 'John Paul Jebian – Emergency Room Panic',
    anecdote:
      'John Paul, deaf, experienced chest pain but could not understand doctors because interpreters were delayed. He spent hours struggling to communicate in a potentially life-threatening situation.',
    barrier: 'Emergency communication delays blocked immediate understanding during a high-risk event.',
    bridgevoiceHelp:
      'Real-time speech-to-text and translations enable immediate understanding.'
  },
  {
    id: 'duncan',
    title: 'Elaine Duncan – Surgery Confusion',
    anecdote:
      'Elaine, deaf, spent 12 hospital days without an interpreter after surgery, leaving her confused and anxious about her care instructions.',
    barrier: 'Critical post-surgery instructions were not consistently delivered in an accessible way.',
    bridgevoiceHelp:
      'Instant captions and translations keep patients informed throughout their stay.'
  }
];
