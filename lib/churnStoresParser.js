/* Parses the "Copy table" output from the console's Churn Stores report
   (https://console.easystore.pink -> Reports -> Churn Stores). Built and
   validated against a real paste, not guessed - see the row shape notes
   below.

   The copied text glues rows together with no separator (row N's last
   field runs straight into row N+1's row number with no space), the same
   way the retention report's month rows did, so row boundaries have to be
   found by pattern rather than by splitting on whitespace or newlines.

   Row shape (after stripping markdown links to their visible text):
     <#> <CC> #<storeId> <storeName> <email> [phone] [cancel reason]
     <genome string, its own line>
     <plan> <cycle> <extra month> <currency> <amount> <gr> <mrr> <expiry date> ...(ignored)

   Only the fields the churn queue actually uses are extracted - Genome,
   Cycle, Extra Month, and everything after the expiry date (the "vs store
   expiry" diff, which is sometimes the literal word "Matched" instead of a
   date, and Subscribed Since) are read only far enough to locate the next
   field, never stored. */

const PLAN_ALT =
  'Success Plus|Success Prime|Business|Standard|Essential|Growth|Success|Lite|Seed|Sprout|Premier|Ultimate';

function stripLinks(text) {
  // [visible text](url) -> visible text. Applies to both the store name
  // link and the amount link; anything else in the paste has no brackets.
  return text.replace(/\[([^\]]*)\]\(https?:\/\/[^\s)]+\)/g, '$1');
}

function parseChurnStoresPaste(raw, month) {
  let text = stripLinks(String(raw || ''));
  // Mark every row start ("<num> <CC> #<storeId> ") with a delimiter that
  // can't appear anywhere else in the text, then split on it. This is the
  // same fix the retention parser needed for its "YYYY-MM" row markers:
  // rows are glued together with no whitespace about as often as they have
  // a normal space, so detecting the boundary has to happen before any
  // whitespace-based splitting.
  text = text.replace(/(\d+\s+[A-Z]{2}\s+#\d+\s+)/g, '\x01$1');
  const chunks = text
    .split('\x01')
    .map(s => s.trim())
    .filter(Boolean);

  const rows = [];
  for (const chunk of chunks) {
    const head = chunk.match(/^(\d+)\s+([A-Z]{2})\s+#(\d+)\s+/);
    if (!head) continue; // the header row, or anything before the first match
    const country = head[2];
    const storeId = head[3];
    let rest = chunk.slice(head[0].length);

    const emailMatch = rest.match(/(\S+@\S+)/);
    if (!emailMatch) continue;
    const storeName = rest.slice(0, emailMatch.index).trim();
    rest = rest.slice(emailMatch.index + emailMatch[0].length);
    const email = emailMatch[1].replace(/[.,;]+$/, '');

    // The genome cell always starts "<n>.<n> _ <n> _ (" - nothing else in
    // the row looks like that, so it's a reliable anchor for where the
    // phone/cancel-reason text ends.
    const genomeMatch = rest.match(/\d+\.\d+\s*_\s*[\d.]+\s*_\s*\(/);
    if (!genomeMatch) continue;
    const preGenome = rest.slice(0, genomeMatch.index).trim();
    const phoneMatch = preGenome.match(/^(\+?\d{6,})/);
    const phone = phoneMatch ? phoneMatch[1] : '';
    const cancelReason = (phoneMatch ? preGenome.slice(phoneMatch[0].length) : preGenome).trim();

    // The genome sits on its own line; everything after that newline is
    // plan/cycle/amount/gr/mrr/expiry and the fields this doesn't need.
    const afterGenomeIdx = rest.indexOf('\n', genomeMatch.index);
    const restLine = (afterGenomeIdx >= 0 ? rest.slice(afterGenomeIdx + 1) : '')
      .replace(/\s+/g, ' ')
      .trim();

    const lineMatch = restLine.match(
      new RegExp(
        '^(' + PLAN_ALT + ')\\s+(\\d+)\\s+(-|\\d+)\\s+[A-Z]{3}\\s+[\\d,]+\\s+([\\d,]+)\\s+([\\d,]+)\\s+(\\d{4}-\\d{2}-\\d{2})',
      ),
    );
    if (!lineMatch) continue;

    rows.push({
      month,
      storeId,
      storeName,
      country,
      email,
      phone,
      cancelReason,
      plan: lineMatch[1],
      cycle: Number(lineMatch[2]),
      gr: Number(lineMatch[4].replace(/,/g, '')),
      mrr: Number(lineMatch[5].replace(/,/g, '')),
      expiryDate: lineMatch[6],
    });
  }
  return rows;
}

module.exports = { parseChurnStoresPaste };
