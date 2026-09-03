import type { ReactNode } from 'react';

export interface StepGridProps {
  rows: number;
  cols: number;
  renderCell: (row: number, col: number) => ReactNode;
}

/** Dumb rows x cols layout — it owns no step state, so it fits a seq row, a euclid
    pattern and a drum grid unchanged. */
export function StepGrid({ rows, cols, renderCell }: StepGridProps): ReactNode {
  return (
    <div className="step-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return <div key={`${row}:${col}`}>{renderCell(row, col)}</div>;
      })}
    </div>
  );
}
