import React from 'react';

export type IconProps = {
  size?: number;
  className?: string;
};

export function Icon({
  children,
  size = 18,
  className,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {children}
      </g>
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m16 16 4.2 4.2" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const LayersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3-9 5 9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
  </Icon>
);

export const LocationIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);

export const ChevronIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m8 10 4 4 4-4" />
  </Icon>
);

export const RouteIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="6" r="2.2" />
    <path d="M8.2 18h2.3a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 1 15.5 6h.3" />
  </Icon>
);

export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </Icon>
);

export const SwapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 6h11l-3-3M16 18H5l3 3M19 6l-3 3M5 18l3-3" />
  </Icon>
);

export const NavigationIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 11 16-7-7 16-2.2-6.8L4 11Z" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const LeafLogo = () => (
  <div className="logo-mark" aria-hidden="true">
    <svg fill="none" viewBox="0 0 36 36">
      <path
        d="M29.4 5.8C19.3 6 9.7 8.4 6.8 16.3c-2 5.6 1.8 11.1 7.5 11.5C24.8 28.6 29.2 16.6 29.4 5.8Z"
        fill="currentColor"
      />
      <path
        d="M7.5 27c4.1-6.5 8.6-10.5 15.2-14.1M10.8 21.7h5.7l2.2-4.5 2.4 5.7h5"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  </div>
);

export function HazardIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hazard-icon"
      fill="none"
      viewBox="0 0 52 52"
    >
      <circle cx="26" cy="26" r="25" fill="rgba(255,255,255,.12)" />
      <path
        d="M15.5 24.5v9.2c0 3.1 2.5 5.6 5.6 5.6h9.8c3.1 0 5.6-2.5 5.6-5.6v-9.2"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="2.3"
      />
      <path
        d="M15.5 26c3-2.2 6.6-3.4 10.5-3.4S33.5 23.8 36.5 26v7.4c-3.3 1.8-6.8 2.7-10.5 2.7s-7.2-.9-10.5-2.7V26Z"
        fill="white"
        fillOpacity=".94"
      />
      <path d="m15 27-5-2v7l5 1M37 27l5-2v7l-5 1" stroke="white" strokeWidth="2" />
      <path d="M21 28.8h10M21 32h10" stroke="#7e0023" strokeLinecap="round" />
      <circle cx="18.5" cy="18.5" r="2.2" fill="white" />
      <circle cx="33.5" cy="18.5" r="2.2" fill="white" />
    </svg>
  );
}
