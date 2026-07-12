// Ports app.js's recent-search localStorage helpers (saveRecentSearch /
// saveRecentSearchMC / the read+filter logic inside renderRecentSearches).
// Same storage keys and same record shape so a search saved by the old
// static site and one saved here are interchangeable.
//
// fw_searches    → array (max 5) of {orig,dest,dep,ret,origC,destC,time}
// fw_searches_mc → single-element array of {legs:[{orig,dest,dep,origC,destC}],time}

const KEY = 'fw_searches';
const KEY_MC = 'fw_searches_mc';

function readJSON(key) {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

// Ports saveRecentSearch(): de-dupe by orig/dest, newest first, keep 5.
export function saveRecentSearch({ orig, dest, dep, ret, origC, destC }) {
  if (typeof localStorage === 'undefined' || !orig || !dest) return;
  try {
    let list = readJSON(KEY).filter((s) => s.orig !== orig || s.dest !== dest);
    list.unshift({ orig, dest, dep: dep || '', ret: ret || '', origC: origC || orig, destC: destC || dest, time: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
  } catch { /* ignore quota/serialization errors, matching the original */ }
}

// Ports saveRecentSearchMC(): store just the latest multi-city trip.
export function saveRecentSearchMC(legs) {
  if (typeof localStorage === 'undefined' || !legs || !legs.length) return;
  try {
    const record = {
      legs: legs.map((l) => ({ orig: l.orig, dest: l.dest, dep: l.dep, origC: l.origC || l.orig, destC: l.destC || l.dest })),
      time: Date.now(),
    };
    localStorage.setItem(KEY_MC, JSON.stringify([record]));
  } catch { /* ignore */ }
}

// Ports renderRecentSearches()'s read+filter for the one-way/round-trip
// case: drop entries whose departure date is already in the past, then
// return the single most-recent one (or null).
export function readMostRecentSearch() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const list = readJSON(KEY).filter((s) => {
    if (!s.dep) return true;
    return new Date(s.dep + 'T00:00:00') >= today;
  });
  return list.length ? list[0] : null;
}

// Ports the multi-city branch: return the stored trip's legs (or null).
export function readMostRecentSearchMC() {
  const list = readJSON(KEY_MC);
  if (!list.length || !list[0].legs || !list[0].legs.length) return null;
  return list[0];
}
