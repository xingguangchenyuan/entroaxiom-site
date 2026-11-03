/**
 * 内容读取的统一接口（唯一数据出口，页面一律从这里取数）
 *
 * 内容来源由构建期环境变量 VITE_CONTENT_SOURCE 决定：
 *  - official（默认）：从后端 API 读取（/api/public/*，契约见 docs/API.md）
 *  - demo：读取随包的演示内容（content/demo/），留言写进浏览器本地存储，不需要后端
 *
 * 注意写法：demo 分支是编译期常量，正式构建时整段被移除，演示数据不会进入产物。
 */

import * as api from './api';
import { cached, peekCache } from './cache';
import type { Essay, FileItem, GuestDraft, GuestPage, GuestReceipt, Note, ShelfItem } from './types';

export const CONTENT_SOURCE: 'official' | 'demo' =
  import.meta.env.VITE_CONTENT_SOURCE === 'demo' ? 'demo' : 'official';

/** 页面据此显示「演示内容」标注 */
export const isDemo = CONTENT_SOURCE === 'demo';

export { ApiRequestError } from './api';

/* 必须直接写 import.meta.env 比较，打包器才能在编译期判定并剔除 demo 分支 */
const demo = import.meta.env.VITE_CONTENT_SOURCE === 'demo' ? import('./localSource') : null;

export interface Source {
  listEssays(): Promise<Essay[]>;
  getEssay(id: string): Promise<Essay | undefined>;
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  listFiles(): Promise<FileItem[]>;
  getFile(id: string): Promise<FileItem | undefined>;
  listShelf(): Promise<ShelfItem[]>;
  getShelfItem(id: string): Promise<ShelfItem | undefined>;
  listGuestbook(offset?: number, limit?: number): Promise<GuestPage>;
  postGuestbook(draft: GuestDraft): Promise<GuestReceipt>;
}
const source = (): Promise<Source> => (demo ?? Promise.resolve(api));

/* 列表 / 详情走内存缓存（见 cache.ts）：同一份数据短时间内只请求一次。留言簿不缓存（提交后要立刻看到） */
export const listEssays = (): Promise<Essay[]> => cached('essays', async () => (await source()).listEssays());
export const getEssay = (id: string): Promise<Essay | undefined> => cached(`essay:${id}`, async () => (await source()).getEssay(id));
export const listNotes = (): Promise<Note[]> => cached('notes', async () => (await source()).listNotes());
export const getNote = (id: string): Promise<Note | undefined> => cached(`note:${id}`, async () => (await source()).getNote(id));
export const listFiles = (): Promise<FileItem[]> => cached('files', async () => (await source()).listFiles());
export const getFile = (id: string): Promise<FileItem | undefined> => cached(`file:${id}`, async () => (await source()).getFile(id));
export const listShelf = (): Promise<ShelfItem[]> => cached('shelf', async () => (await source()).listShelf());
export const getShelfItem = (id: string): Promise<ShelfItem | undefined> => cached(`shelf:${id}`, async () => (await source()).getShelfItem(id));
export const listGuestbook = async (offset = 0, limit = 20): Promise<GuestPage> =>
  (await source()).listGuestbook(offset, limit);
export const postGuestbook = async (draft: GuestDraft): Promise<GuestReceipt> => (await source()).postGuestbook(draft);

/* 同步读缓存：命中时页面挂载就是 ready 状态，不再闪一帧骨架 */
export const peekEssays = (): Essay[] | undefined => peekCache<Essay[]>('essays');
export const peekEssay = (id: string): Essay | undefined => peekCache<Essay>(`essay:${id}`);
export const peekNotes = (): Note[] | undefined => peekCache<Note[]>('notes');
export const peekNote = (id: string): Note | undefined => peekCache<Note>(`note:${id}`);
export const peekFiles = (): FileItem[] | undefined => peekCache<FileItem[]>('files');
export const peekFile = (id: string): FileItem | undefined => peekCache<FileItem>(`file:${id}`);
export const peekShelf = (): ShelfItem[] | undefined => peekCache<ShelfItem[]>('shelf');
