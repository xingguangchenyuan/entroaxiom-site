import { worlds, type WorldKey } from '../../config/worlds';

/** Shared abstract sky, with a distinct constellation for each knowledge module. */
export function GalaxyBackdrop({ featured }: { featured: WorldKey }) {
  return (
    <div className={`galaxy-backdrop galaxy-backdrop-${featured}`} aria-hidden="true">
      <div className="galaxy-backdrop-halo" />
      <div className="galaxy-backdrop-grain" />
      <div className="galaxy-backdrop-grid" />
      <div className="galaxy-backdrop-constellation">{worlds[featured].motif}</div>
    </div>
  );
}
