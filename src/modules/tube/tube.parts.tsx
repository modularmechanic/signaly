import type { CSSProperties, ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useParam, useSwitch } from '../../hooks/module-api';
import './tube.css';

const TYPE_NAMES = ['12AX7', '12AU7', '6L6', 'EL34', 'KT88'];
/** 12AX7 and 12AU7 are 9-pin miniature twin triodes; the other three are octal power tubes,
    drawn taller and fatter from the same geometry through `data-family`. */
const FAMILY = ['preamp', 'preamp', 'power', 'power', 'power'];

/** Six rib lines down each plate, evenly spaced. */
const RIBS = [64, 78, 92, 106, 120, 134];

/**
 * A valve for TUBE's display slot. DRIVE becomes `--heat` (0..1) on the svg root as a style
 * write, so the filament, the plate glow and the halo change through CSS and the drawing is
 * never re-rendered for it. Everything is gradients and opacity: no filters, nothing that
 * repaints beyond this box.
 */
export function TubeParts({ m }: { m: ModuleInstance }): ReactNode {
  const [drive] = useParam(m, 'drive');
  const [type] = useSwitch(m, 'type');
  const k = m.def.knobs.find((x) => x.id === 'drive');
  const lo = k?.min ?? 0;
  const hi = k?.max ?? 1;
  const heat = Math.max(0, Math.min(1, (drive - lo) / (hi - lo || 1)));
  const name = TYPE_NAMES[type] ?? TYPE_NAMES[0];
  const family = FAMILY[type] ?? FAMILY[0];
  const uid = `tube${m.uid}`;

  return (
    <svg
      className="tube-svg"
      data-family={family}
      style={{ '--heat': heat } as CSSProperties}
      viewBox="0 0 140 220"
      role="img"
      aria-label={`${name} valve, drive ${Math.round(heat * 100)} percent`}
    >
      <defs>
        <radialGradient id={`${uid}-halo`} cx="50%" cy="55%" r="50%">
          <stop offset="0" className="halo-core" />
          <stop offset="0.45" className="halo-mid" />
          <stop offset="1" className="halo-edge" />
        </radialGradient>
        <linearGradient id={`${uid}-glass`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="glass-a" />
          <stop offset="0.28" className="glass-b" />
          <stop offset="0.62" className="glass-c" />
          <stop offset="1" className="glass-d" />
        </linearGradient>
        <linearGradient id={`${uid}-plate`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="plate-a" />
          <stop offset="0.5" className="plate-b" />
          <stop offset="1" className="plate-c" />
        </linearGradient>
        <linearGradient id={`${uid}-getter`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="getter-a" />
          <stop offset="1" className="getter-b" />
        </linearGradient>
        <radialGradient id={`${uid}-heater`} cx="50%" cy="50%" r="50%">
          <stop offset="0" className="heater-a" />
          <stop offset="1" className="heater-b" />
        </radialGradient>
      </defs>

      {/* light spilling out of the glass onto the plate: a wide faint spill and a tight bright bloom */}
      <ellipse
        className="tube-halo tube-halo-far"
        cx="70"
        cy="104"
        rx="70"
        ry="108"
        fill={`url(#${uid}-halo)`}
      />
      <ellipse
        className="tube-halo tube-halo-near"
        cx="70"
        cy="104"
        rx="42"
        ry="86"
        fill={`url(#${uid}-halo)`}
      />

      <g className="tube-body">
        {/* socket the tube sits in, then the nine pins seen in a row */}
        <ellipse className="socket" cx="70" cy="200" rx="38" ry="7" />
        <ellipse className="socket-ring" cx="70" cy="199" rx="32" ry="5" />
        <g className="pins">
          {[46, 54, 62, 70, 78, 86, 94].map((x) => (
            <line key={x} x1={x} y1="178" x2={x} y2="196" />
          ))}
        </g>

        {/* internal structure, behind the glass so the glass tints it */}
        <g className="innards">
          <rect className="rod" x="45.5" y="46" width="1.6" height="112" />
          <rect className="rod" x="92.9" y="46" width="1.6" height="112" />
          <ellipse className="mica" cx="70" cy="52" rx="23" ry="3.6" />
          <ellipse className="mica" cx="70" cy="152" rx="23" ry="3.6" />
          {[52, 70, 88].map((x) => (
            <circle key={x} className="mica-hole" cx={x} cy="52" r="0.9" />
          ))}
          {/* the heater seen through the plate's side slots, and its glow behind */}
          <ellipse className="heater-glow" cx="70" cy="104" rx="30" ry="56" fill={`url(#${uid}-heater)`} />
          <g className="plates" fill={`url(#${uid}-plate)`}>
            <rect x="50" y="58" width="16" height="90" rx="1.6" />
            <rect x="74" y="58" width="16" height="90" rx="1.6" />
          </g>
          <g className="ribs">
            {RIBS.map((y) => (
              <path key={y} d={`M50 ${y} H66 M74 ${y} H90`} />
            ))}
          </g>
          <g className="slots">
            <rect x="57.2" y="62" width="1.6" height="82" rx="0.8" />
            <rect x="81.2" y="62" width="1.6" height="82" rx="0.8" />
          </g>
          <g className="plate-heat">
            <rect x="50" y="58" width="16" height="90" rx="1.6" />
            <rect x="74" y="58" width="16" height="90" rx="1.6" />
          </g>
        </g>

        {/* the glass envelope: dome, tip-off, getter flash, two highlights */}
        <path
          className="glass"
          fill={`url(#${uid}-glass)`}
          d="M40 168 V42 C40 22 52 12 70 12 C88 12 100 22 100 42 V168 C100 175 88 179 70 179 C52 179 40 175 40 168 Z"
        />
        {/* lit from inside, dark at the rims, a specular arc on the dome: that is the roundness */}
        <path
          className="glass-heat"
          d="M40 168 V42 C40 22 52 12 70 12 C88 12 100 22 100 42 V168 C100 175 88 179 70 179 C52 179 40 175 40 168 Z"
        />
        <path className="rim" d="M41.5 44 C41.5 30 50 20 60 15" />
        <path className="rim" d="M98.5 44 C98.5 30 90 20 80 15" />
        <path className="rim rim-side" d="M41.6 46 V166" />
        <path className="rim rim-side" d="M98.4 46 V166" />
        <path className="dome-hilite" d="M52 34 C55 24 62 18 70 16" />
        <circle className="tip" cx="70" cy="11" r="2.6" />
        <path
          className="getter"
          fill={`url(#${uid}-getter)`}
          d="M50 30 C56 18 84 18 90 30 C86 40 54 40 50 30 Z"
        />
        <path className="hilite" d="M47 46 C44.5 84 44.5 126 47.5 160" />
        <rect className="hilite-soft" x="86" y="48" width="7" height="112" rx="3.5" />
        <text className="print" x="36" y="112" transform="rotate(-90 36 112)" textAnchor="middle">
          {name}
        </text>
      </g>
    </svg>
  );
}

export const parts = TubeParts;
