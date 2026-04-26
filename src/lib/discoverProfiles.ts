const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const createAbstractPortrait = ({
  name,
  label,
  accent,
  secondary,
}: {
  name: string;
  label: string;
  accent: string;
  secondary: string;
}) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${accent}" />
          <stop offset="1" stop-color="${secondary}" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="rgba(255,255,255,0.7)" />
          <stop offset="1" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect width="800" height="1200" fill="url(#bg)" rx="48" />
      <circle cx="140" cy="220" r="180" fill="rgba(255,255,255,0.15)" />
      <circle cx="660" cy="180" r="120" fill="rgba(255,255,255,0.18)" />
      <circle cx="660" cy="980" r="220" fill="rgba(15,23,42,0.18)" />
      <path d="M120 890C230 700 380 650 520 700C630 740 700 860 730 1020L740 1200H40L55 1070C65 998 87 944 120 890Z" fill="rgba(15,23,42,0.2)" />
      <circle cx="400" cy="420" r="190" fill="rgba(255,255,255,0.18)" />
      <circle cx="400" cy="360" r="122" fill="rgba(15,23,42,0.18)" />
      <path d="M248 720C290 612 358 560 442 560C520 560 594 608 636 720C670 810 685 912 680 1020H120C116 912 155 804 248 720Z" fill="rgba(255,255,255,0.16)" />
      <rect x="50" y="58" width="700" height="1084" rx="42" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="4" />
      <rect x="76" y="84" width="300" height="64" rx="32" fill="rgba(15,23,42,0.28)" />
      <text x="112" y="126" fill="white" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700">${label}</text>
      <text x="78" y="1030" fill="white" font-family="Inter, Arial, sans-serif" font-size="144" font-weight="900" opacity="0.92">${initials}</text>
      <text x="78" y="1098" fill="white" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="600" opacity="0.86">${name}</text>
      <rect x="0" y="0" width="800" height="1200" fill="url(#shine)" opacity="0.25" />
    </svg>
  `);
};

export interface DiscoverProfile {
  id: string;
  name: string;
  age: number;
  job: string;
  distance: string;
  bio: string;
  badges: string[];
  compatibility: number;
  prompt: string;
  photos: string[];
}

export const discoverProfiles: DiscoverProfile[] = [
  {
    id: 'maya-1',
    name: 'Maya',
    age: 24,
    job: 'Ceramics + brand design',
    distance: '2 miles away',
    bio: 'Weekend flea markets, great espresso, and sending voice notes instead of dry texts.',
    badges: ['Design eye', 'Coffee walks', 'Sunday gallery'],
    compatibility: 96,
    prompt: 'Ideal first date: bookstore, wine bar, then a walk long enough to miss the last train.',
    photos: [
      createAbstractPortrait({ name: 'Maya', label: 'Studio morning', accent: '#ff5f6d', secondary: '#ffc371' }),
      createAbstractPortrait({ name: 'Maya', label: 'Gallery night', accent: '#7c3aed', secondary: '#fb7185' }),
      createAbstractPortrait({ name: 'Maya', label: 'Sunday market', accent: '#0f766e', secondary: '#67e8f9' }),
    ],
  },
  {
    id: 'leo-2',
    name: 'Leo',
    age: 27,
    job: 'Film editor',
    distance: '5 miles away',
    bio: 'Can turn a bad week around with dumplings, a good playlist, and a brutal movie ranking.',
    badges: ['Late shows', 'Cooking', 'Travel brain'],
    compatibility: 91,
    prompt: 'Two truths: I overpack for trips and I will absolutely steal fries.',
    photos: [
      createAbstractPortrait({ name: 'Leo', label: 'Neon rooftop', accent: '#111827', secondary: '#38bdf8' }),
      createAbstractPortrait({ name: 'Leo', label: 'Editing bay', accent: '#f97316', secondary: '#facc15' }),
      createAbstractPortrait({ name: 'Leo', label: 'After-hours ramen', accent: '#1d4ed8', secondary: '#a78bfa' }),
    ],
  },
  {
    id: 'nina-3',
    name: 'Nina',
    age: 25,
    job: 'Pastry chef',
    distance: '1 mile away',
    bio: 'I make laminated dough for a living, so yes, I notice details. Especially in conversation.',
    badges: ['Soft launch', 'Tennis', 'Natural wine'],
    compatibility: 94,
    prompt: 'If you can plan a spontaneous night well, I am listening.',
    photos: [
      createAbstractPortrait({ name: 'Nina', label: 'Bakery open', accent: '#ec4899', secondary: '#f9a8d4' }),
      createAbstractPortrait({ name: 'Nina', label: 'Clay court', accent: '#fb7185', secondary: '#f97316' }),
      createAbstractPortrait({ name: 'Nina', label: 'Late dinner', accent: '#4338ca', secondary: '#22d3ee' }),
    ],
  },
  {
    id: 'sam-4',
    name: 'Sam',
    age: 26,
    job: 'Industrial designer',
    distance: '7 miles away',
    bio: 'I love objects with a point of view. Same rule for people.',
    badges: ['Museum passes', 'Run club', 'Debate night'],
    compatibility: 89,
    prompt: 'Green flag: you get excited about your niche thing and explain it well.',
    photos: [
      createAbstractPortrait({ name: 'Sam', label: 'Sunset rail', accent: '#f43f5e', secondary: '#fda4af' }),
      createAbstractPortrait({ name: 'Sam', label: 'Prototype lab', accent: '#0f172a', secondary: '#f97316' }),
      createAbstractPortrait({ name: 'Sam', label: 'City lookout', accent: '#4f46e5', secondary: '#f59e0b' }),
    ],
  },
];