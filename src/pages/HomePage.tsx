import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { CosmicScene, type CosmicSceneName } from '../components/art/CosmicScene';
import { worlds, worldOrder } from '../config/worlds';

/** 一座私人星图：从自我介绍出发，通往收藏、笔记与文章。 */
export function HomePage() {
  useDocumentTitle();

  return (
    <ContentPanel variant="home">
      <div className="personal-home">
        <section className="personal-hero" aria-labelledby="home-title">
          <div className="personal-hero-grid" aria-hidden="true" />
          <div className="personal-hero-copy">
            <p className="personal-overline">ENTROAXIOM <span aria-hidden="true">✦</span> 一个人的宇宙</p>
            <h1 id="home-title">在无序中，<br />寻找属于自己的<span>星图。</span></h1>
            <p className="personal-intro">你好，欢迎来到我的个人网站。这里收藏我遇见的知识，也记录我在学习、阅读与思考中留下的轨迹。</p>
            <div className="personal-actions">
              <a className="personal-primary" href="#explore">开始探索 <span aria-hidden="true">↗</span></a>
              <span className="personal-action-note">向未知，建立坐标</span>
            </div>
          </div>
          <div className="personal-hero-visual" aria-hidden="true">
            <CosmicScene scene="armillary" />
          </div>
          <div className="personal-hero-bottom" aria-hidden="true">
            <span>PRIVATE UNIVERSE / EST. IN CURIOSITY</span>
            <span>向下探索 <span className="personal-down">↓</span></span>
          </div>
        </section>

        <section className="personal-manifesto" aria-labelledby="manifesto-title">
          <div className="personal-manifesto-art" aria-hidden="true"><CosmicScene scene="edgeon" /></div>
          <div className="personal-manifesto-copy">
            <p className="personal-overline">关于这个空间</p>
            <h2 id="manifesto-title">以好奇为引力，<br />让思想有迹可循。</h2>
            <p>我相信，思考不必总有终点。散落的资料、尚未完成的笔记、读完一篇文章后的感触，都值得被认真保存。</p>
            <p>于是有了这座小小的私人观测站。它不试图解释整个宇宙，只诚实地记录我看见的那一部分。</p>
            <span className="personal-signature">entroaxiom <span aria-hidden="true">✧</span></span>
          </div>
        </section>

        <section className="personal-explore" id="explore" aria-labelledby="explore-title">
          <div className="personal-section-heading">
            <div>
              <p className="personal-overline">我的星图 / 三条航线</p>
              <h2 id="explore-title">从这里，继续航行。</h2>
            </div>
            <p>每一次收藏、记录与总结，<br />都是为未知点亮一颗星。</p>
          </div>
          <div className="personal-paths">
            {worldOrder.map((key, index) => {
              const world = worlds[key];
              const scenes: CosmicSceneName[] = ['horizon', 'corona', 'lens'];
              return (
                <Link className="personal-path" to={world.path} key={key}>
                  <span className="personal-path-index">0{index + 1} / 03</span>
                  <span className="personal-path-image"><CosmicScene scene={scenes[index]} /></span>
                  <span className="personal-path-content">
                    <span className="personal-path-english">{world.name}</span>
                    <strong>{world.module}</strong>
                    <span className="personal-path-description">{world.description}</span>
                  </span>
                  <span className="personal-path-arrow" aria-hidden="true">↗</span>
                </Link>
              );
            })}
          </div>
        </section>
        <footer className="personal-footer"><span>✦ ENTROAXIOM</span><span>在无序的熵变中，确立自己的公理。</span><a href="#main">回到星图之上 ↑</a></footer>
      </div>
    </ContentPanel>
  );
}
