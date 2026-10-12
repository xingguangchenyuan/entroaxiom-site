interface Props {
  className?: string;
}

/** 同心轨道与中心定点：无序运动中可辨认的公理。 */
export function AxiomMark({ className = '' }: Props) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r="13.5" stroke="currentColor" strokeOpacity=".55" />
      <ellipse cx="18" cy="18" rx="17" ry="7.2" transform="rotate(-30 18 18)" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="18" cy="18" r="3.2" fill="currentColor" />
      <path d="M18 0v8M18 28v8M0 18h8M28 18h8" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}
