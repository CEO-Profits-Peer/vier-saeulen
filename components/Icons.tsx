export const Check = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>
);

export const Chevron = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const Plus = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Play = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5.5c0-.8.9-1.3 1.6-.9l9 6.5c.6.4.6 1.4 0 1.8l-9 6.5c-.7.4-1.6 0-1.6-.9z" />
  </svg>
);

export const Pause = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6.5" y="5" width="4" height="14" rx="1.6" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.6" />
  </svg>
);

export const Forward = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M5 6.5c0-.8.9-1.3 1.6-.9l7 5.5c.6.4.6 1.4 0 1.8l-7 5.5c-.7.4-1.6 0-1.6-.9z" />
    <rect x="16" y="5" width="3" height="14" rx="1.4" />
  </svg>
);

export const Stop = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2.6" />
  </svg>
);

export const TabToday = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3.2 3.6 9.4V20a1 1 0 0 0 1 1h14.8a1 1 0 0 0 1-1V9.4z" />
    <path d="M9.4 21v-6.2h5.2V21" />
  </svg>
);

export const TabFlow = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4.2l2.8 1.8M9 2.6h6" />
  </svg>
);

export const TabSystem = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h9M4 12h16M4 17h6" />
    <circle cx="17" cy="7" r="2.3" />
    <circle cx="12" cy="17" r="2.3" />
  </svg>
);

export const TabGoals = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 3.8V2M12 22v-1.8M3.8 12H2M22 12h-1.8" />
  </svg>
);

export const TabStats = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4.5 19.5V10M10 19.5V5M15.5 19.5v-6M21 19.5H3" />
  </svg>
);

/** Heute auslassen — Pfeil, der an einer Wand vorbeizieht */
export const SkipDay = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 6l7 6-7 6z" />
    <path d="M17 5v14" />
  </svg>
);

/** Auslassen zurücknehmen */
export const Undo = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 9h11a5 5 0 010 10h-6" />
    <path d="M8 5L4 9l4 4" />
  </svg>
);

export const TabProgress = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 17.5l5.5-6 4 3.5L21 6.5" />
    <path d="M21 11V6.5h-4.5" />
  </svg>
);

export const TabFriends = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="8.5" r="3.4" />
    <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
    <path d="M16.5 6.4a3.2 3.2 0 010 6.2M18 14.8c2.1.6 3.5 2.3 3.5 4.7" />
  </svg>
);

export const TabYou = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="8.2" r="3.8" />
    <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
  </svg>
);
