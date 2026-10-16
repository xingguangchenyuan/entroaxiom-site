import { Component, type ReactNode } from 'react';
import { copy } from '../../config/site';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** 全局错误边界：渲染期异常时给出兜底页，而不是整页白屏 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main id="main" className="page">
          <div className="state-error state-error--boundary">
            <p className="state-title">{copy.errorBoundary.title}</p>
            <p className="state-text">{copy.errorBoundary.desc}</p>
            <a
              className="state-action"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
            >
              {copy.notFound.backHome}
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
