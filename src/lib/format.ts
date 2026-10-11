/** 展示格式化小工具（不引入 moment/dayjs；日期只需 YYYY-MM-DD） */

function trimZero(s: string): string {
  return s.replace(/\.0$/, '');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${trimZero(kb.toFixed(1))} KB`;
  return `${trimZero((kb / 1024).toFixed(1))} MB`;
}

export function formatDate(updated?: string, date?: string): string {
  return updated ?? date ?? '';
}

/** 列表排序键：updated 优先，回落后退 date；无日期排最后 */
export function dateKey(updated?: string, date?: string): string {
  return updated ?? date ?? '';
}

/** 扩展名 → 类型标签（列表展示用） */
export function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    image: '图片',
    pdf: 'PDF',
    archive: '压缩包',
    doc: '文档',
    other: '其他',
  };
  return map[kind] ?? '其他';
}