/**
 * Frontmatter 解析器（设计文档 §9.3）
 * 自写实现：切出首尾 `---` 之间的块，逐行按 `key: value` 解析，
 * 支持字符串、`[a, b]` 数组与日期字符串。选择不引入 gray-matter
 * （依赖 Node Buffer，浏览器端需要 polyfill）与 front-matter（无类型）。
 */

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
}

function parseValue(raw: string): unknown {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return v.replace(/^['"]|['"]$/g, '');
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { data: {}, body: source };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    return { data: {}, body: source };
  }

  const data: Record<string, unknown> = {};
  const fmLines = lines.slice(1, end);
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');

  for (const line of fmLines) {
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = parseValue(match[2]);
  }

  return { data, body };
}