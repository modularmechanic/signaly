import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { FADER_PAD_PX, FADER_W_PX, HP_PX, JACK_D_PX, PANEL_H } from './modules/panel-layout';

// panel-layout owns the panel's pixel geometry; the stylesheets read it from here rather than
// restating it, so there is one number per dimension instead of a comment asking two to agree.
// --u is the rack's unit: one HP is 26u and every hardware dimension in panel/controls/cables
// is a multiple of it, so setting --hp alone rescales the rack with every ratio intact.
const root = document.documentElement.style;
root.setProperty('--hp', `${HP_PX}px`);
root.setProperty('--u', `calc(var(--hp) / ${HP_PX})`);
root.setProperty('--panel-h', `calc(${PANEL_H} * var(--u))`);
root.setProperty('--jack-d', `calc(${JACK_D_PX} * var(--u))`);
root.setProperty('--fader-w', `calc(${FADER_W_PX} * var(--u))`);
root.setProperty('--fader-pad', `calc(${FADER_PAD_PX} * var(--u))`);

const host = document.getElementById('root');
if (host)
  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
