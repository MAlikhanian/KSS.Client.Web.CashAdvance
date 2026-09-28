/**
 * Print rules for the cover sheet, deliberately kept to the minimum that is justified.
 *
 * NOBODY HAS SEEN THIS RENDER. Print output cannot be previewed from here — every route in
 * this app is a child of AppShell, which returns <ScreenLoader/> before children whenever
 * the caller is unauthenticated (app/app-shell.tsx:54-55), and no agent can sign in. So each
 * rule below has to earn its place by a stated reason; a clever rule whose failure nobody can
 * see is worse than a plain one. Do not add rules here speculatively.
 *
 * Scoped to this page on purpose: these live in a <style> element mounted with the cover
 * sheet rather than in css/styles.css, so no other page in the zone changes when printing.
 */
export const COVER_PRINT_CSS = `
@page { size: A4; margin: 12mm; }

@media print {
  /* THE ONE STRUCTURAL BLOCKER. components/ui/table.tsx:8 wraps every <table> in a
     div.overflow-auto, and an overflow container does not paginate — it CLIPS at the page
     boundary, so rows past page one would silently not print. Verified there is no height
     constraint underneath it (no h-/max-h), so removing overflow removes the whole barrier. */
  [data-slot="table-wrapper"] { overflow: visible !important; }

  /* Repeat the column header on every page, and never split a row across a break. */
  thead { display: table-header-group; }
  tr { break-inside: avoid; }

  /* App chrome is not part of the sheet. These three selectors are the roots rendered by
     Demo1Layout: div.sidebar, <header class="header">, <footer class="footer">. */
  .sidebar, header, footer { display: none !important; }

  /* The sidebar is fixed and the wrapper reserves space for it; reclaim it once hidden. */
  .wrapper { margin: 0 !important; }
  main { padding: 0 !important; }

  /* Keep a signature block whole rather than letting it split across the final break. */
  .print-keep { break-inside: avoid; }
}
`;
