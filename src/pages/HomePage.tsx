import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';

/** 首页（设计文档 §7）：只有壁纸和导航，主体留白即完整设计。 */
export function HomePage() {
  useDocumentTitle();
  return <ContentPanel variant="home" />;
}