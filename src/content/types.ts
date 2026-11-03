/**
 * 全站数据契约。后端只要按这些形状返回（见 docs/API.md），前端无需改动。
 * 字段命名与旧版保持一致（id / title / summary / category / tags / date / updated）。
 */

export type Visibility = 'public' | 'private';
export type Status = 'draft' | 'published';

export interface Frontmatter {
  id: string;
  title: string;
  summary: string;
  category?: string;
  tags?: string[];
  /** YYYY-MM-DD */
  date?: string;
  updated?: string;
  visibility?: Visibility;
  status?: Status;
}

/** 随笔：比笔记多两个“现场”字段 */
export interface Essay extends Frontmatter {
  body: string;
  /** 写下它时的心境，一两个字，如「晴」「倦」「微醺」 */
  mood?: string;
  /** 写下它的地方 */
  place?: string;
}

/** 学习笔记 */
export interface Note extends Frontmatter {
  body: string;
}

export type FileKind = 'image' | 'pdf' | 'archive' | 'doc' | 'other';

export interface FileItem {
  id: string;
  name: string;
  ext: string;
  kind: FileKind;
  size: number;
  updatedAt?: string;
  src?: string;
  description?: string;
}

/** 书影音 */
export type ShelfKind = 'book' | 'film' | 'music';
/** done 读完/看完/听完；doing 进行中；want 想要 */
export type ShelfStatus = 'done' | 'doing' | 'want';

export interface ShelfItem {
  id: string;
  kind: ShelfKind;
  title: string;
  /** 作者 / 导演 / 音乐人 */
  creator: string;
  year?: number;
  /** 0–5，可为半星 */
  rating?: number;
  status: ShelfStatus;
  /** 标记日期 YYYY-MM-DD */
  date?: string;
  tags?: string[];
  /** 摘句 */
  quote?: string;
  /** 短评（纯文本，可多段，用空行分隔） */
  review?: string;
  /** 封面图地址；没有时前端用程序化“行星”代替 */
  cover?: string;
  /** 外部链接（豆瓣等） */
  link?: string;
}

/** 留言者可选的星符 */
export type SigilKey = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

export interface GuestReply {
  body: string;
  createdAt: string;
}

export interface GuestMessage {
  id: string;
  name: string;
  site?: string;
  body: string;
  sigil: SigilKey;
  /** ISO 时间 */
  createdAt: string;
  reply?: GuestReply;
  /** 仅本机刚提交、尚未审核的留言（服务器不会返回这个字段） */
  pending?: boolean;
}

export interface GuestPage {
  items: GuestMessage[];
  total: number;
}

/** 提交留言 */
export interface GuestDraft {
  name: string;
  email?: string;
  site?: string;
  body: string;
  sigil: SigilKey;
}

export interface GuestReceipt {
  id: string;
  /** pending：等待审核；approved：已直接公开 */
  status: 'pending' | 'approved';
  createdAt: string;
}

/** 进入全站索引（搜索、星图、漂流）的内容类型 */
export type ContentType = 'essays' | 'notes' | 'files' | 'shelf';
