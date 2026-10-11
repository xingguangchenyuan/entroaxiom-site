import { copy } from '../../config/site';

/** 跳到主要内容（设计文档 §13.2：页面首个可聚焦元素） */
export function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      {copy.skipToContent}
    </a>
  );
}