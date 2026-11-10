export interface OperationProgress {
  index: number;
  progress: number;
}

/** Advance the teaching clock without crossing an unresolved dependency. */
export function advanceOperation(
  current: OperationProgress,
  increment: number,
  steps: number,
  holdAt?: number,
): OperationProgress {
  if (holdAt !== undefined && current.index >= holdAt) {
    const progress = Math.min(0.64, current.progress + increment);
    return progress === current.progress ? current : { ...current, progress };
  }
  const progress = current.progress + increment;
  return progress >= 1
    ? { index: (current.index + 1) % steps, progress: progress % 1 }
    : { ...current, progress };
}
