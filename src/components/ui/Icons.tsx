import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

function base(path: ReactNode, { size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p);
export const IconArrow = (p: IconProps) => base(<path d="M5 12h14m-5-5 5 5-5 5" />, p);
export const IconBack = (p: IconProps) => base(<path d="M19 12H5m5-5-5 5 5 5" />, p);
export const IconClose = (p: IconProps) => base(<path d="m6 6 12 12M18 6 6 18" />, p);
export const IconMenu = (p: IconProps) => base(<path d="M4 8h16M4 16h16" />, p);
export const IconLock = (p: IconProps) => base(<><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, p);
export const IconKey = (p: IconProps) => base(<><circle cx="8" cy="15" r="3.5" /><path d="m10.5 12.5 8-8m-3 3 2.5 2.5" /></>, p);
export const IconPlus = (p: IconProps) => base(<path d="M12 5v14M5 12h14" />, p);
export const IconTrash = (p: IconProps) => base(<path d="M4 7h16M10 11v6m4-6v6M6 7l1 12h10l1-12M9 7V4h6v3" />, p);
export const IconEye = (p: IconProps) => base(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>, p);
export const IconEyeOff = (p: IconProps) => base(<><path d="M3 3l18 18M10.2 6a9 9 0 0 1 1.8-.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.3M6.6 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-.9" /><path d="M9.9 10a2.8 2.8 0 0 0 4 4" /></>, p);
export const IconUpload = (p: IconProps) => base(<path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />, p);
export const IconDownload = (p: IconProps) => base(<path d="M12 4v12m-5-5 5 5 5-5M5 20h14" />, p);
export const IconFile = (p: IconProps) => base(<path d="M7 3h7l5 5v13H7zM14 3v5h5" />, p);
export const IconNote = (p: IconProps) => base(<path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3" />, p);
export const IconSummary = (p: IconProps) => base(<path d="M5 6h14M5 11h14M5 16h9" />, p);
export const IconAtlas = (p: IconProps) => base(<><circle cx="6" cy="7" r="1.8" /><circle cx="17" cy="5.5" r="1.8" /><circle cx="14" cy="17" r="1.8" /><circle cx="5.5" cy="18" r="1.4" /><path d="M7.6 7.4 15.4 6m-1 9.5 2.4-8.4M12.6 16 7 17.4m-.2-9.2.3 8.2" /></>, p);
export const IconClock = (p: IconProps) => base(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, p);
export const IconDrift = (p: IconProps) => base(<><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>, p);
export const IconAxiom = (p: IconProps) => base(<><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-18 12 12)" /></>, p);
export const IconLogout = (p: IconProps) => base(<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />, p);
export const IconEdit = (p: IconProps) => base(<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />, p);
export const IconCheck = (p: IconProps) => base(<path d="m5 12.5 4.5 4.5L19 7.5" />, p);
export const IconExternal = (p: IconProps) => base(<path d="M14 4h6v6m0-6-9 9M18 14v6H4V6h6" />, p);
export const IconCommand = (p: IconProps) => base(<path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9Zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15Zm0 0v6m0 0h2.5a2.5 2.5 0 1 1-2.5 2.5V15Zm0 0H9m0 0v2.5A2.5 2.5 0 1 1 6.5 15H9Z" />, p);
export const IconFeather = (p: IconProps) => base(<path d="M20 4c-6 0-12 4-13 13l-2 3m2-3h6c4-1 6-5 7-13M9 13h6" />, p);
export const IconBook = (p: IconProps) => base(<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5zM12 6v13.5" />, p);
export const IconFilm = (p: IconProps) => base(<><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 9h3m11 0h3m-17 6h3m11 0h3M7.5 5v14m9-14v14" /></>, p);
export const IconDisc = (p: IconProps) => base(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.2" /><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" /></>, p);
export const IconComet = (p: IconProps) => base(<><circle cx="16.5" cy="7.5" r="3" /><path d="M14.4 9.6 4 20m8.2-12.6L5 12m11.8 2.6L12 19" /></>, p);
export const IconStar = (p: IconProps) => base(<path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z" />, p);
export const IconSend = (p: IconProps) => base(<path d="M4 12 20 4l-6 16-3-7zM11 13l9-9" />, p);
export const IconShuffle = (p: IconProps) => base(<path d="M4 7h3c5 0 5 10 10 10h3m-3-13 3 3-3 3M4 17h3c1.5 0 2.5-.8 3.3-2m3.4-6c.8-1.2 1.8-2 3.3-2h3m-3 13 3-3-3-3" />, p);
export const IconSpark = (p: IconProps) => base(<path d="M12 3v5m0 8v5M3 12h5m8 0h5M6.5 6.5l3 3m5 5 3 3m0-11-3 3m-5 5-3 3" />, p);
