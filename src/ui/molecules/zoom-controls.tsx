import { type ReactNode, type RefObject } from 'react';
import { useRackZoom, ZOOM_STEP } from '../../hooks/use-rack-zoom';
import { Button } from '../atoms/button';

/** The rack's zoom dock: − / level / +, docked bottom-right within thumb reach. Mounting this
    is also what installs the pinch and ctrl-wheel gestures, so it owns the whole zoom feature. */
export function ZoomControls({ rack }: { rack: RefObject<HTMLElement | null> }): ReactNode {
  const { zoom, zoomBy, reset } = useRackZoom(rack);
  const pct = Math.round(zoom * 100);

  return (
    <div className="zoom-dock" role="group" aria-label="Rack zoom">
      <Button aria-label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)}>
        −
      </Button>
      <Button
        className="zoom-level"
        aria-label={`Zoom ${pct} percent — reset to 100 percent`}
        onClick={reset}
      >
        {pct}%
      </Button>
      <Button aria-label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)}>
        +
      </Button>
    </div>
  );
}
