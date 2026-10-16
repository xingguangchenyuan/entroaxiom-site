/**
 * 内容读取的统一接口（唯一数据出口，页面一律从这里取数）
 *
 * 内容来源由构建期环境变量 VITE_CONTENT_SOURCE 决定：
 *  - official（默认）：从后端 API 读取（/api/public/*），只会拿到公开且已发布的内容
 *  - demo：读取随包的演示内容（content/demo/），页面显示「演示内容」标注，不需要后端
 *
 * 注意写法：demo 分支是编译期常量，正式构建时整段被移除，演示数据不会进入产物。
 */

import * as api from './api';
import type { FileItem, Note, Summary } from './types';

export const CONTENT_SOURCE: 'official' | 'demo' =
  import.meta.env.VITE_CONTENT_SOURCE === 'demo' ? 'demo' : 'official';

/** 页面据此显示「演示内容」标注 */
export const isDemo = CONTENT_SOURCE === 'demo';

export { ApiRequestError } from './api';

/* 必须直接写 import.meta.env 比较，打包器才能在编译期判定并剔除 demo 分支 */
const demo = import.meta.env.VITE_CONTENT_SOURCE === 'demo' ? import('./localSource') : null;

interface Source {
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  listSummaries(): Promise<Summary[]>;
  getSummary(id: string): Promise<Summary | undefined>;
  listFiles(): Promise<FileItem[]>;
  getFile(id: string): Promise<FileItem | undefined>;
}
const source = (): Promise<Source> => (demo ?? Promise.resolve(api));

export const listNotes = async (): Promise<Note[]> => (await source()).listNotes();
export const getNote = async (id: string): Promise<Note | undefined> => (await source()).getNote(id);
export const listSummaries = async (): Promise<Summary[]> => (await source()).listSummaries();
export const getSummary = async (id: string): Promise<Summary | undefined> =>
  (await source()).getSummary(id);
export const listFiles = async (): Promise<FileItem[]> => (await source()).listFiles();
export const getFile = async (id: string): Promise<FileItem | undefined> => (await source()).getFile(id);
