import { PROXIMITY_RADIUS } from '../types/constants';

export const PROXIMITY_EXIT_BUFFER = 18;
export const PROXIMITY_EXIT_RADIUS = PROXIMITY_RADIUS + PROXIMITY_EXIT_BUFFER;

export function resolveSelfAnchor(currentUser, players, localPosition) {
  if (!currentUser) return null;

  return players.find((player) => player.userId === currentUser.userId) || {
    userId: currentUser.userId,
    x: localPosition?.x ?? currentUser.spawnX ?? currentUser.x ?? 0,
    y: localPosition?.y ?? currentUser.spawnY ?? currentUser.y ?? 0,
  };
}

export function getProximityCandidates(currentUser, players, localPosition) {
  const self = resolveSelfAnchor(currentUser, players, localPosition);
  if (!self) return [];

  return players
    .filter((player) => player.userId !== currentUser.userId)
    .map((player) => ({
      ...player,
      distance: Math.hypot(player.x - self.x, player.y - self.y),
    }))
    .sort((a, b) => a.distance - b.distance);
}
