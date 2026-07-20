// 24-week (~6 month) lean-mass program: 4-day Upper/Lower split, run Mon/Tue/Thu/Fri
// so Wed/Sat/Sun are recovery. Exercise selection stays constant; volume and intensity
// are periodized in 4-week blocks, each ending in a deload week.
// General guidance, not personalized medical/fitness advice — adjust around pain,
// injuries, or how your body actually responds.

export const PROGRAM_NOTES = {
  goal: 'Lean muscle gain with modest weight increase',
  nutrition: [
    'Modest caloric surplus: roughly +250 to +500 kcal/day above maintenance.',
    'Protein: about 0.8-1g per pound of bodyweight per day, spread across meals.',
    'Prioritize sleep (7-9h) and consistency — progress comes from the weeks you don’t skip, not any single session.',
  ],
  progression: 'Double progression: work within the listed rep range. Once you complete every set at the TOP of the range with good form, add 5 lb (upper body) or 10 lb (lower body) next session for that exercise and drop back to the BOTTOM of the range.',
  rest: 'Rest 90-120s between compound lift sets, 60-75s between accessory sets.',
  schedule: 'Mon: Upper A · Tue: Lower A · Wed: Rest · Thu: Upper B · Fri: Lower B · Sat/Sun: Rest (or light walking/cardio)',
};

// type: 'compound' | 'accessory' — determines which rep range applies from the phase config.
const SPLIT = {
  'Upper A': [
    { name: 'Barbell Bench Press', type: 'compound' },
    { name: 'Barbell or DB Bent-Over Row', type: 'compound' },
    { name: 'Seated Overhead Press', type: 'compound' },
    { name: 'Lat Pulldown or Pull-Up', type: 'compound' },
    { name: 'Incline DB Press', type: 'accessory' },
    { name: 'Face Pull', type: 'accessory' },
    { name: 'DB Biceps Curl', type: 'accessory' },
    { name: 'Triceps Rope Pushdown', type: 'accessory' },
  ],
  'Lower A': [
    { name: 'Back Squat', type: 'compound' },
    { name: 'Romanian Deadlift', type: 'compound' },
    { name: 'Leg Press', type: 'compound' },
    { name: 'Seated or Lying Leg Curl', type: 'accessory' },
    { name: 'Standing Calf Raise', type: 'accessory' },
    { name: 'Hanging Knee Raise', type: 'accessory' },
  ],
  'Upper B': [
    { name: 'Incline Barbell or DB Press', type: 'compound' },
    { name: 'Pull-Up or Lat Pulldown (wide grip)', type: 'compound' },
    { name: 'DB Shoulder Press', type: 'compound' },
    { name: 'Chest-Supported or Seated Cable Row', type: 'compound' },
    { name: 'Dip or Close-Grip Bench Press', type: 'accessory' },
    { name: 'Lateral Raise', type: 'accessory' },
    { name: 'Hammer Curl', type: 'accessory' },
    { name: 'Overhead Triceps Extension', type: 'accessory' },
  ],
  'Lower B': [
    { name: 'Conventional or Trap Bar Deadlift', type: 'compound' },
    { name: 'Front Squat or Hack Squat', type: 'compound' },
    { name: 'Walking Lunge', type: 'compound' },
    { name: 'Leg Extension', type: 'accessory' },
    { name: 'Seated Calf Raise', type: 'accessory' },
    { name: 'Weighted Plank', type: 'accessory' },
  ],
};

// 6 phases x 4 weeks = 24 weeks. Week 4 of each phase is always a deload.
export const PHASES = [
  {
    name: 'Foundation',
    weeks: [1, 4],
    compound: { sets: 3, reps: '10-12' },
    accessory: { sets: 3, reps: '12-15' },
    focus: 'Groove technique on the big lifts, establish honest starting weights.',
  },
  {
    name: 'Volume Accumulation',
    weeks: [5, 8],
    compound: { sets: 4, reps: '8-12' },
    accessory: { sets: 3, reps: '12-15' },
    focus: 'Add a working set to the main lifts.',
  },
  {
    name: 'Hypertrophy Push',
    weeks: [9, 12],
    compound: { sets: 4, reps: '8-10' },
    accessory: { sets: 4, reps: '12-20' },
    focus: 'Accessory volume peaks — this block does most of the muscle-building work.',
  },
  {
    name: 'Intensification',
    weeks: [13, 16],
    compound: { sets: 4, reps: '5-8' },
    accessory: { sets: 3, reps: '10-15' },
    focus: 'Heavier compounds, strength-driven hypertrophy.',
  },
  {
    name: 'Volume Peak',
    weeks: [17, 20],
    compound: { sets: 4, reps: '8-12' },
    accessory: { sets: 4, reps: '15-20' },
    focus: 'Highest total volume block of the program.',
  },
  {
    name: 'Consolidation & Retest',
    weeks: [21, 24],
    compound: { sets: 3, reps: '6-10' },
    accessory: { sets: 3, reps: '10-15' },
    focus: 'Test new working weights on the main lifts; plan the next cycle after week 24.',
  },
];

const DELOAD = {
  compound: { sets: 2, reps: '10-12' },
  accessory: { sets: 2, reps: '10-12' },
  note: 'Deload: ~60-70% of your recent working weight, stop 3-4 reps shy of failure on everything.',
};

export function getPhaseForWeek(weekNumber) {
  return PHASES.find((p) => weekNumber >= p.weeks[0] && weekNumber <= p.weeks[1]) || PHASES[PHASES.length - 1];
}

export function isDeloadWeek(weekNumber) {
  return weekNumber % 4 === 0;
}

// Returns the full prescribed session for a given week + split day ('Upper A' | 'Lower A' | 'Upper B' | 'Lower B').
export function getSession(weekNumber, dayKey) {
  const phase = getPhaseForWeek(weekNumber);
  const deload = isDeloadWeek(weekNumber);
  const config = deload ? DELOAD : phase;
  const exercises = SPLIT[dayKey].map((ex) => ({
    ...ex,
    ...(ex.type === 'compound' ? config.compound : config.accessory),
  }));
  return {
    weekNumber,
    phaseName: phase.name,
    focus: deload ? DELOAD.note : phase.focus,
    isDeload: deload,
    dayKey,
    exercises,
  };
}

const WEEKDAY_TO_SPLIT = { 1: 'Upper A', 2: 'Lower A', 4: 'Upper B', 5: 'Lower B' };

// weekday: 0=Sun..6=Sat. Returns null on rest days.
export function splitDayForWeekday(weekday) {
  return WEEKDAY_TO_SPLIT[weekday] || null;
}

export const TOTAL_WEEKS = 24;
