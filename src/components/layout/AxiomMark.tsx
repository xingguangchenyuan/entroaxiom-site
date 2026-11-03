interface Props {
  className?: string;
}

/**
 * 站标：被三道倾斜轨道环绕的黑洞之“眼”。
 * 三道轨道分别是余烬、冰川与星云的颜色；中心是不回信的那一点。
 */
export function AxiomMark({ className = '' }: Props) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeOpacity=".22" />
      <ellipse className="mark__orbit mark__orbit--a" cx="20" cy="20" rx="18" ry="6" transform="rotate(-28 20 20)" stroke="var(--sol)" strokeWidth="1.3" />
      <ellipse className="mark__orbit mark__orbit--b" cx="20" cy="20" rx="17" ry="5" transform="rotate(38 20 20)" stroke="var(--glacier)" strokeOpacity=".75" strokeWidth="1" />
      <ellipse className="mark__orbit mark__orbit--c" cx="20" cy="20" rx="12" ry="3.4" transform="rotate(90 20 20)" stroke="var(--ember)" strokeOpacity=".65" strokeWidth="1" />
      <circle cx="20" cy="20" r="5" fill="#000" stroke="var(--sol-hi)" strokeWidth="1.2" />
      <circle cx="34.6" cy="11.6" r="1.6" fill="var(--ember)" />
    </svg>
  );
}
