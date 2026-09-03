import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { CAT_COLOR, CAT_ORDER, type Cat, type ModuleDef } from '../../core/types';
import { allSpecs } from '../../modules/registry';

export type CatFilter = Cat | 'ALL';

/** Case-insensitive match over name / sub / id / category. */
export function filterModuleDefs(
  defs: readonly ModuleDef[],
  query: string,
  cat: CatFilter,
): readonly ModuleDef[] {
  const q = query.trim().toLowerCase();
  return defs.filter((d) => {
    if (cat !== 'ALL' && d.cat !== cat) return false;
    if (q === '') return true;
    return `${d.name} ${d.sub} ${d.id} ${d.cat}`.toLowerCase().includes(q);
  });
}

const optId = (defId: string): string => `browser-opt-${defId}`;

export interface ModuleBrowserProps {
  onPick: (defId: string) => void;
  onClose: () => void;
}

export function ModuleBrowser({ onPick, onClose }: ModuleBrowserProps): ReactNode {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CatFilter>('ALL');
  const [hi, setHi] = useState(0);

  const defs = useMemo(() => allSpecs().map((s) => s.def), []);
  const results = useMemo(() => filterModuleDefs(defs, query, cat), [defs, query, cat]);
  const cats = useMemo(() => CAT_ORDER.filter((c) => defs.some((d) => d.cat === c)), [defs]);
  const idx = Math.max(0, Math.min(hi, results.length - 1));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'Enter') {
      const pick = results[idx];
      if (pick) onPick(pick.id);
      return;
    }
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (step === 0 || results.length === 0) return;
    e.preventDefault();
    setHi((results.length + idx + step) % results.length);
  };

  /** Modal dialog: Tab cycles inside it instead of walking the rack behind the backdrop. */
  const onTab = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab') return;
    const els = [...e.currentTarget.querySelectorAll<HTMLElement>('button, input')].filter(
      (el) => !el.hasAttribute('disabled'),
    );
    const edge = e.shiftKey ? els[0] : els[els.length - 1];
    const wrap = e.shiftKey ? els[els.length - 1] : els[0];
    if (!edge || !wrap || document.activeElement !== edge) return;
    e.preventDefault();
    wrap.focus();
  };

  const chip = (value: CatFilter, label: string): ReactNode => (
    <button
      key={value}
      type="button"
      className={'cat-chip' + (cat === value ? ' on' : '')}
      style={{ '--cat': value === 'ALL' ? CAT_COLOR.UTILITY : CAT_COLOR[value] } as CSSProperties}
      aria-pressed={cat === value}
      onClick={() => setCat(value)}
    >
      {label}
    </button>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal browser"
        role="dialog"
        aria-modal="true"
        aria-label="Module browser"
        onKeyDown={onTab}
      >
        <header className="modal-head">
          <h2>Modules</h2>
          <input
            className="search"
            type="search"
            autoFocus
            value={query}
            placeholder="Search oscillator, filter, meter…"
            aria-label="Search modules"
            aria-controls="browser-list"
            // The arrow keys move a highlight in a list the input keeps focus on: without this the
            // move is silent to a screen reader.
            aria-activedescendant={results[idx] ? optId(results[idx].id) : undefined}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="button" className="modal-x" aria-label="Close module browser" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="cat-chips">{[chip('ALL', 'All'), ...cats.map((c) => chip(c, c))]}</div>
        <ul className="browser-list" id="browser-list" role="listbox" aria-label="Modules">
          {results.map((d, i) => (
            <li key={d.id} role="presentation">
              <button
                type="button"
                role="option"
                id={optId(d.id)}
                aria-selected={i === idx}
                className={'browser-item' + (i === idx ? ' hi' : '')}
                style={{ '--cat': CAT_COLOR[d.cat] ?? CAT_COLOR.CUSTOM } as CSSProperties}
                title={d.sub}
                onClick={() => onPick(d.id)}
              >
                <strong>{d.name}</strong>
                <span className="browser-sub">{d.sub}</span>
                <span className="browser-hp">{d.hp} HP</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="browser-empty">No matching modules.</li>}
        </ul>
      </div>
    </div>
  );
}
