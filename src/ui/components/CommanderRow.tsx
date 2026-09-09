import type { CardRef } from '../../domain/types';
import { CardImage } from './CardImage';

type CommanderRowProps = {
  commander: CardRef;
  subtitle?: string;
  size?: number;
};

export function CommanderRow({ commander, subtitle, size = 44 }: CommanderRowProps) {
  return (
    <div className="art-row">
      <CardImage src={commander.artCrop} name={commander.name} size={size} radius={8} />
      <div className="name">
        {commander.name}
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
    </div>
  );
}
