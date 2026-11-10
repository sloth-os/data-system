export interface LabelAnchor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}
export interface PlacedLabel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Bounds {
  width: number;
  height: number;
  top: number;
  bottom: number;
  margin: number;
}
const intersects = (a: PlacedLabel, b: PlacedLabel, gap = 5) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

/** Screen-space label layout; selected components and active exchanges win space first. */
export function placeLabels(
  anchors: LabelAnchor[],
  bounds: Bounds,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(Math.max(lo, hi), n));
  for (const item of [...anchors].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
  )) {
    const preferredX = item.x - item.width / 2,
      preferredY = item.y - item.height;
    const candidate = (x: number, y: number): PlacedLabel => ({
      id: item.id,
      x: clamp(x, bounds.margin, bounds.width - bounds.margin - item.width),
      y: clamp(y, bounds.top, bounds.height - bounds.bottom - item.height),
      width: item.width,
      height: item.height,
    });
    const cost = (rect: PlacedLabel) =>
      (rect.x - preferredX) ** 2 + (rect.y - preferredY) ** 2 * 1.2;
    const choices: PlacedLabel[] = [];
    for (const dy of [0, -1, 1, -2, 2, -3, 3, -4, 4])
      for (const dx of [0, -0.55, 0.55, -1.1, 1.1, -1.65, 1.65])
        choices.push(
          candidate(
            preferredX + dx * (item.width + 6),
            preferredY + dy * (item.height + 9),
          ),
        );
    choices.sort((a, b) => cost(a) - cost(b));
    let spot = choices.find((rect) =>
      placed.every((other) => !intersects(rect, other)),
    );
    if (!spot) {
      // Search spare screen space before accepting any overlap on a tiny viewport.
      const spare: PlacedLabel[] = [];
      for (
        let y = bounds.top;
        y <= bounds.height - bounds.bottom - item.height;
        y += 12
      )
        for (
          let x = bounds.margin;
          x <= bounds.width - bounds.margin - item.width;
          x += 12
        )
          spare.push(candidate(x, y));
      spare.sort((a, b) => cost(a) - cost(b));
      spot = spare.find((rect) =>
        placed.every((other) => !intersects(rect, other)),
      );
    }
    if (!spot) {
      // A greedy placement can fragment an otherwise usable small viewport.
      // Repack the complete set into centered shelves; leader lines retain
      // the relation to the original 3D anchors.
      const gap = 6;
      const cellWidth = Math.max(...anchors.map((a) => a.width));
      const cellHeight = Math.max(...anchors.map((a) => a.height));
      const columns = Math.max(
        1,
        Math.floor(
          (bounds.width - bounds.margin * 2 + gap) / (cellWidth + gap),
        ),
      );
      const rows = Math.ceil(anchors.length / columns);
      const shelfHeight = rows * (cellHeight + gap) - gap;
      const startX = Math.max(
        bounds.margin,
        (bounds.width - columns * (cellWidth + gap) + gap) / 2,
      );
      const startY = clamp(
        anchors.reduce((sum, a) => sum + a.y, 0) / anchors.length -
          shelfHeight / 2,
        bounds.top,
        bounds.height - bounds.bottom - shelfHeight,
      );
      return [...anchors]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((a, index) => ({
          id: a.id,
          x:
            startX +
            (index % columns) * (cellWidth + gap) +
            (cellWidth - a.width) / 2,
          y: startY + Math.floor(index / columns) * (cellHeight + gap),
          width: a.width,
          height: a.height,
        }));
    }
    placed.push(spot);
  }
  return placed;
}
