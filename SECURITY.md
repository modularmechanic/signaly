# Security policy

## Supported versions

Only `main` is supported. Signaly is a static site with no backend and no releases; the deployed site is
whatever `main` last published.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability).
Please do not open a public issue for anything exploitable. Expect a first response within a week.

## Threat model

Signaly runs entirely in your browser: there is no server, no account, and nothing you make leaves the
machine unless you ask for it. Provider API keys are yours — they are kept in browser storage (this tab's
session by default) and sent only to the provider you typed them for, and a client-side app cannot hide a
key from anyone with access to the browser. Modules you import run their DSP inside an `AudioWorklet`
scope with no DOM, no network and no storage, behind a Content-Security-Policy that allow-lists only the
three provider hosts.

## Out of scope

- A module you choose to import wedging or stalling your own audio thread. Imported code is sandboxed from
  the page and the network, not from your own tab's CPU.
- Anything requiring an attacker who already controls your browser or your machine.
- Reading a key out of your own devtools or network tab. That is inherent to bring-your-own-key.
- On GitHub Pages every project site under one account shares the `<user>.github.io` origin and therefore
  its storage. Only a custom domain isolates it.
