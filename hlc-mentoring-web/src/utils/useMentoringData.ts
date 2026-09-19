import { useMemo } from 'react';
import {
  canViewNextQuarter,
  getQuarter,
  parseCycleQuarter,
  quarterKey
} from './dateHelpers';

export interface MentoringPair {
  _id?: string;
  pairId: string;
  cycleId: string;
  [key: string]: unknown;
}

export function useMentoringData(
  allPairs: MentoringPair[] | null | undefined,
  now = new Date()
) {
  return useMemo(() => {
    const currentQuarter = getQuarter(now);
    const currentKey = quarterKey(currentQuarter);
    const nextKey = currentKey + 1;
    const nextQuarterVisible = canViewNextQuarter(now);
    const pastPairs: MentoringPair[] = [];
    const currentPairs: MentoringPair[] = [];
    const nextPairs: MentoringPair[] = [];

    for (const pair of allPairs || []) {
      const pairQuarter = parseCycleQuarter(pair.cycleId);
      if (!pairQuarter) continue;

      const pairKey = quarterKey(pairQuarter);
      if (pairKey < currentKey) {
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
  }, [allPairs, now]);
}
