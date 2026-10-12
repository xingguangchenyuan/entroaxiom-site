import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { GalaxyBackdrop } from '../components/layout/GalaxyBackdrop';
import { worlds, worldOrder, type WorldKey } from '../config/worlds';

/** 三个知识模块化为三枚可切换的抽象星象印记。 */
export function HomePage() {
  useDocumentTitle();
  const [featured, setFeatured] = useState<WorldKey>('earth');
  const world = worlds[featured];
  const others = worldOrder.filter((key) => key !== featured);

  return (
    <ContentPanel variant="home">
      <section className="galaxy-home" aria-label="探索知识星系">
        <GalaxyBackdrop featured={featured} />
        <div className="galaxy-feature-art" key={featured} aria-hidden="true">
          <div className="galaxy-feature-orbit" />
          <img src={world.symbol} alt="" />
        </div>
        <div className="galaxy-observatory" aria-hidden="true">
          <div className="galaxy-observatory-ring galaxy-observatory-ring-outer" />
          <div className="galaxy-observatory-ring galaxy-observatory-ring-inner" />
          <div className="galaxy-observatory-crosshair" />
        </div>
        <div className="galaxy-hero" key={featured}>
          <span className="galaxy-eyebrow">ENTROAXIOM / {world.tag}</span>
          <div className="galaxy-coordinate" aria-hidden="true">INDEX / {String(worldOrder.indexOf(featured) + 1).padStart(2, '0')} <span>✦</span> KNOWLEDGE ATLAS</div>
          <h1 className="galaxy-headline">{world.name}</h1>
          <span className="galaxy-rule" aria-hidden="true" />
          <h2 className="galaxy-module-name">{world.module}</h2>
          <p className="galaxy-description">{world.description}</p>
          <Link className="galaxy-explore" to={world.path}>探索{world.module}<span aria-hidden="true"> ↗</span></Link>
        </div>
        <div className="galaxy-satellites" aria-label="切换知识星象">
          {others.map((key) => (
            <button
              key={key}
              className={`galaxy-satellite galaxy-satellite-${key}`}
              type="button"
              onClick={() => setFeatured(key)}
              aria-label={`切换至${worlds[key].module}，${worlds[key].name}`}
            >
              <img src={worlds[key].symbol} alt="" loading="lazy" />
              <span className="galaxy-satellite-label">{worlds[key].name}<small>{worlds[key].module}</small></span>
            </button>
          ))}
        </div>
        <div className="galaxy-instrument" aria-hidden="true">
          <span className="galaxy-instrument-caption">SIGNAL / KNOWLEDGE ATLAS</span>
          <div className="galaxy-instrument-scale">
            <div className="galaxy-instrument-track">
              {Array.from({ length: 2 }, (_, set) => (
                <span className="galaxy-instrument-set" key={set}>
                  {Array.from({ length: 61 }, (_, tick) => <i key={tick} className={tick % 5 === 0 ? 'major' : ''} />)}
                </span>
              ))}
            </div>
          </div>
          <span className="galaxy-instrument-readout">{String(worldOrder.indexOf(featured) + 1).padStart(2, '0')} / 03</span>
        </div>
      </section>
    </ContentPanel>
  );
}
