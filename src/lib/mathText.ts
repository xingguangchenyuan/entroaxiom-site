/**
 * 正文里有没有数学公式。
 *
 * 用来决定要不要为这篇文章下载 KaTeX（262 KB js + 29 KB css）。
 * 判定规则对齐 remark-math（micromark-extension-math），并且刻意偏保守：
 * 宁可偶尔多下载一次，也不要把「价格 $5 到 $9」这种普通文字当成公式，
 * 否则每篇文章都会白下载 90 KB（gzip）。
 *
 *  - 块级：$$ ... $$
 *  - 行内：$ ... $，开头的 $ 后面不能紧跟空白或 $，结尾的 $ 前面不能是空白，
 *    中间不能出现 $ 或换行
 */
const BLOCK_MATH = /\$\$[\s\S]*?\$\$/;
const INLINE_MATH = /\$(?![\s$])(?:[^$\n]*[^\s$])?\$/;

export function containsMath(body: string): boolean {
  // 绝大多数文章一个 $ 都没有，先做一次 O(n) 的字符检查再上正则
  if (!body.includes('$')) return false;
  return BLOCK_MATH.test(body) || INLINE_MATH.test(body);
}
