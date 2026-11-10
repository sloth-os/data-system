export interface Point {
  x: number;
  z: number;
}
export interface Obstacle extends Point {
  radius: number;
}
export const worldBounds = { minX: -12.5, maxX: 12.5, minZ: -6.4, maxZ: 6.5 };
export const playerRadius = 0.32;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function isWalkable(p: Point, obstacles: Obstacle[]) {
  return (
    p.x >= worldBounds.minX &&
    p.x <= worldBounds.maxX &&
    p.z >= worldBounds.minZ &&
    p.z <= worldBounds.maxZ &&
    obstacles.every((o) => distance(p, o) >= o.radius + playerRadius)
  );
}
export function movePlayer(
  p: Point,
  delta: Point,
  obstacles: Obstacle[],
): Point {
  const full = { x: p.x + delta.x, z: p.z + delta.z };
  if (isWalkable(full, obstacles)) return full;
  const x = { x: full.x, z: p.z };
  if (isWalkable(x, obstacles)) return x;
  const z = { x: p.x, z: full.z };
  return isWalkable(z, obstacles) ? z : p;
}
export function stationApproach(
  station: Point,
  from: Point,
  obstacles: Obstacle[],
): Point {
  const choices = Array.from({ length: 16 }, (_, i) => ({
    x: station.x + Math.cos((i * Math.PI) / 8) * 2.45,
    z: station.z + Math.sin((i * Math.PI) / 8) * 2.45,
  })).filter((p) => isWalkable(p, obstacles));
  return (
    choices.sort((a, b) => distance(a, from) - distance(b, from))[0] || from
  );
}
/** Grid A* keeps click/touch navigation around component collision footprints. */
export function findPath(
  start: Point,
  goal: Point,
  obstacles: Obstacle[],
): Point[] {
  const cell = 0.45,
    minX = worldBounds.minX,
    minZ = worldBounds.minZ,
    columns = Math.floor((worldBounds.maxX - minX) / cell) + 1,
    rows = Math.floor((worldBounds.maxZ - minZ) / cell) + 1;
  const key = (x: number, z: number) => z * columns + x;
  const point = (id: number): Point => ({
    x: minX + (id % columns) * cell,
    z: minZ + Math.floor(id / columns) * cell,
  });
  const closest = (p: Point) => {
    const x = Math.max(
        0,
        Math.min(columns - 1, Math.round((p.x - minX) / cell)),
      ),
      z = Math.max(0, Math.min(rows - 1, Math.round((p.z - minZ) / cell)));
    return key(x, z);
  };
  let target = closest(goal);
  if (!isWalkable(point(target), obstacles)) {
    const candidates = Array.from(
      { length: columns * rows },
      (_, i) => i,
    ).filter((i) => isWalkable(point(i), obstacles));
    target =
      candidates.sort(
        (a, b) => distance(point(a), goal) - distance(point(b), goal),
      )[0] ?? target;
  }
  const origin = closest(start),
    open = new Set([origin]),
    came = new Map<number, number>(),
    cost = new Map([[origin, 0]]),
    estimate = new Map([[origin, distance(point(origin), point(target))]]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const f = estimate.get(id) ?? Infinity;
      if (f < best) {
        best = f;
        current = id;
      }
    }
    if (current === target) {
      const route: Point[] = [];
      while (current !== origin) {
        route.push(point(current));
        current = came.get(current)!;
      }
      return route.reverse();
    }
    open.delete(current);
    const x = current % columns,
      z = Math.floor(current / columns);
    for (const [dx, dz] of dirs) {
      const nx = x + dx,
        nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) continue;
      const next = key(nx, nz),
        p = point(next);
      if (!isWalkable(p, obstacles)) continue;
      if (
        dx &&
        dz &&
        (!isWalkable(point(key(x + dx, z)), obstacles) ||
          !isWalkable(point(key(x, z + dz)), obstacles))
      )
        continue;
      const nextCost =
        (cost.get(current) ?? Infinity) + cell * Math.hypot(dx, dz);
      if (nextCost >= (cost.get(next) ?? Infinity)) continue;
      came.set(next, current);
      cost.set(next, nextCost);
      estimate.set(next, nextCost + distance(p, point(target)));
      open.add(next);
    }
  }
  return [];
}
