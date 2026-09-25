/* Server-side mirror of dashboard.html's canonAM()/AM_ALIAS_DEFAULT.
 *
 * Why this exists: a handful of people log in under one name but have
 * historical rows (upgrades, time off, etc.) filed under an older name the
 * data itself uses - Kian Ming's real account is what all of his book
 * belongs to, but the merchant master, the Upgrade seed and older tracker
 * exports all filed it under "George Sim" (no login called George Sim
 * exists). dashboard.html's canonAM() folds both spellings into one
 * identity for display, filtering and grouping - but every ownership check
 * in these API routes compared the raw `am`/`person` column against
 * `me.name` with strict equality, so a row saved under the older spelling
 * (exactly the ones a manager edits on the person's behalf, since the
 * Owner dropdown always resolves to the canonical spelling) silently
 * 403'd for the real person trying to touch their own record afterwards.
 * That's a permanent, silent lock-out, not a one-off glitch: every future
 * edit on that row from their own login fails the same way until this is
 * canonicalized here too.
 *
 * Kept intentionally small and dependency-free (no access to the client's
 * localStorage-only Settings > amAlias override) - it only covers the
 * default aliases baked into the app. That's the case that actually
 * matters here: nobody has ever customized this per-browser setting, and
 * the ownership check only needs to agree with the *default* mapping
 * dashboard.html falls back to when nothing's been customized. */
const AM_ALIAS_DEFAULT = { 'Choo Zhe Hong': 'Calvin Choo', 'Kian Ming': 'George Sim' };

function canonAM(n) {
  const s = String(n || '').trim();
  return AM_ALIAS_DEFAULT[s] || s;
}

export { canonAM, AM_ALIAS_DEFAULT };
