interface SessionCounter {
  hourCount: number;
  dayCount: number;
  hourReset: number; // timestamp ms
  dayReset: number; // timestamp ms
}

const counters = new Map<string, SessionCounter>();

function getCounter(sessionId: string): SessionCounter {
  const now = Date.now();
  const existing = counters.get(sessionId);

  if (!existing) {
    const counter: SessionCounter = {
      hourCount: 0,
      dayCount: 0,
      hourReset: now + 60 * 60 * 1000,
      dayReset: now + 24 * 60 * 60 * 1000,
    };
    counters.set(sessionId, counter);
    return counter;
  }

  // reset jika sudah lewat window
  if (now > existing.hourReset) {
    existing.hourCount = 0;
    existing.hourReset = now + 60 * 60 * 1000;
  }

  if (now > existing.dayReset) {
    existing.dayCount = 0;
    existing.dayReset = now + 24 * 60 * 60 * 1000;
  }

  return existing;
}

export function incrementCounter(sessionId: string): void {
  const counter = getCounter(sessionId);
  counter.hourCount++;
  counter.dayCount++;
}

export function getCount(sessionId: string): { hour: number; day: number } {
  const counter = getCounter(sessionId);
  return { hour: counter.hourCount, day: counter.dayCount };
}

export function resetCounter(sessionId: string): void {
  counters.delete(sessionId);
}
