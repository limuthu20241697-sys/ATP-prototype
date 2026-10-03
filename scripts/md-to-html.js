// Minimal markdown -> print-ready HTML. No dependencies.
// Usage: node scripts/md-to-html.js <input.md> <output.html> ["Doc title"]
//
// Deliberately small: it handles the subset used by the briefs in scraps/
// (headings, tables, blockquotes, lists, task lists, inline code/bold/italic).
// Not a general Markdown implementation.

const fs = require('fs');

const [, , inPath, outPath, titleArg] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node scripts/md-to-html.js <in.md> <out.html> ["title"]');
  process.exit(1);
}

const md = fs.readFileSync(inPath, 'utf8');
const lines = md.split(/\r?\n/);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

const out = [];
let inTable = false;
let inList = false;
let quote = [];

const flushList = () => { if (inList) { out.push('</ul>'); inList = false; } };
const flushQuote = () => {
  if (quote.length) { out.push('<blockquote>' + quote.join('') + '</blockquote>'); quote = []; }
};
const flushTable = () => { if (inTable) { out.push('</table>'); inTable = false; } };

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];

  // Tables
  if (/^\s*\|/.test(L)) {
    flushList(); flushQuote();
    const cells = L.split('|').slice(1, -1);
    if (!inTable) {
      out.push('<table>');
      inTable = true;
      out.push('<tr>' + cells.map((c) => '<th>' + inline(c.trim()) + '</th>').join('') + '</tr>');
      if (/^\s*\|[\s:|-]+\|/.test(lines[i + 1] || '')) i++;   // skip separator row
      continue;
    }
    out.push('<tr>' + cells.map((c) => '<td>' + inline(c.trim()) + '</td>').join('') + '</tr>');
    continue;
  }
  flushTable();

  // Blockquotes accumulate until a non-quote line
  if (/^>\s?/.test(L)) {
    const t = L.replace(/^>\s?/, '');
    quote.push(t.trim() ? '<p>' + inline(t) + '</p>' : '');
    continue;
  }
  flushQuote();

  if (/^---+$/.test(L)) { flushList(); out.push('<hr>'); continue; }

  let m;
  if ((m = L.match(/^(#{1,6})\s+(.*)/))) {
    flushList();
    const n = m[1].length;
    out.push(`<h${n}>${inline(m[2])}</h${n}>`);
    continue;
  }
  // Task list items render as printable checkboxes
  if ((m = L.match(/^\s*-\s+\[[ xX]\]\s+(.*)/))) {
    if (!inList) { out.push('<ul class="chk">'); inList = true; }
    out.push('<li>' + inline(m[1]) + '</li>');
    continue;
  }
  if ((m = L.match(/^\s*[-*]\s+(.*)/)) || (m = L.match(/^\s*\d+\.\s+(.*)/))) {
    if (!inList) { out.push('<ul>'); inList = true; }
    out.push('<li>' + inline(m[1]) + '</li>');
    continue;
  }

  if (!L.trim()) { flushList(); continue; }

  flushList();
  out.push('<p>' + inline(L) + '</p>');
}
flushList(); flushQuote(); flushTable();

const title = titleArg || inPath.split(/[\\/]/).pop().replace(/\.md$/, '');

const css = `
@page { size: A4; margin: 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", -apple-system, Helvetica, Arial, sans-serif;
       font-size: 10.2pt; line-height: 1.55; color: #1c1a24; margin: 0; }
h1 { font-size: 21pt; margin: 0 0 4pt; color: #0f2a20; letter-spacing: -.3pt; }
h2 { font-size: 14pt; margin: 20pt 0 6pt; padding-bottom: 4pt;
     border-bottom: 2px solid #e07b30; color: #0f2a20; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 14pt 0 4pt; color: #1a4034; page-break-after: avoid; }
h4 { font-size: 10.4pt; margin: 10pt 0 3pt; color: #1a4034; page-break-after: avoid; }
p { margin: 0 0 6pt; }
hr { border: 0; border-top: 1px solid #e2ded6; margin: 13pt 0; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9.2pt;
        page-break-inside: avoid; }
th { background: #f4efe6; text-align: left; padding: 5pt 7pt; border: 1px solid #ddd6ca;
     font-size: 8.4pt; text-transform: uppercase; letter-spacing: .4pt; color: #5a5266; }
td { padding: 5pt 7pt; border: 1px solid #e6e1d8; vertical-align: top; }
code { background: #f3ede2; padding: 1pt 4pt; border-radius: 3px;
       font-family: Consolas, monospace; font-size: 8.8pt; color: #8a4b18; }
blockquote { margin: 8pt 0; padding: 8pt 12pt; background: #f8f5ef;
             border-left: 3px solid #c9bfa9; page-break-inside: avoid; }
blockquote p { margin: 0 0 4pt; font-size: 9.6pt; }
blockquote p:last-child { margin: 0; }
ul { margin: 0 0 8pt; padding-left: 16pt; }
li { margin-bottom: 3pt; }
ul.chk { list-style: none; padding-left: 2pt; }
ul.chk li { padding-left: 18pt; text-indent: -18pt; }
ul.chk li::before { content: "\\2610"; font-size: 12pt; color: #a89c82;
                    margin-right: 7pt; vertical-align: -1pt; }
strong { color: #0f2a20; }
`;

fs.writeFileSync(
  outPath,
  '<!doctype html><html><head><meta charset="utf-8"><title>' +
    esc(title) + '</title><style>' + css + '</style></head><body>' +
    out.join('\n') + '</body></html>'
);

console.log('wrote', outPath, (fs.statSync(outPath).size / 1024).toFixed(0) + ' KB');
