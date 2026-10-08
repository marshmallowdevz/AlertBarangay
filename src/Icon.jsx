const iconPaths = {
  overview: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.4 6.4" /></>,
  reports: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
  dispatch: <><path d="M5 14a7 7 0 0 1 14 0" /><path d="M3 14h18v5H3zM12 3v3m-7 1 2 2m12-2-2 2" /></>,
  residents: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Zm13-9a3 3 0 1 0-1-5.8M18 14a5 5 0 0 1 3 5v1h-3" /></>,
  messages: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8 8 0 0 1-4-.9L4 20l1.2-3.4A7.1 7.1 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z" /></>,
  alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  dot: <circle cx="12" cy="12" r="4" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9L16 20.5h-3l-.3-1.8a8 8 0 0 1-1.7-.9l-1.6.7L8 16.1l1.4-1.1a7 7 0 0 1 0-1.9L8 12l1.4-2.4 1.6.7a8 8 0 0 1 1.7-.9L13 7.5h3l.2 1.9a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z" transform="translate(-1 -2)" /></>,
  logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  phone: <path d="M5 3h4l2 5-2.5 1.5a14 14 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
  plus: <path d="M12 5v14m-7-7h14" />,
  flame: <path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-2 2-4 5-4 9a7 7 0 0 0 7 7Z" />,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  response: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="M12 8v8m-4-4h8" /></>,
  fire: <path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-2 2-4 5-4 9a7 7 0 0 0 7 7Z" />,
};

export default function Icon({ name, size = 18, className }) {
  if (name === 'plus') {
    return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14m-7-7h14" /></svg>;
  }
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
