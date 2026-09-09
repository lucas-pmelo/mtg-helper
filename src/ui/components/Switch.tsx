type SwitchProps = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

/** Ligado afunda, como o resto do relevo do sistema. */
export function Switch({ label, hint, checked, onChange }: SwitchProps) {
  return (
    <button
      className="switch-row"
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-text">
        {label}
        {hint && <span className="muted">{hint}</span>}
      </span>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}
