/* Parses the Churn Stores report from the console
   (https://console.easystore.pink -> Reports -> Churn Stores), covering
   both ways this text has actually shown up in practice: a manual
   clipboard paste from the page's own "Copy table" button (which puts the
   genome cell's six fields on one space-separated line), and a raw page
   text extraction (which puts each of those fields, and each separator, on
   its own line). Built and validated against real samples of both, not
   guessed.

   The whole thing is normalised to single-spaced text up front, which
   makes the two shapes identical from that point on and sidesteps needing
   to know which one a given paste is.

   Row shape (after stripping markdown links and collapsing whitespace):
     <#> <CC> #<storeId> <storeName> <email> [phone] [cancel reason]
     <genome: six fields and five "_" separators, or just "_ _ _ _ _" when
      the genome has no data for this store>
     <plan> <cycle> <extra month> <currency> <amount> <gr> <mrr> <expiry date> ...(ignored)

   Rows are glued together with no separator at all about as often as they
   have a normal space between them, so row boundaries are found by
   pattern (the same fix the retention report's month rows needed), not by
   splitting on whitespace.

   Only the fields the churn queue actually uses are extracted. The genome
   itself, cycle beyond its raw number, and everything after the expiry
   date (the "vs store expiry" diff - sometimes a date, sometimes the
   literal word "Matched" - and Subscribed Since) are read only far enough
   to locate the next field, never stored. */

const PLAN_ALT =
  'Success Plus|Success Prime|Business|Standard|Essential|Growth|Success|Lite|Seed|Sprout|Premier|Ultimate';

const PLAN_LINE_RE = new RegExp(
  '(' + PLAN_ALT + ')\\s+(\\d+)\\s+(-|\\d+)\\s+[A-Z]{3}\\s+[\\d,]+\\s+([\\d,]+)\\s+([\\d,]+)\\s+(\\d{4}-\\d{2}-\\d{2})',
);

function stripLinks(text) {
  // [visible text](url) -> visible text. Applies to both the store name
  // link and the amount link when this came from a clipboard paste;
  // a page-text extraction never has these in the first place.
  return text.replace(/\[([^\]]*)\]\(https?:\/\/[^\s)]+\)/g, '$1');
}

function parseChurnStoresPaste(raw, month) {
  let text = stripLinks(String(raw || ''));
  // Every field and separator can land on its own line, so normalise all
  // whitespace (including newlines) to single spaces before anything else -
  // this makes a "genome on one line" paste and a "one token per line"
  // paste identical from here on.
  text = text.replace(/\s+/g, ' ').trim();
  // Mark every row start ("<num> <CC> #<storeId> ") with a delimiter that
  // can't appear anywhere else in the text, then split on it, since rows
  // can be glued directly together with no whitespace at all.
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
    rest = rest.slice(emailMatch.index + emailMatch[0].length).trim();
    const email = emailMatch[1].replace(/[.,;]+$/, '');

    const phoneMatch = rest.match(/^(\+?\d{6,})/);
    const phone = phoneMatch ? phoneMatch[1] : '';
    if (phoneMatch) rest = rest.slice(phoneMatch[0].length).trim();

    // The genome cell's first field is a decimal like "9.4", or - when
    // there's no genome data at all for this store - the whole cell is
    // just five bare "_" separators with nothing between them. Either way
    // is a reliable marker for "cancel-reason text stops here": free-text
    // reasons don't contain isolated decimals or underscores.
    const genomeStartMatch = rest.match(/\d+\.\d+|(?:^|\s)_(?=\s|$)/);
    const genomeStart = genomeStartMatch ? genomeStartMatch.index : rest.length;
    const cancelReason = rest.slice(0, genomeStart).trim();

    // The plan line is searched for anywhere after that point rather than
    // anchored right after the genome, since the genome's own length
    // varies (0 to 6 fields) and isn't worth precisely bounding just to
    // discard it.
    const planMatch = rest.slice(genomeStart).match(PLAN_LINE_RE);
    if (!planMatch) continue;

    rows.push({
      month,
      storeId,
      storeName,
      country,
      email,
      phone,
      cancelReason,
      plan: planMatch[1],
      cycle: Number(planMatch[2]),
      gr: Number(planMatch[4].replace(/,/g, '')),
      mrr: Number(planMatch[5].replace(/,/g, '')),
      expiryDate: planMatch[6],
    });
  }
  return rows;
}

module.exports = { parseChurnStoresPaste };
