import { useMemo } from 'react';
import {
  canViewNextQuarter,
  getCurrentQuarter,
  isPastQuarter,
  parseCycleQuarter,
  quarterKey
} from './dateHelpers';

export interface MentoringPair {
  _id?: string;
  pairId: string;
  cycleId: string;
  [key: string]: unknown;
}

export interface CategorizedPairs {
  pastPairs: MentoringPair[];
  currentPairs: MentoringPair[];
  nextPairs: MentoringPair[];
  isNextQuarterVisible: boolean;
  currentQuarter: ReturnType<typeof getCurrentQuarter>;
  currentCycleId: string;
}

function getNearestCurrentOrUpcomingCycleId(
  pairs: MentoringPair[] | null | undefined,
  now: Date
) {
  const currentKey = quarterKey(getCurrentQuarter(now));
  return [...new Set((pairs || []).map((pair) => pair.cycleId))]
    .map((cycleId) => ({ cycleId, quarter: parseCycleQuarter(cycleId) }))
    .filter((item) => item.quarter && quarterKey(item.quarter) >= currentKey)
    .sort((left, right) => quarterKey(left.quarter!) - quarterKey(right.quarter!))[0]?.cycleId;
}

export function categorizePairs(
  pairs: MentoringPair[] | null | undefined,
  now = new Date(),
  selectedCycleId?: string
): CategorizedPairs {
  const selectedQuarter = parseCycleQuarter(
    selectedCycleId || getNearestCurrentOrUpcomingCycleId(pairs, now)
  );
  const currentQuarter = selectedQuarter || getCurrentQuarter(now);
  const currentKey = quarterKey(currentQuarter);
  const nextKey = currentKey + 1;
  const nextQuarterVisible = !selectedQuarter && canViewNextQuarter(now);
  const pastPairs: MentoringPair[] = [];
  const currentPairs: MentoringPair[] = [];
  const nextPairs: MentoringPair[] = [];

  console.log('[pairs:categorize] Current Quarter Calculated:', currentQuarter);
  console.log('[pairs:categorize] Current cycle key:', currentKey);

  for (const pair of pairs || []) {
    const pairQuarter = parseCycleQuarter(pair.cycleId);
    console.log('[pairs:categorize] Item Quarter:', {
      pairId: pair.pairId,
      cycleId: pair.cycleId,
      parsedQuarter: pairQuarter,
      itemKey: pairQuarter ? quarterKey(pairQuarter) : null
    });
    if (!pairQuarter) continue;

    const pairKey = quarterKey(pairQuarter);
    if (isPastQuarter(pairQuarter, currentQuarter)) {
      pastPairs.push(pair);
    } else if (pairKey === currentKey) {
      currentPairs.push(pair);
    } else if (pairKey === nextKey) {
      nextPairs.push(pair);
      if (nextQuarterVisible) currentPairs.push(pair);
    }
  }

  return {
    pastPairs,
    currentPairs,
    nextPairs: nextQuarterVisible ? nextPairs : [],
    isNextQuarterVisible: nextQuarterVisible,
    currentQuarter,
    currentCycleId: `${currentQuarter.year}Q${currentQuarter.quarter}`
  };
}

export function useMentoringData(
  allPairs: MentoringPair[] | null | undefined,
  now = new Date(),
  selectedCycleId?: string
) {
  return useMemo(
    () => categorizePairs(allPairs, now, selectedCycleId),
    [allPairs, now, selectedCycleId]
  );
}
