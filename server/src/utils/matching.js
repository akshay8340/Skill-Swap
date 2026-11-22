// Skill matching + slot suggestion logic.
//
// Match score (0-100), fully explainable in a viva:
//   25  they teach something I want        (learn)
//   25  I teach something they want        (teach)  -> both = "mutual swap"
//   30  weekly availability overlap        (10+ common hours = full marks)
//   20  their rating                       (unrated users get a neutral 3/5 prior)

export const norm = (s) => String(s).trim().toLowerCase();

export function overlapHours(a, b) {
  let total = 0;
  for (const x of a.availability) {
    for (const y of b.availability) {
      if (x.day !== y.day) continue;
      total += Math.max(0, Math.min(x.end, y.end) - Math.max(x.start, y.start));
    }
  }
  return total;
}

export function scoreMatch(me, other) {
  const myWanted = new Set(me.wanted.map(norm));
  const theirWanted = new Set(other.wanted.map(norm));

  const learn = other.offered.filter((s) => myWanted.has(norm(s.name))).map((s) => s.name);
  const teach = me.offered.filter((s) => theirWanted.has(norm(s.name))).map((s) => s.name);
  if (!learn.length && !teach.length) return null;

  const overlap = overlapHours(me, other);
  const ratingValue = other.ratingCount ? other.ratingAvg : 3;

  const breakdown = {
    learn: learn.length ? 25 : 0,
    teach: teach.length ? 25 : 0,
    availability: Math.round(Math.min(overlap, 10) * 3),
    rating: Math.round((ratingValue / 5) * 20),
  };
  const score = breakdown.learn + breakdown.teach + breakdown.availability + breakdown.rating;

  return {
    // Fee details are deliberately left out of list views; they show only on the booking page.
    user: {
      _id: other._id,
      name: other.name,
      programme: other.programme,
      department: other.department,
      year: other.year,
      bio: other.bio,
      ratingAvg: other.ratingAvg,
      ratingCount: other.ratingCount,
      offered: other.offered.map((s) => ({ name: s.name, category: s.category, level: s.level, topics: s.topics })),
      wanted: other.wanted,
    },
    score,
    mutual: learn.length > 0 && teach.length > 0,
    learn,
    teach,
    overlapHours: overlap,
    breakdown,
  };
}

// Next free 1-hour slots (within `days`) where both users are available and neither has a booked session.
export function suggestSlots(a, b, busySessions, days = 14, limit = 12) {
  const now = new Date();
  const seen = new Set();
  const out = [];

  for (let d = 0; d < days && out.length < limit; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);
    date.setHours(0, 0, 0, 0);
    const dow = date.getDay();

    for (const x of a.availability.filter((s) => s.day === dow)) {
      for (const y of b.availability.filter((s) => s.day === dow)) {
        const from = Math.max(x.start, y.start);
        const to = Math.min(x.end, y.end);
        for (let h = from; h + 1 <= to; h++) {
          const start = new Date(date);
          start.setHours(h);
          if (start <= now) continue;
          const end = new Date(start.getTime() + 3600000);
          const clash = busySessions.some((s) => {
            const sEnd = new Date(s.startsAt.getTime() + s.durationHours * 3600000);
            return s.startsAt < end && sEnd > start;
          });
          const key = start.toISOString();
          if (!clash && !seen.has(key)) {
            seen.add(key);
            out.push({ startsAt: key });
          }
        }
      }
    }
  }
  return out.sort((p, q) => p.startsAt.localeCompare(q.startsAt)).slice(0, limit);
}
