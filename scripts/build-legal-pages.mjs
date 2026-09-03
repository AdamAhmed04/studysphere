/*
 * Turns docs/*.md into the standalone pages served at /privacy and /terms.
 *
 * The markdown is the source. These pages are generated before every dev run
 * and every build, and are gitignored, so there is no committed copy that can
 * quietly fall out of step with the document it was made from.
 *
 * Only the markdown this project actually uses is supported — headings,
 * emphasis, links, lists, pipe tables and rules. It is not a general parser
 * and does not need to be.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = [
  {
    slug: 'privacy',
    file: 'docs/privacy-policy.md',
    label: 'Privacy Policy',
    description: 'What StudySphere collects, why, who can see it, and how to get a copy or delete it.',
  },
  {
    slug: 'terms',
    file: 'docs/terms-of-service.md',
    label: 'Terms of Service',
    description: 'The rules for using StudySphere, and what you can expect from it.',
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Inline spans, applied after escaping so the markup added here survives. */
const inline = (s) => esc(s)
  // Cross-document links resolve to the sibling page rather than the file.
  .replace(/\[([^\]]+)\]\(privacy-policy\.md\)/g, '<a href="/privacy">$1</a>')
  .replace(/\[([^\]]+)\]\(terms-of-service\.md\)/g, '<a href="/terms">$1</a>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');

function render(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  const toc = [];
  const buf = [];
  let i = 0;

  const flush = () => {
    if (buf.length) out.push('<p>' + inline(buf.join(' ')) + '</p>');
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // A table is a header row followed by the dashed separator.
    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) {
      flush();
      const cells = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
      const head = cells(line);
      i += 2;

      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) body.push(cells(lines[i++]));

      out.push(
        '<div class="scroller"><table><thead><tr>' +
        head.map((c) => '<th>' + inline(c) + '</th>').join('') +
        '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>'
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      const [, hashes, text] = heading;

      if (hashes.length === 1) {
        out.push('<h1>' + inline(text) + '</h1>');
      } else if (hashes.length === 2) {
        const id = slugify(text);
        toc.push({ id, text: text.replace(/^\d+\.\s*/, '') });
        out.push('<h2 id="' + id + '">' + inline(text) + '</h2>');
      } else {
        out.push('<h3>' + inline(text) + '</h3>');
      }

      i++;
      continue;
    }

    if (/^---\s*$/.test(line)) { flush(); i++; continue; }

    const bulleted = /^[-*]\s+/.test(line);
    const numbered = /^\d+\.\s+/.test(line);

    if (bulleted || numbered) {
      flush();
      const pattern = bulleted ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/;
      const items = [];

      while (i < lines.length) {
        const m = lines[i].match(pattern);

        if (m) {
          items.push([m[1]]);
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1].push(lines[i].trim());   // a wrapped line
        } else {
          break;
        }

        i++;
      }

      const tag = bulleted ? 'ul' : 'ol';
      out.push('<' + tag + '>' + items.map((p) => '<li>' + inline(p.join(' ')) + '</li>').join('') + '</' + tag + '>');
      continue;
    }

    if (!line.trim()) { flush(); i++; continue; }

    buf.push(line.trim());
    i++;
  }

  flush();
  return { html: out.join('\n      '), toc };
}

const template = readFileSync(join(root, 'scripts/legal-template.html'), 'utf8');

mkdirSync(join(root, 'public'), { recursive: true });

for (const doc of DOCS) {
  const { html, toc } = render(readFileSync(join(root, doc.file), 'utf8'));

  const swap = DOCS
    .map((d) => `<a href="/${d.slug}"${d.slug === doc.slug ? ' class="on" aria-current="page"' : ''}>${d.label}</a>`)
    .join('\n      ');

  const page = template
    .replace('__TITLE__', doc.label)
    .replace('__DESCRIPTION__', doc.description)
    .replace('__SWAP__', swap)
    .replace('__TOC__', toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('\n        '))
    .replace('__BODY__', html);

  writeFileSync(join(root, 'public', doc.slug + '.html'), page);
  console.log(`  public/${doc.slug}.html  ${toc.length} sections`);
}
