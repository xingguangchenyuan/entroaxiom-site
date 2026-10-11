import type { FileItem } from '../types';

/**
 * 演示文件清单（设计文档 §9.5）
 * 只读 project 内 public/demo-assets/ 下的本地资源（src 字段），
 * 供演示模式预览/下载。正式模式不会加载本文件。
 */
export const demoFiles: FileItem[] = [
  {
    id: 'demo-image-1',
    name: 'demo-image-1.png',
    ext: 'png',
    kind: 'image',
    size: 57573,
    updatedAt: '2024-05-12',
    src: '/demo-assets/demo-image-1.png',
    description: '演示用图片，可在页面内直接预览。',
  },
  {
    id: 'demo-guide',
    name: 'demo-guide.pdf',
    ext: 'pdf',
    kind: 'pdf',
    size: 741,
    updatedAt: '2024-05-12',
    src: '/demo-assets/demo-guide.pdf',
    description: '演示用 PDF，支持内嵌预览，不可用时提供回退。',
  },
  {
    id: 'demo-archive',
    name: 'demo-archive.zip',
    ext: 'zip',
    kind: 'archive',
    size: 320,
    updatedAt: '2024-05-12',
    src: '/demo-assets/demo-archive.zip',
    description: '演示用压缩包，仅展示基本信息。',
  },
  {
    id: 'demo-report',
    name: 'demo-report.docx',
    ext: 'docx',
    kind: 'doc',
    size: 932,
    updatedAt: '2024-05-12',
    src: '/demo-assets/demo-report.docx',
    description: '演示用 Word 文档，仅展示基本信息。',
  },
  {
    id: '2024-project-materials-backup',
    name: '2024年度项目学习材料整理清单与进度跟踪备份_最终版_勿删.txt',
    ext: 'txt',
    kind: 'other',
    size: 110,
    updatedAt: '2024-05-12',
    src: '/demo-assets/2024年度项目学习材料整理清单与进度跟踪备份_最终版_勿删.txt',
    description: '超长文件名，用于验证列表内换行不撑破布局。',
  },
];