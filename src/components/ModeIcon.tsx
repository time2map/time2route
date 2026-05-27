import BikeIcon from './icons/BikeIcon';
import WalkIcon from './icons/WalkIcon';
import type { ActivityMode } from '../utils/types';

export function ModeIcon({ mode }: Readonly<{ mode: ActivityMode }>) {
  if (mode === 'walk') {
    return <WalkIcon />;
  }
  return <BikeIcon />;
}
