/** 估算阅读时长（分钟）：中文约 400 字/分，英文约 220 词/分 */
export function readingMinutes(text: string): number {
  const cjk = (text.match(/[㐀-鿿]/g) ?? []).length;
  const words = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9_]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}
