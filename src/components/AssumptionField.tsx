"use client";
import { useId, useState } from "react";
import { FIELD_BY_ID, parseDisplay, toDisplayText, unitSuffix } from "@/lib/finance/inputs";
import { useModel } from "./ModelProvider";

/**
 * Text input in the field's DISPLAY unit. Only valid values (<= 2 decimals, in range) are committed to the
 * model; an invalid draft shows an error and the model keeps the last valid value.
 */
export function AssumptionField({ id }: { id: string }) {
  const spec = FIELD_BY_ID[id]!;
  const { state, setField } = useModel();
  const stored = state[id]!;
  const [draft, setDraft] = useState(() => toDisplayText(spec, stored));
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  // Re-sync when the stored value changes from elsewhere (reset, edit on another page). Adjust-state-during-render pattern.
  const [seen, setSeen] = useState(stored);
  if (seen !== stored) {
    setSeen(stored);
    const p = parseDisplay(draft, spec);
    if (!p.ok || p.stored !== stored) {
      setDraft(toDisplayText(spec, stored));
      setError(null);
    }
  }

  const onChange = (v: string) => {
    setDraft(v);
    const p = parseDisplay(v, spec);
    if (p.ok) {
      setError(null);
      if (p.stored !== stored) setField(id, p.stored);
    } else setError(p.error);
  };
  const onBlur = () => {
    if (!error) setDraft(toDisplayText(spec, stored)); // normalize "8" -> "8.00"
  };

  return (
    <div className="field">
      <label htmlFor={uid}>{spec.label}</label>
      <div className="ctl">
        <input
          id={uid}
          inputMode={spec.unit === "year" ? "numeric" : "decimal"}
          autoComplete="off"
          value={draft}
          readOnly={Boolean(spec.readOnly)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${uid}-d`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          data-field={id}
        />
        <span className="unit" aria-hidden="true">
          {unitSuffix[spec.unit]}
        </span>
      </div>
      <div id={`${uid}-d`}>
        {error ? (
          <div className="err" role="alert">
            {error}
          </div>
        ) : (
          <div className="hint">{spec.readOnly ?? spec.note}</div>
        )}
      </div>
    </div>
  );
}
