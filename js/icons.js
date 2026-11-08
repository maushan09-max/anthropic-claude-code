'use strict';
/* LifeOS icon set — custom line icons drawn on a 24×24 grid (stroke = currentColor). Loaded first. */

const ICON_PATHS = {
  // brand & chrome
  logo: '<circle cx="12" cy="12" r="8.5"/><circle class="f" cx="12" cy="12" r="3.2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.8"/>',
  edit: '<path d="M15.5 4.5l4 4L9 19l-5 1 1-5L15.5 4.5Z"/><path d="M13.5 6.5l4 4"/>',
  star: '<path d="m12 3.2 2.7 5.5 6 .9-4.4 4.2 1.1 6L12 17l-5.4 2.8 1.1-6-4.4-4.2 6-.9L12 3.2Z"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  arrowL: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  arrowDownLeft: '<path d="M17 7 7 17M7 9v8h8"/>',
  arrowUpRight: '<path d="M7 17 17 7M9 7h8v8"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/>',
  calPlus: '<path d="M20 11V7.5A2.5 2.5 0 0 0 17.5 5h-11A2.5 2.5 0 0 0 4 7.5v11A2.5 2.5 0 0 0 6.5 21H12M4 10h16M8.5 3v4M15.5 3v4M18 15v6M15 18h6"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  // planner
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  calWeek: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M7 14h10M7 17.5h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle class="f" cx="8" cy="14" r="1"/><circle class="f" cx="12" cy="14" r="1"/><circle class="f" cx="16" cy="14" r="1"/><circle class="f" cx="8" cy="17.5" r="1"/><circle class="f" cx="12" cy="17.5" r="1"/>',
  badge: '<rect x="4.5" y="3" width="15" height="18" rx="3"/><path d="M9.5 3v2h5V3"/><circle cx="12" cy="10.5" r="2.5"/><path d="M8 17c.8-1.7 2.2-2.6 4-2.6s3.2.9 4 2.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  repeat: '<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5"/>',
  note: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5Z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h5"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  pushpin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z"/><path d="M12 14v7"/>',
  box: '<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8Z"/><path d="m3.5 8 8.5 4.5L20.5 8M12 12.5v8"/>',
  inbox: '<path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19v-5.5Z"/><path d="M3.5 13.5h5l1 2h5l1-2h5"/>',
  sparkle: '<path d="M11 3.5c.6 4 2.6 6 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.5 5.9-2.5 6.5-6.5Z"/><path d="M18.5 15c.2 1.5 1 2.3 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.2 2.3-1 2.5-2.5Z"/>',
  cloud: '<path d="M7.5 19h9.5a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 12.2 3.4 3.4 0 0 0 7.5 19Z"/>',
  chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5v-9Z"/>',
  // home & health
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M9 21h6M9.5 7.5c0-1.5 1-2 1-3.5M13.5 7.5c0-1.5 1-2 1-3.5"/>',
  cart: '<path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6.1"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  bag: '<path d="M5 8h14l-1 12.5H6L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  leaf: '<path d="M5 19C5 10 10 4.5 20 4.5 20 14 14 19 5 19ZM5 19l8-8"/>',
  receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21V3Z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.8 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.2 0 5.3 3 4.2 6.2C19.5 15.4 12 20 12 20Z"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><rect x="9" y="2.5" width="6" height="4" rx="1.2"/><path d="M8.5 11.5h7M8.5 15h7M8.5 18.5h4"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/>',
  tape: '<circle cx="10" cy="12" r="6.5"/><circle cx="10" cy="12" r="2"/><path d="M10 18.5h10.5v-3"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9.5a5.6 5.6 0 0 1 8 0l-2.7 2.7a1.8 1.8 0 0 0-2.6 0L8 9.5Z"/>',
  chart: '<path d="M4 20h16M7 16v-5M12 16V7M17 16v-3"/>',
  flower: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6C10 7 10.4 3.5 12 3.5s2 3.5 0 6.1M14.4 12c2.6-2 6.1-1.6 6.1 0s-3.5 2-6.1 0M12 14.4c2 2.6 1.6 6.1 0 6.1s-2-3.5 0-6.1M9.6 12c-2.6 2-6.1 1.6-6.1 0s3.5-2 6.1 0"/>',
  bowel: '<rect x="3" y="15" width="18" height="5.5" rx="2.75"/><rect x="5.5" y="10" width="13" height="5" rx="2.5"/><rect x="8" y="5.5" width="8" height="4.5" rx="2.25"/><path d="M12 5.5c0-1.4.8-2.3 2.2-2.8"/>',
  pill: '<rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-45 12 12)"/><path d="m8.8 8.8 6.4 6.4"/>',
  drop: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  activity: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  mood1: '<circle cx="12" cy="12" r="9"/><circle class="f" cx="9" cy="10" r="1"/><circle class="f" cx="15" cy="10" r="1"/><path d="M8.5 16.5c1.8-2 5.2-2 7 0"/>',
  mood2: '<circle cx="12" cy="12" r="9"/><circle class="f" cx="9" cy="10" r="1"/><circle class="f" cx="15" cy="10" r="1"/><path d="M9 16c1.6-.9 4.4-.9 6 0"/>',
  mood3: '<circle cx="12" cy="12" r="9"/><circle class="f" cx="9" cy="10" r="1"/><circle class="f" cx="15" cy="10" r="1"/><path d="M9 15.2h6"/>',
  mood4: '<circle cx="12" cy="12" r="9"/><circle class="f" cx="9" cy="10" r="1"/><circle class="f" cx="15" cy="10" r="1"/><path d="M8.8 14.3c1.6 1.6 4.8 1.6 6.4 0"/>',
  mood5: '<circle cx="12" cy="12" r="9"/><path d="M7.8 10c.5-1 1.7-1 2.2 0M14 10c.5-1 1.7-1 2.2 0"/><path d="M8 13.5h8a4 4 0 0 1-8 0Z"/>',
  sunrise: '<path d="M3 19h18M6 19a6 6 0 0 1 12 0M12 4v5M9.5 6.5 12 4l2.5 2.5M4.6 11.6l1.4 1.4M19.4 11.6 18 13"/>',
  grad: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z"/><path d="M6.5 11v5c1.5 1.6 3.3 2.4 5.5 2.4s4-.8 5.5-2.4v-5M21.5 9v5"/>',
  layers: '<path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z"/><path d="m3 12.5 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
  // money & travel
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><circle class="f" cx="16.5" cy="14" r="1.2"/>',
  bank: '<path d="M3 9.5 12 4l9 5.5M4.5 10h15M6 10v8M10 10v8M14 10v8M18 10v8M3.5 20.5h17"/>',
  swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><circle class="f" cx="6.5" cy="12" r=".9"/><circle class="f" cx="17.5" cy="12" r=".9"/>',
  trend: '<path d="M3.5 17 9 11.5l4 4L20.5 8"/><path d="M15 8h5.5v5.5"/>',
  plane: '<path d="M12 2.5c.8 0 1.5.9 1.5 2v4.8l7.5 4.6v2.4l-7.5-2.4v4.4l2.5 1.9v1.8l-4-1-4 1v-1.8l2.5-1.9v-4.4L3 16.3v-2.4l7.5-4.6V4.5c0-1.1.7-2 1.5-2Z"/>',
  bed: '<path d="M3 18.5V6M3 13.5h18v5M21 13.5V12a3.5 3.5 0 0 0-3.5-3.5H11v5"/><circle cx="7" cy="11" r="1.8"/>',
  car: '<path d="M4 16.5V13l2-5.5h12l2 5.5v3.5H4ZM4 13h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z"/><path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2"/>',
  utensils: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1-3.5 3.5-3.5 7v3H17"/>',
  luggage: '<rect x="5" y="7" width="14" height="13" rx="2.5"/><path d="M9 7V4.5h6V7M9.5 11v5M14.5 11v5M8 20v1.5M16 20v1.5"/>',
  // personal
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7.5h6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle class="f" cx="12" cy="12" r="1.4"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9.5 17h5v3.5h-5z"/>',
  flame: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4-3-6-4-10-2 1.5-3 3.5-3 5.5-1-.5-2-2-2-3.5-2 2-4 4.5-4 8A6.5 6.5 0 0 0 12 21Z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  sprout: '<path d="M12 21v-9M12 12C12 8 9 6 4.5 6c0 4 3 6 7.5 6ZM12 14c0-3.5 2.5-6 7-6 0 4-3 6-7 6Z"/>',
};

/** Inline SVG icon. cls: extra classes, e.g. "fill" for a solid star. */
function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name] || ICON_PATHS.sparkle}</svg>`;
}
/** Icon in a soft tinted tile, used in card headings. */
const hi = (name) => `<span class="hicon">${icon(name)}</span>`;
/** Priority star: filled when on. */
const starIcon = (on) => icon('star', on ? 'fill' : '');
const MOOD_LABELS = ['Awful', 'Low', 'Okay', 'Good', 'Great'];
