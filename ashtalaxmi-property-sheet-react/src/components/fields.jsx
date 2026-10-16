import React, { useLayoutEffect, useRef, useState } from 'react';
import { cleanNumber, tidyNumber } from '../lib/form.js';

/** A field wrapper: label, control, and the error message (shown when `error` is set). */
export function Field({ name, label, labelFor, hint, full, error, children }) {
  const Label = labelFor ? 'label' : 'span';
  return (
    <div className={`field${full ? ' full' : ''}${error ? ' has-err' : ''}`} data-f={name}>
      <Label {...(labelFor ? { htmlFor: labelFor } : { className: 'lbl' })}>
        {label}
        {hint && <span className="hint">{hint}</span>}
      </Label>
      {children}
      <div className="err">{error}</div>
    </div>
  );
}

/** Text box with a character counter that appears once the box is 70% full. */
export function TextInput({ id, value, onChange, maxLength, ...rest }) {
  const n = value.length;
  const showCount = maxLength >= 20 && n >= maxLength * 0.7;
  return (
    <>
      <input
        type="text"
        id={id}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {showCount && (
        <small className={`count${n >= maxLength ? ' full' : ''}`} aria-live="polite">
          {n >= maxLength ? `${n} / ${maxLength} characters, limit reached` : `${n} / ${maxLength} characters`}
        </small>
      )}
    </>
  );
}

/**
 * Number-only box: anything that is not a digit or a single decimal point is removed as it is
 * typed or pasted, and a short "Numbers only" note appears. `unit` shows a suffix like "Sq. Mtr.".
 */
export function NumberInput({ id, value, onChange, maxLength, unit, placeholder, ariaLabel }) {
  const ref = useRef(null);
  const caret = useRef(null);
  const [warn, setWarn] = useState(false);
  const timer = useRef();

  useLayoutEffect(() => {
    if (caret.current != null && ref.current && document.activeElement === ref.current) {
      try {
        ref.current.setSelectionRange(caret.current, caret.current);
      } catch {
        /* some inputs refuse */
      }
      caret.current = null;
    }
  });

  const handle = (e) => {
    const raw = e.target.value;
    const clean = cleanNumber(raw);
    if (clean !== raw) {
      const pos = e.target.selectionStart ?? raw.length;
      caret.current = pos - (raw.slice(0, pos).length - cleanNumber(raw.slice(0, pos)).length);
      if (/[^\d.,\s]/.test(raw)) {
        setWarn(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setWarn(false), 2500);
      }
    }
    onChange(clean);
  };

  const input = (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      id={id}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={handle}
      onBlur={() => {
        const t = tidyNumber(value);
        if (t !== value) onChange(t);
      }}
    />
  );
  return (
    <>
      {unit ? (
        <div className="unit">
          {input}
          <em>{unit}</em>
        </div>
      ) : (
        input
      )}
      {warn && (
        <small className="numhint" aria-live="polite">
          Numbers only, for example 8635.5
        </small>
      )}
    </>
  );
}

/** Dropdown with a blank first option and "Other" at the end. options: [{value,label}] */
export function Select({ id, value, onChange, placeholder, options }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      <option value="other">Other</option>
    </select>
  );
}

/** Box that appears when "Other" is chosen. */
export function OtherBox({ show, id, value, onChange, maxLength, placeholder }) {
  if (!show) return null;
  return (
    <div className="other show">
      <TextInput id={id} value={value} onChange={onChange} maxLength={maxLength} placeholder={placeholder} />
    </div>
  );
}

/**
 * Single-choice buttons. Tapping the selected one again clears it.
 * items: [{value,label}]; `withOther` adds an "Other" option with value "other".
 */
export function RadioChips({ id, name, items, value, onChange, withOther }) {
  const all = withOther ? [...items, { value: 'other', label: 'Other' }] : items;
  return (
    <div className="chips" id={id}>
      {all.map((it) => (
        <label className="chip" key={it.value}>
          <input
            type="radio"
            name={name}
            value={it.value}
            checked={value === it.value}
            onChange={() => {}}
            onClick={() => onChange(value === it.value ? '' : it.value)}
          />
          <span>{it.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Multiple-choice buttons (Features). */
export function CheckChips({ id, name, items, values, onChange }) {
  const toggle = (v) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="chips" id={id}>
      {items.map((v) => (
        <label className="chip" key={v}>
          <input type="checkbox" name={name} value={v} checked={values.includes(v)} onChange={() => toggle(v)} />
          <span>{v}</span>
        </label>
      ))}
    </div>
  );
}
