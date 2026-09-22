---
target: página reuniões
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:D:\\Projetos\\Meeting\\src\\app\\reunioes\\page.tsx"
target_fingerprint: "sha256:bf9fdafeff2b399f9c893c4fc91d089b47028d8e8794df4554df6e1e6d1c9b54"
target_path: "D:\\Projetos\\Meeting\\src\\app\\reunioes\\page.tsx"
timestamp: 2026-09-22T12-51-10Z
slug: src-app-reunioes-page-tsx
---
# Critique — Reuniões (src/app/reunioes/page.tsx)

Method: dual-agent (A: ses_f36d698c7fferVy8SVcnJmUWpB · B: ses_f36d698a2ffes6gvXoCIBrbvda)

## Heuristics: 18/40 (Poor)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Silent auto-create/sync; only tiny guardandoPrograma text |
| 2 | Match System / Real World | 3 | Congregation vocabulary right (Canción y oración, Titular/Ayudante, Sala) |
| 3 | User Control and Freedom | 2 | Good staged undo; auto-create irreversible, week-switch drops pending |
| 4 | Consistency and Standards | 2 | One pill grammar at 4 levels; Sin asignar rules differ silently |
| 5 | Error Prevention | 1 | Dead tpl-* taps, 100+ option outline select, window.confirm deletes |
| 6 | Recognition Rather Than Recall | 2 | Excellent dirtySummary; no inline eligibility hints |
| 7 | Flexibility and Efficiency | 1 | 14 modals, sequential saves, no bulk/repeat/keyboard flow |
| 8 | Aesthetic and Minimalist Design | 2 | Focused session card; ContentSection piles 5 jobs in one column |
| 9 | Error Recovery | 2 | Honest alerts/empties; failed auto-save recovers only by remount |
| 10 | Help and Documentation | 1 | Two micro-hints only; Sala/staged-vs-saved/slips unexplained |
| **Total** | | **18/40** | **Poor** |

## Design Specificity Verdict

70% authored for this product: NRC tokens + TheocBase section emblems + hora|título|pessoa rows are unmistakably theocratic-program. 30% generic: 4 pill levels in 1 style, admin-list Oradores/Conteúdo, CRUD-like import/export. Misses Semana-de-Treino momentum: no assigned-vs-missing glance, loudest voice is clock+title while who-serves is right-aligned 14px.

Deterministic scan: `impeccable detect --json` clean on all 4 files (page + 3 presentation components), individually and merged — 0 findings, exit 0, no false positives. All real issues are semantic. Browser visualization skipped: no browser automation exposed in this session.

## Overall Impression

Confident entry (athletic navigator), competent peak (staged-save with human summary), weak reassurance at high-stakes roles. Biggest opportunity: make viewing read-only and let Sin asignar be the only thing that shouts.

## What's Working

1. Athletic week navigator: 44px chevrons + condensed range + Hoy pill — one-thumb time travel matching the north star.
2. Staged-save pattern: pending batch + floating Guardar(n)/Descartar + dirtySummary + warning dot — best Operate decision on the page.
3. Domain-truth rows: describePart preserves print-program truth (Canción y oración, Conductor·Lector, Sala, TheocBase colors) without inventing content.

## Priority Issues

1. [P0] Silent auto-create/sync masquerades as viewing (MeetingProgramSection useEffects auto-upsert on week open). Require explicit "Crear programa" confirmation; view stays read-only. Suggested: /impeccable harden
2. [P1] 15 identical chevrons, no Sin asignar triage. Header progress "N/M asignadas" + visual weight for unassigned rows; quiet assigned rows. Suggested: /impeccable layout
3. [P2] Pill hierarchy collapse (4 levels, 1 style). Volt pill for top TabNav only; segmented kind toggle; text sub-tabs. Suggested: /impeccable layout
4. [P3] Outline select unusable at scale, Nenhum default. Searchable picker with recents. Suggested: /impeccable clarify
5. [P3] Export twins compete with save. Move Crear PDF/Descargar iCal to header actions/menu. Suggested: /impeccable layout

## Persona Red Flags

Alex (organizer power user): ~14 two-step modals + sequential save loop, no bulk/repeat-last-week; invisible display-only rows waste taps; outline select writes immediately while people stage (two save models); week-switch silently drops pending.
Casey (one-handed mobile): assignee names lowest weight on row, Sin asignar indistinguishable from names; 6+ small targets per scroll; floating save bar collides with bottom nav.
Sam (keyboard/SR): row buttons announce title without assignee/dirty state; kind toggle and sub-tabs lack tablist/aria-pressed semantics; ImportModal vs AlertDialog diverge on Esc/close; dirty dot announced only on focus.
Jordan (first-timer): lands on Atalaya sub-tab when looking for songs (auto-switch disorients); Nenhum outline dropdown scolds to import; delete-all behind window.confirm breaks PWA immersion.

## Minor Observations

- PageHeader week meta duplicates navigator formatWeekRange (two date dialects); card micro-header violates Um Display.
- w-11 clock column + session chip + emblem colors = 3 accent systems per row.
- Confirmed PT bleed: aria-label "Revisar conteúdo do .jwpub" (ContentSection:129), "Tipos de conteúdo" (:670).
- Solo lectura worded 3 ways across tabs; Fichas quiet pill easily missed; ImportModal X buttons below touch target.
- TableSkeleton rows=8 misrepresents Contenido; Hoy button causes navigator layout shift.

## Questions to Consider

- If the week auto-creates on view, who authors the program — organizer or machine — and where does accountability live?
- What if Sin asignar were the only thing allowed to shout and assigned rows went whisper-quiet?
- Is Contenido (library management) operating the week, or studio work smuggled into an Operate surface?
