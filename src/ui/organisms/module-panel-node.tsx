import { useState, type ComponentType, type ReactNode } from 'react';
import { CAT_COLOR, type KnobDef, type PanelNode } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { fmtValue } from '../../hooks/formatters';
import { useParam, useWorkletFeed } from '../../hooks/module-api';
import { jackSlot } from '../../state/rack-store';
import { EnvDisplay } from '../atoms/env-display';
import { Fader } from '../atoms/fader';
import { Jack } from '../atoms/jack';
import { Knob } from '../atoms/knob';
import { Label } from '../atoms/label';
import { Led } from '../atoms/led';
import { Switch } from '../atoms/switch';
import { MeterDisplay } from '../molecules/meter-display';
import { PianoDisplay } from '../molecules/piano-display';
import { ScopeDisplay } from '../molecules/scope-display';
import { StepsDisplay } from '../molecules/steps-display';
import { TextDisplay } from '../molecules/text-display';

type Parts = ComponentType<{ m: ModuleInstance }>;

export interface PanelNodeViewProps {
  node: PanelNode;
  m: ModuleInstance;
  /** from selectConnectedJacks(uid) */
  connected: ReadonlySet<string>;
  parts?: Parts;
}

/** `{t:'led', id, v}` from the DSP drives this LED; `{t:'step'}` keeps the seq/euklid blink. */
function LedNode({ m, id, label }: { m: ModuleInstance; id: string; label?: string }): ReactNode {
  const [on, setOn] = useState(false);
  useWorkletFeed<{ t: string; id?: string; v?: number }>(m, (msg) => {
    if (msg.t === 'step') setOn((v) => !v);
    else if (msg.t === 'led' && msg.id === id) setOn(msg.v === 1);
  });
  return <Led on={on} label={label} />;
}

/** `cvIn` marker: the attenuverter on that jack says how far CV can push this knob. */
function KnobNode({ m, def }: { m: ModuleInstance; def: KnobDef }): ReactNode {
  const att = def.cvIn === undefined ? undefined : m.def.knobs.find((k) => k.attenuates === def.cvIn);
  const [amt] = useParam(m, att?.id ?? '');
  const span = att ? Math.max(Math.abs(att.min), Math.abs(att.max)) : 0;
  return <Knob m={m} def={def} cv={span > 0 ? amt / span : undefined} />;
}

function EnvPanel({ m }: { m: ModuleInstance }): ReactNode {
  const [a] = useParam(m, 'a');
  const [d] = useParam(m, 'd');
  const [s] = useParam(m, 's');
  const [r] = useParam(m, 'r');
  const hold = Math.max(0.05, (a + d + r) * 0.3);
  const total = a + d + hold + r || 1;
  const points: [number, number][] = [
    [0, 0],
    [a / total, 1],
    [(a + d) / total, s],
    [(a + d + hold) / total, s],
    [1, 0],
  ];
  const chip = (id: string, v: number): { label: string; text: string } => ({
    label: id.toUpperCase(),
    text: fmtValue(m.def.knobs.find((k) => k.id === id)?.fmt, v),
  });
  return (
    <EnvDisplay
      points={points}
      values={[chip('a', a), chip('d', d), chip('s', s), chip('r', r)]}
      color={CAT_COLOR[m.def.cat]}
    />
  );
}

function DisplayNode({ m, parts: Parts }: { m: ModuleInstance; parts?: Parts }): ReactNode {
  if (Parts) return <Parts m={m} />;
  switch (m.def.display) {
    case 'scope':
      return (
        <ScopeDisplay analyser={m.ext.analyser as AnalyserNode | undefined} color={CAT_COLOR[m.def.cat]} />
      );
    case 'meter':
      return <MeterDisplay m={m} />;
    case 'steps':
      return <StepsDisplay m={m} />;
    case 'piano':
      return <PianoDisplay m={m} />;
    case 'env':
      return <EnvPanel m={m} />;
    case 'text':
      return <TextDisplay m={m} />;
    default:
      return null;
  }
}

/** One layout node -> one control. A plain switch: no renderer registry, no factory. */
export function PanelNodeView({ node, m, connected, parts }: PanelNodeViewProps): ReactNode {
  const id = node.id.slice(node.id.indexOf(':') + 1);
  switch (node.kind) {
    case 'knob':
    case 'fader': {
      const def = m.def.knobs.find((k) => k.id === id);
      if (!def) return null;
      return node.kind === 'fader' ? <Fader m={m} def={def} /> : <KnobNode m={m} def={def} />;
    }
    case 'switch': {
      const def = m.def.sws?.find((sw) => sw.id === id);
      return def ? <Switch m={m} def={def} /> : null;
    }
    case 'in':
    case 'out': {
      const dir = node.kind;
      const def = (dir === 'in' ? m.def.ins : m.def.outs).find((j) => j.id === id);
      return def ? <Jack m={m} def={def} dir={dir} patched={connected.has(jackSlot(dir, id))} /> : null;
    }
    case 'led':
      return <LedNode m={m} id={id} label={node.label} />;
    case 'label':
      return node.label ? <Label text={node.label} kind={id === 'sub' ? 'sub' : 'title'} /> : null;
    case 'display':
      return <DisplayNode m={m} parts={parts} />;
  }
}
