/* Parses whatever text comes out of the console's "copy table" button on
   the retention report (console.easystore.pink/reports/retention) into
   one clean object per month.

   That copy produces a markdown-ish blob: every linked figure comes out as
   "[value](https://...)", and - because the source is a wide grid rendered
   as HTML - two adjacent cells sometimes end up glued together with no
   space between them once pasted as plain text (e.g. a trailing "-"
   placeholder immediately followed by the next row's date). Both quirks
   are handled below; this was built and checked against a real paste
   covering 2026-09 back through 2025-09, cross-checked field-by-field
   against the values that were previously hand-entered into the dashboard
   for Jan-Mar 2026.

   Row shape (each month appears twice - once at the start of its row and
   again right before Gross Revenue/Retention GR - everything else in the
   row is store/MRR-by-plan and by-month-cohort detail this app doesn't
   need):
     <month> mrrNet mrrNet% mrrChurn mrrChurn% mrrRetain mrrRetain%
             storeNet storeNet% storeChurn storeChurn% storeRetain storeRetain%
             totalStore <plan/cohort breakdown ...> totalMrr <plan/cohort breakdown ...>
     <month again> grossRev retentionGr <further breakdown, unused> */

function parseConsoleRetentionPaste(raw) {
  if (!raw || typeof raw !== 'string') return [];

  // Drop markdown links but keep their visible text, e.g. "[-637](https://...)" -> "-637"
  let text = raw.replace(/\[([^\]]*)\]\(https?:\/\/[^)]*\)/g, '$1');
  // Every "YYYY-MM" left after that is a real month marker (any that were
  // part of a URL are gone with the links above), so it's always safe to
  // force whitespace around it - this un-glues cases like "-2026-08" or
  // "6,0002026-01" that copy-paste ran together.
  text = text.replace(/(\d{4}-\d{2})(?!\d)/g, ' $1 ');

  const tokens = text.split(/\s+/).filter(Boolean);

  const num = (s) => {
    if (s == null) return null;
    if (s === '-' || s === '—' || s === '') return 0;
    const n = Number(String(s).replace(/[,%]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const rows = [];
  let i = 0;
  while (i < tokens.length) {
    if (!/^\d{4}-\d{2}$/.test(tokens[i])) { i++; continue; }
    const month = tokens[i];
    let j = i + 1;
    while (j < tokens.length && tokens[j] !== month) j++;
    if (j >= tokens.length) { i++; continue; } // no matching repeat found - skip, don't guess

    const block = tokens.slice(i + 1, j);
    if (block.length >= 13) {
      const totalStore = num(block[12]);
      // totalMrr: the first "big" number after the initial 13 metrics.
      // Everything before it (store-by-plan, store-by-month breakdown) is
      // always well under this size, so a value threshold is more robust
      // here than trying to count exactly how many breakdown columns the
      // console printed (that count isn't always the same).
      let totalMrr = null;
      for (let k = 13; k < block.length; k++) {
        const n = num(block[k]);
        if (n != null && n >= 50000) { totalMrr = n; break; }
      }
      rows.push({
        month,
        mrrNet: num(block[0]),
        mrrNetPct: num(block[1]),
        mrrChurn: num(block[2]),
        mrrRetain: num(block[4]),
        storeNet: num(block[6]),
        storeNetPct: num(block[7]),
        storeChurn: num(block[8]),
        storeRetain: num(block[10]),
        totalStore,
        totalMrr,
        grossRev: num(tokens[j + 1]),
        retentionGr: num(tokens[j + 2]),
      });
    }
    i = j + 1;
  }
  return rows;
}

module.exports = { parseConsoleRetentionPaste };
