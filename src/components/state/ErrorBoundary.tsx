import { Component, type ReactNode } from 'react';
import { copy } from '../../config/site';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * 全局错误边界（设计文档 §13）：渲染期异常时展示兜底页，
 * 并把页面清理回可用裸布局（不必整页白屏）。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="state-error">
          <div className="state-error-inner">
            <p className="state-error-title">{copy.errorBoundary.title}</p>
            <p className="state-error-desc">{copy.errorBoundary.desc}</p>
            <a
              className="state-action"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                this.handleReset();
                window.location.href = '/';
              }}
            >
              {copy.notFound.backHome}
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}