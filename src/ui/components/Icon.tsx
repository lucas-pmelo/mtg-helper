/**
 * Icon set — traço de 1.6, cantos redondos, 24x24, herda currentColor.
 * Substitui os emojis: renderiza igual em qualquer aparelho e acompanha a cor
 * do estado (ativo, mudo, perigo) sem hack de filtro.
 */

export type IconName =
  | 'dice'
  | 'sticker'
  | 'history'
  | 'users'
  | 'sliders'
  | 'card'
  | 'check'
  | 'close'
  | 'archive'
  | 'target'
  | 'plus'
  | 'chevron';

const PATHS: Record<IconName, React.ReactNode> = {
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.75" />
      <circle cx="8.6" cy="8.6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.4" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  sticker: (
    <>
      <path d="M20.5 12.5 12.5 20.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5h10A3.5 3.5 0 0 1 20.5 7v5.5Z" />
      <path d="M20.5 12.5H16a3.5 3.5 0 0 0-3.5 3.5v4.5" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.55-6.07" />
      <path d="M3.5 4.5V9H8" />
      <path d="M12 7.75V12l2.9 1.75" />
    </>
  ),
  users: (
    <>
      <circle cx="9.25" cy="8" r="3.6" />
      <path d="M2.75 20.25a6.5 6.5 0 0 1 13 0" />
      <path d="M16.25 4.9a3.6 3.6 0 0 1 0 6.2" />
      <path d="M17.9 14.4a6.5 6.5 0 0 1 3.85 5.85" />
    </>
  ),
  sliders: (
    <>
      <path d="M3.5 7.5h9.25" />
      <path d="M17.25 7.5h3.25" />
      <circle cx="15" cy="7.5" r="2.25" />
      <path d="M3.5 16.5h3.25" />
      <path d="M11.25 16.5h9.25" />
      <circle cx="9" cy="16.5" r="2.25" />
    </>
  ),
  card: (
    <>
      <rect x="4.75" y="2.75" width="14.5" height="18.5" rx="3.5" />
      <rect x="7.75" y="6" width="8.5" height="7" rx="1.75" />
      <path d="M7.75 16.25h8.5" />
      <path d="M7.75 18.9h5" />
    </>
  ),
  check: <path d="m5.5 12.5 4.25 4.25L18.5 8" />,
  close: (
    <>
      <path d="m6.5 6.5 11 11" />
      <path d="m17.5 6.5-11 11" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4" width="17" height="4.75" rx="1.75" />
      <path d="M5.5 8.75V17.5A2.75 2.75 0 0 0 8.25 20.25h7.5A2.75 2.75 0 0 0 18.5 17.5V8.75" />
      <path d="M10 13h4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </>
  ),
  chevron: <path d="M7 10l5 5 5-5" />,
};

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 22, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
