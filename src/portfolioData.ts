export const PORTFOLIO_ASSETS = {
  plate: '/assets/studio-plate.png',
  casePlate: '/assets/case-plate.webp',
  cut: '/assets/aistudio/Professional_Man_with_Phone_and_Laptop_e5dc5167.png',
  badge: '/assets/lanyard-badge.webp',
  trans: '/assets/hero-dive-custom.mp4',
  logoF: '/assets/aistudio/1000827206_8K_594af516.png',
} as const;

export interface PortfolioCase {
  video: string;
  title: string;
  rows: [string, string, string];
  key: string;
  text: string;
  stack: string[];
  highlights: [string, string, string];
  repoLabel: string;
  repoUrl: string;
  accent: string;
}

export const PORTFOLIO_CASES: PortfolioCase[] = [
  {
    video: '',
    title: 'VITALSYNC',
    rows: ['HEALTH APP', 'AI', '2026'],
    key: '// vitalsync',
    text: '— a modern health companion that tracks and analyzes your vitals using AI.',
    stack: ['Flutter', 'Python', 'AI Diagnostics'],
    highlights: ['Live Vitals Telemetry', 'AI Anomaly Insights', 'Cross-Platform Flutter UI'],
    repoLabel: 'github.com/fayizulrahuman/VitalSync',
    repoUrl: 'https://github.com/fayizulrahuman/VitalSync',
    accent: '#00f3ff',
  },
  {
    video: '',
    title: 'KTU ASSIST',
    rows: ['EDUCATION', 'AI ASSISTANT', '2026'],
    key: '// ktu assist',
    text: '— a smart academic assistant built for KTU CSE notes, syllabus Q&A, and exam prep.',
    stack: ['Next.js', 'Python', 'Academic AI'],
    highlights: ['KTU Syllabus Search', 'Smart Note Summaries', 'Adaptive Revision Planner'],
    repoLabel: 'github.com/fayizulrahuman/ktu-assist',
    repoUrl: 'https://github.com/fayizulrahuman/ktu-assist',
    accent: '#34d399',
  },
  {
    video: '',
    title: 'FINTRACK',
    rows: ['FINTECH', 'WEB APP', '2026'],
    key: '// fintrack',
    text: '— a personal finance tracker to monitor spending and achieve financial goals.',
    stack: ['React', 'Node.js', 'SQL'],
    highlights: ['Budget Analytics', 'Goal Progress Engine', 'PostgreSQL Ledger'],
    repoLabel: 'github.com/fayizulrahuman/fintrack',
    repoUrl: 'https://github.com/fayizulrahuman/fintrack',
    accent: '#00f3ff',
  },
  {
    video: '',
    title: 'HIDDEN GEMS',
    rows: ['TRAVEL', 'COMMUNITY', '2026'],
    key: '// hidden gems',
    text: '— a crowdsourced explorer where travelers pin and share secret local spots.',
    stack: ['React', 'Node.js', 'SQL'],
    highlights: ['Interactive Spot Pins', 'Community Discovery', 'REST Geo Queries'],
    repoLabel: 'github.com/fayizulrahuman/hidden-gems',
    repoUrl: 'https://github.com/fayizulrahuman/hidden-gems',
    accent: '#38bdf8',
  },
  {
    video: '',
    title: 'CINEMOOD',
    rows: ['ENTERTAINMENT', 'AI', '2026'],
    key: '// cinemood',
    text: '— a movie recommendation engine that curates films based on your current mood.',
    stack: ['Next.js', 'Python', 'Recommendation AI'],
    highlights: ['Mood Vector Matching', 'Instant Watchlist Sync', 'SSR Film Discovery'],
    repoLabel: 'github.com/fayizulrahuman/cinemood',
    repoUrl: 'https://github.com/fayizulrahuman/cinemood',
    accent: '#22d3ee',
  },
  {
    video: '',
    title: 'FALL GUARD',
    rows: ['SAFETY', 'IOT', '2026'],
    key: '// fall guard',
    text: '— a smart fall detection system designed for rapid emergency response.',
    stack: ['Python', 'Flutter', 'Edge Sensors'],
    highlights: ['Real-Time Motion AI', 'Instant SOS Dispatch', 'Low-Latency Edge Stream'],
    repoLabel: 'github.com/fayizulrahuman/fallguard',
    repoUrl: 'https://github.com/fayizulrahuman/fallguard',
    accent: '#38bdf8',
  },
  {
    video: '',
    title: 'DREAM CONTINUATOR',
    rows: ['AI', 'CREATIVE', '2026'],
    key: '// dream continuator',
    text: '— an AI-driven creative tool that visualizes and continues your dreams.',
    stack: ['Next.js', 'Python', 'Generative AI'],
    highlights: ['Narrative Continuation', 'Visual Scene Prompts', 'Interactive Story Canvas'],
    repoLabel: 'github.com/fayizulrahuman/dreamcontinuator',
    repoUrl: 'https://github.com/fayizulrahuman/dreamcontinuator',
    accent: '#22d3ee',
  },
];

export type SkillCategory = 'all' | 'frontend' | 'backend';

export interface SkillItem {
  id: string;
  name: string;
  category: Exclude<SkillCategory, 'all'>;
  categoryLabel: string;
  icon: string;
  summary: string;
  focus: string;
}

export const PORTFOLIO_SKILLS: SkillItem[] = [
  {
    id: 'flutter',
    name: 'Flutter',
    category: 'frontend',
    categoryLabel: 'Mobile UI',
    icon: '/assets/aistudio/skill-flutter_710d2cd0.png',
    summary: 'Cross-platform native iOS and Android apps with expressive custom motion.',
    focus: 'Mobile Architecture · Animations',
  },
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    categoryLabel: 'Web Interfaces',
    icon: '/assets/aistudio/skill-react_78bff8f1.png',
    summary: 'Modular, accessible web applications engineered for responsive speed.',
    focus: 'Component Systems · State Design',
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'frontend',
    categoryLabel: 'Full-Stack Web',
    icon: '/assets/aistudio/skill-next_618a2239.png',
    summary: 'Hybrid SSR/edge web platforms with clean routing and SEO precision.',
    focus: 'App Router · Server Actions',
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    category: 'backend',
    categoryLabel: 'Runtime & APIs',
    icon: '/assets/aistudio/skill-node_307b35e3.png',
    summary: 'Event-driven REST services, real-time sockets, and resilient backend pipelines.',
    focus: 'API Design · Async Concurrency',
  },
  {
    id: 'python',
    name: 'Python',
    category: 'backend',
    categoryLabel: 'AI & Automation',
    icon: '/assets/aistudio/skill-python_317b20b7.png',
    summary: 'Applied AI pipelines, inference orchestration, and intelligent automation.',
    focus: 'LLM Workflows · FastAPI & Data',
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'backend',
    categoryLabel: 'Relational Data',
    icon: '/assets/aistudio/skill-sql_81a2a62a.png',
    summary: 'Normalized schemas, indexed analytical queries, and ACID-safe storage.',
    focus: 'PostgreSQL · Query Optimization',
  },
];

export function filterSkills(skills: SkillItem[], category: SkillCategory): SkillItem[] {
  if (category === 'all') return skills;
  return skills.filter((s) => s.category === category);
}
