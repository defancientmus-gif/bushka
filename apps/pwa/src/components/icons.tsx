import type { ReactNode, SVGProps } from 'react';
import type { Category } from '../types';
import { categoryGlyph } from '../lib/labels';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const BoxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8l9-4 9 4v8l-9 4-9-4V8z" />
    <path d="M3 8l9 4 9-4" />
    <path d="M12 12v8" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5C3 8.7 3.7 8 4.5 8H7l1.3-2h7.4L17 8h2.5c.8 0 1.5.7 1.5 1.5V18c0 .8-.7 1.5-1.5 1.5h-15C3.7 19.5 3 18.8 3 18V9.5z" />
    <circle cx="12" cy="13" r="3.2" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-3.6-3.6" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.4" />
    <path d="M5 15V5.5C5 4.7 5.7 4 6.5 4H15" />
  </Svg>
);

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 15l6-6" />
    <path d="M10.5 7.5l1.7-1.7a3.5 3.5 0 0 1 5 5L15.5 12.5" />
    <path d="M13.5 16.5l-1.7 1.7a3.5 3.5 0 0 1-5-5L8.5 11.5" />
  </Svg>
);

export const ClipboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="5" width="12" height="16" rx="2.2" />
    <path d="M9 5V4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v1" />
    <path d="M9 12h6M9 16h4" />
  </Svg>
);

export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
  </Svg>
);

export const SendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 3.5L3 11l6.2 2.4L12 20l2.6-4.2L20 18 21 3.5z" />
    <path d="M9.2 13.4L20 4" />
  </Svg>
);

export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4h3l1.4 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.4V21c0 .6-.4 1-1 1A16 16 0 0 1 5 5c0-.6.4-1 1-1z" />
  </Svg>
);

export const WifiOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4l18 18" />
    <path d="M8.5 13.2a6 6 0 0 1 7 0" />
    <path d="M5 9.6a11 11 0 0 1 3.4-2" />
    <path d="M19 9.6a11 11 0 0 0-4.6-2.6" />
    <path d="M12 17.5h.01" />
  </Svg>
);

function Glyph({ name, size = 24 }: { name: string; size?: number }) {
  switch (name) {
    case 'phone':
      return (
        <Svg size={size}>
          <rect x="7" y="3" width="10" height="18" rx="2.6" />
          <path d="M10.5 18h3" />
        </Svg>
      );
    case 'laptop':
      return (
        <Svg size={size}>
          <rect x="4" y="6" width="16" height="10" rx="1.6" />
          <path d="M2.5 19h19" />
        </Svg>
      );
    case 'console':
      return (
        <Svg size={size}>
          <rect x="3" y="8" width="18" height="9" rx="4.5" />
          <path d="M7.5 11.5v3M6 13h3" />
          <circle cx="16" cy="12.2" r="1" />
          <circle cx="18" cy="14.2" r="1" />
        </Svg>
      );
    case 'audio':
      return (
        <Svg size={size}>
          <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
          <rect x="3.5" y="13" width="3.6" height="6" rx="1.6" />
          <rect x="16.9" y="13" width="3.6" height="6" rx="1.6" />
        </Svg>
      );
    case 'chip':
      return (
        <Svg size={size}>
          <rect x="7" y="7" width="10" height="10" rx="1.6" />
          <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" />
        </Svg>
      );
    case 'camera':
      return <CameraIcon size={size} />;
    default:
      return <BoxIcon size={size} />;
  }
}

export function CategoryGlyph({ category, size = 24 }: { category: Category; size?: number }) {
  return <Glyph name={categoryGlyph[category]} size={size} />;
}
