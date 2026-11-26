/* PART 1 (Menula De Pinto) · Icons: small drawings (arrow, tick, close, menu) used on buttons. */
const iconPaths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 8h16M4 16h16',
  up: 'M12 19V5M6 11l6-6 6 6',
};

export default function Icon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}

/* The four-point Void star, used as a decoration in the Why Void and waitlist sections and the sign-up thank-you. */
export function Star({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 0C12.9 8.2 15.8 11.1 24 12 15.8 12.9 12.9 15.8 12 24 11.1 15.8 8.2 12.9 0 12 8.2 11.1 11.1 8.2 12 0Z" />
    </svg>
  );
}
