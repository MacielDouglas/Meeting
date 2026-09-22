---
target: página home
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:D:\\Projetos\\Meeting\\src\\app\\page.tsx"
target_fingerprint: "sha256:8232aa2e90eaffd79a33f67cf9d9e7ca1df52570052693ee11b037889d53fc1e"
target_path: "D:\\Projetos\\Meeting\\src\\app\\page.tsx"
timestamp: 2026-09-22T11-56-02Z
slug: src-app-page-tsx
closed: true
---
# Critique — Home (src/app/page.tsx)

Method: dual-agent (A: ses_f3709b830ffe1hKbPuwRHMDCE5 · B: ses_f3709b80cffeXL2SpeskbHRLE6)

## Heuristics: 16/40 (Poor)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Generic single skeleton; offline/cache state never surfaced on home |
| 2 | Match System / Real World | 2 | `Día:` + raw time; hardcoded `En la reunión: Sin asignación` section |
| 3 | User Control and Freedom | 1 | Logged-in home has zero links to the full program |
| 4 | Consistency and Standards | 1 | Duplicated week label in 2 formats; dual card patterns; h1→h3 with no h2 |
| 5 | Error Prevention | 2 | Honest unlinked state, but fixed empty section invites misreading |
| 6 | Recognition Rather Than Recall | 1 | No weekday emphasis, no time-until, no location in MeetingBlock |
| 7 | Flexibility and Efficiency | 1 | No deep-links, iCal or print entries on home; full scan every time |
| 8 | Aesthetic and Minimalist Design | 2 | Clean shell, up to 3 gray empties per card |
| 9 | Error Recovery | 2 | Honest empties, but special-event weeks render hollow |
| 10 | Help and Documentation | 2 | No inline orientation (what is Mi semana, where is the full program) |
| **Total** | | **16/40** | **Poor** |

## Design Specificity Verdict

Interchangeable shell with NRC styling on top, not authored for this product. Tokens present (Barlow Condensed uppercase, volt ring + Próxima badge, athletic meta) but composition fits any generic dashboard. Misses "en segundos cuando y donde sirve" and "legível de relance": no my-night hero, no status line, no congregation name, no training-week rhythm. Volt marks the card frame instead of the operable fact.

Deterministic scan: `impeccable detect --json` clean on all 3 files (page.tsx, MyWeekSection.tsx, WeekView.tsx) — 0 findings, exit 0, no false positives. All real issues are semantic and came from review only. Browser visualization skipped: no browser automation exposed in this session.

## Overall Impression

Right architecture (shell never blocks, Suspense per branch) and the right rare volt signal — but the logged-in home is an operable dead end: two dense equal-weight cards, tripled gray empties, no CTA to the full program. Biggest opportunity: answer "do I serve, when, where" in the first 200px.

## What's Working

1. Shell-never-blocks is real: Promise.all + Suspense with honest 2-card skeleton (page.tsx:21,34,39).
2. Próxima + volt ring is the right rare signal (MyWeekSection.tsx:39,44) — promote, don't remove.
3. Unlinked-user copy is honest and actionable (MyWeekSection.tsx:130-137).

## Priority Issues

1. [P0] Logged-in home has no path to the full program (page.tsx:33-36). Add one explicit Operate row under the header (Ver programa completo / Imprimir / Descargar). Suggested: /impeccable layout
2. [P1] No my-night hero; equal-weight cards force full scan (MyWeekSection.tsx:39-45). Promote isNext to summary hero, collapse the other meeting. Suggested: /impeccable layout
3. [P1] Always-on empty sections punish the glance (MyWeekSection.tsx:90-118). Hide empties behind disclosure or drop the fixed male section. Suggested: /impeccable distill
4. [P2] Week-range duplication in three date dialects (page.tsx:28 vs WeekView.tsx:11 vs formatShortDay). Single week-meta component, single format. Suggested: /impeccable clarify
5. [P2] MeetingBlock drops location; PartNames truncates the payoff (MyWeekSection.tsx:28,46-51,75). Add location row, wrap names. Suggested: /impeccable layout

## Persona Red Flags

Casey (mobile, one-handed): no time-until/weekday emphasis, missable Próxima badge, no location, truncated co-worker names.
Sam (keyboard/SR): h1→h3 with no h2 (logged-in) vs h2 (logged-out); aria-hidden icon rows without row labels; truncated names without title; isNext by ring only.
Jordan (first-timer): jargon dump before orientation (partes, ISO dates); bare outline sign-in CTA with no benefit; special weeks read as broken app.

## Minor Observations

- 3-line header before any content on 360px screens.
- MeetingCard hardcodes "Programa disponible próximamente." instead of es.noProgramYet (MeetingCard.tsx:37).
- PartNames role casing mixes (Ayudante vs ayudante vs titular).
- Two badge semantics with no legend.
- Three competing brand/home anchors (FaMeetup + Inicio nav + REUNIONES header).

## Questions to Consider

- If a publisher can't answer "do I serve, where, in how many hours" from the first 200px, is this Operate or archive in costume?
- What if volt marked my next responsibility and everything without my name collapsed by default?
- Why does the logged-out stranger see more of the program than the signed-in publisher sees of their own night?
