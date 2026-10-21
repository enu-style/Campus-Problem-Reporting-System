// ============================================================
// SVG ICON SET — consistent, professional inline icons.
// Each icon inherits `currentColor` so it follows the theme,
// and scales with the font-size of its container.
// ============================================================

function Icon({ children, size = 20, className = "", viewBox = "0 0 24 24" }) {
  return (
    <svg
      className={`svg-icon ${className}`}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// ── NAVIGATION ──────────────────────────────────────────────
export const IconHome = (p) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Icon>
);

export const IconList = (p) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Icon>
);

export const IconPlus = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </Icon>
);

export const IconGrid = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Icon>
);

export const IconUsers = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M15.5 5.6a3.2 3.2 0 0 1 0 4.8M17 14.8c2.1.6 3.5 2.3 3.5 4.7" />
  </Icon>
);

export const IconChart = (p) => (
  <Icon {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8.5 16v-5M13 16V8M17.5 16v-8" />
  </Icon>
);

// ── ACCOUNT ─────────────────────────────────────────────────
export const IconUser = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.5 18.5c1.2-2.2 3.2-3.3 5.5-3.3s4.3 1.1 5.5 3.3" />
  </Icon>
);

export const IconLogout = (p) => (
  <Icon {...p}>
    <path d="M14 4h-8v16h8" />
    <path d="M10 12h11M17.5 8.5 21 12l-3.5 3.5" />
  </Icon>
);

// ── TOPBAR ──────────────────────────────────────────────────
export const IconBell = (p) => (
  <Icon {...p}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
);

export const IconClose = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const IconMenu = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const IconRefresh = (p) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 6.3" />
    <path d="M20 4v7h-7" />
  </Icon>
);

// ── STATUS / FEEDBACK ───────────────────────────────────────
export const IconCheck = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.7 2.7L16.5 9" />
  </Icon>
);

export const IconReopen = (p) => (
  <Icon {...p}>
    <path d="M4 11a8 8 0 1 1 2.3 6.3" />
    <path d="M4 4v7h7" />
  </Icon>
);

export const IconAlert = (p) => (
  <Icon {...p}>
    <path d="M12 3.5 22 20H2L12 3.5Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </Icon>
);

export const IconInbox = (p) => (
  <Icon {...p}>
    <path d="M3.5 13.5 7 5h10l3.5 8.5V19h-17v-5.5Z" />
    <path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" />
  </Icon>
);

export const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.5l3.5 2" />
  </Icon>
);

export const IconInfo = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8v.1" />
  </Icon>
);

// ── ACTIONS ─────────────────────────────────────────────────
export const IconEdit = (p) => (
  <Icon {...p}>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
    <path d="m14 6 4 4" />
  </Icon>
);

export const IconSave = (p) => (
  <Icon {...p}>
    <path d="M5 3h11l5 5v13H5V3Z" />
    <path d="M8 3v5h7V3M8 21v-6h8v6" />
  </Icon>
);

export const IconEye = (p) => (
  <Icon {...p}>
    <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);

export const IconComment = (p) => (
  <Icon {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H4l1.8-3.6A8 8 0 1 1 21 12Z" />
  </Icon>
);

export const IconAttachment = (p) => (
  <Icon {...p}>
    <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6" />
  </Icon>
);

// ── MAP / LOCATION ──────────────────────────────────────────
export const IconPin = (p) => (
  <Icon {...p}>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </Icon>
);
