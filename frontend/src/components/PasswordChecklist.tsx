import { PASSWORD_RULES } from "../lib/validation";

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="checklist" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={met ? "met" : undefined}>
            <span aria-hidden="true">{met ? "✓" : "○"}</span>
            {rule.label}
            <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
