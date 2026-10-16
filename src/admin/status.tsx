import type { Status, Visibility } from '../lib/adminApi';

/** 访客是否看得到：必须同时 public + published（与后端规则一致） */
export function isLive(v: Visibility, s: Status): boolean {
  return v === 'public' && s === 'published';
}

export function reasonHidden(v: Visibility, s: Status): string {
  if (v === 'private' && s === 'draft') return '私密 · 草稿';
  if (v === 'private') return '私密';
  return '草稿';
}

export function StateBadge({ visibility, status }: { visibility: Visibility; status: Status }) {
  const live = isLive(visibility, status);
  return (
    <span className={`tag ${live ? 'tag--moss' : ''}`} title={live ? '访客可见' : '访客不可见'}>
      <span className={`led ${live ? 'led--on' : ''}`} /> <span className="statebadge__t">{live ? '访客可见' : reasonHidden(visibility, status)}</span>
    </span>
  );
}
