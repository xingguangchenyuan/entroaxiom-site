interface Props {
  className?: string;
}

/** 站标：中心定点 + 倾斜的轨道。无序运动里，可辨认的那一点。 */
export function AxiomMark({ className = '' }: Props) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r="13.5" stroke="currentColor" strokeOpacity=".4" />
      <ellipse cx="18" cy="18" rx="16.5" ry="6.4" transform="rotate(-24 18 18)" stroke="var(--axiom)" strokeWidth="1.4" />
      <circle cx="18" cy="18" r="4.4" fill="#000" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
