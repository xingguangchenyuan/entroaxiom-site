/** 内容数据模型（设计文档 §9） */

export type Visibility = 'public' | 'private';

/** 文档 §9.2 frontmatter 规范 */
export interface Frontmatter {
  /** 必填，URL 使用，kebab-case，全局唯一 */
  id: string;
  /** 必填 */
  title: string;
  /** 必填，建议 40~80 字 */
  summary: string;
  /** 可选，单值，用于分类筛选 */
  category?: string;
  /** 可选，数组，参与搜索 */
  tags?: string[];
  /** 可选，YYYY-MM-DD */
  date?: string;
  /** 可选，YYYY-MM-DD，列表优先展示 */
  updated?: string;
  /** 可选，缺省视为 public；本阶段只加载 public，无任何 UI */
  visibility?: Visibility;
}

/** 学习笔记：frontmatter + Markdown 正文 */
export interface Note extends Frontmatter {
  body: string;
}

/** 文章总结：frontmatter + Markdown 正文 */
export interface Summary extends Frontmatter {
  body: string;
}

export type FileKind = 'image' | 'pdf' | 'archive' | 'doc' | 'other';

/** 文档 §9.4 文件清单模型 */
export interface FileItem {
  /** URL 用，kebab-case */
  id: string;
  /** 展示名，含扩展名 */
  name: string;
  /** 'pdf' | 'png' | 'zip' ... */
  ext: string;
  /** 决定图标与能否预览 */
  kind: FileKind;
  /** 字节 */
  size: number;
  /** YYYY-MM-DD，无真实数据则省略 */
  updatedAt?: string;
  /** 仅演示模式：项目内本地资源路径。正式数据恒为 undefined */
  src?: string;
  description?: string;
}

export type ContentType = 'notes' | 'summaries' | 'files';