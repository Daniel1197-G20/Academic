/**
 * src/lib/search/userSearchEngine.js
 *
 * Case-insensitive, flexible search and deterministic ranking engine for Studora user discovery.
 * Designed according to Studora Smart User Search requirements:
 *
 * Ranking Hierarchy:
 * Priority 1: Exact full-name match (normalized)
 * Priority 2: Exact first-name or surname match (or strong prefix / token match)
 * Priority 3: Strong partial-name match (contains query or all query tokens in full name)
 * Priority 4: Minor spelling / fuzzy match or common variation (Levenshtein distance <= 2)
 * Priority 5: Related public-profile keyword match (institution, department, academic level, role)
 *
 * Privacy & Security Rules:
 * - Operates strictly on approved public profile fields: full_name, avatar_url, institution, department, academic_level, role.
 * - Never touches or returns private attributes (emails, phone numbers, passwords, matric numbers).
 */

// Well-established common academic & Anglo/Nigerian name variations
const COMMON_NAME_VARIATIONS = {
  john: ['jonathan', 'johnny', 'jon'],
  jonathan: ['john', 'jon'],
  jon: ['john', 'jonathan'],
  alex: ['alexander', 'alexandra', 'alexis'],
  alexander: ['alex', 'alec'],
  sam: ['samuel', 'samantha'],
  samuel: ['sam', 'sammy'],
  mike: ['michael'],
  michael: ['mike', 'mick'],
  dani: ['daniel', 'danielle'],
  daniel: ['dan', 'dani'],
  chris: ['christopher', 'christian'],
  christopher: ['chris'],
  emmanuel: ['emman', 'manny'],
  ibrahim: ['abrahim', 'abraham'],
  mohammed: ['muhammad', 'mohamed', 'mohammad']
};

/**
 * Normalizes text: trims, collapses multiple spaces, converts to lowercase.
 */
export function normalizeText(text) {
  if (!text) return '';
  return String(text).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Computes Levenshtein distance between two normalized strings.
 */
export function levenshteinDistance(s1, s2) {
  const a = normalizeText(s1);
  const b = normalizeText(s2);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = [];
  for (let i = 0; i <= b.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Checks whether s1 and s2 are close enough to be a minor spelling variation (fuzzy match).
 * Allows Levenshtein distance 1 for words length >= 3, or distance 2 for words >= 6.
 */
export function isFuzzyNameMatch(token1, token2) {
  const t1 = normalizeText(token1);
  const t2 = normalizeText(token2);
  if (t1 === t2) return true;
  if (Math.abs(t1.length - t2.length) > 2) return false;
  if (t1.length < 3 || t2.length < 3) return false;

  const maxDist = Math.max(t1.length, t2.length) >= 6 ? 2 : 1;
  return levenshteinDistance(t1, t2) <= maxDist;
}

/**
 * Evaluates the match priority for a user profile against a query.
 * Returns: { priority: number (1..5 or Infinity if no match), matchReason: string, matchedField: string }
 */
export function scoreUserProfileMatch(profile, rawQuery) {
  const query = normalizeText(rawQuery);
  if (!query) {
    return { priority: Infinity, matchReason: 'Empty query', matchedField: null };
  }

  const fullName = normalizeText(profile?.full_name);
  const institution = normalizeText(profile?.institution);
  const department = normalizeText(profile?.department);
  const academicLevel = normalizeText(profile?.academic_level);
  const role = normalizeText(profile?.role);

  const nameTokens = fullName.split(' ').filter(Boolean);
  const queryTokens = query.split(' ').filter(Boolean);

  // ── Priority 1: Exact full-name match ──
  if (fullName === query) {
    return { priority: 1, matchReason: 'Exact full name match', matchedField: 'full_name' };
  }

  // ── Priority 2: Exact first-name, surname, or direct name token match ──
  // Check if any individual name token is exactly equal to the query
  const hasExactTokenMatch = nameTokens.some((t) => t === query);
  // Or if query is prefix of first/last name (e.g. "john" in "john okafor")
  const isPrefixOfAnyToken = nameTokens.some((t) => t.startsWith(query));
  if (hasExactTokenMatch || (query.length >= 3 && isPrefixOfAnyToken && queryTokens.length === 1)) {
    return { priority: 2, matchReason: 'Exact name token or prefix match', matchedField: 'full_name' };
  }

  // ── Priority 3: Strong partial-name match ──
  // Contains full query string, or all query tokens match name tokens
  const containsQuery = fullName.includes(query);
  const allQueryTokensInName = queryTokens.length > 1 && queryTokens.every((qt) =>
    nameTokens.some((nt) => nt.startsWith(qt) || nt.includes(qt))
  );

  if (containsQuery || allQueryTokensInName) {
    return { priority: 3, matchReason: 'Strong partial name match', matchedField: 'full_name' };
  }

  // ── Priority 4: Minor spelling variation / fuzzy match / known variation ──
  // Check known name variations (e.g. John -> Jonathan)
  const knownVariations = COMMON_NAME_VARIATIONS[query] || [];
  const matchesKnownVariation = nameTokens.some((nt) => knownVariations.includes(nt));

  // Check fuzzy distance on name tokens
  const matchesFuzzy = nameTokens.some((nt) =>
    queryTokens.some((qt) => isFuzzyNameMatch(nt, qt))
  );

  if (matchesKnownVariation || matchesFuzzy) {
    return {
      priority: 4,
      matchReason: matchesKnownVariation ? 'Name variation match' : 'Fuzzy spelling match',
      matchedField: 'full_name'
    };
  }

  // ── Priority 5: Related public-profile keyword match ──
  // Department match
  if (department && (department.includes(query) || queryTokens.every((qt) => department.includes(qt)))) {
    return { priority: 5, matchReason: `Department match (${profile.department})`, matchedField: 'department' };
  }

  // Institution match
  if (institution && (institution.includes(query) || queryTokens.every((qt) => institution.includes(qt)))) {
    return { priority: 5, matchReason: `Institution match (${profile.institution})`, matchedField: 'institution' };
  }

  // Academic level match
  if (academicLevel && academicLevel.includes(query)) {
    return { priority: 5, matchReason: `Academic level match (${profile.academic_level})`, matchedField: 'academic_level' };
  }

  // Role match (e.g. "tutor")
  if (role && role === query) {
    return { priority: 5, matchReason: `Role match (${profile.role})`, matchedField: 'role' };
  }

  // No verified match
  return { priority: Infinity, matchReason: 'No match', matchedField: null };
}

/**
 * Filters and deterministically ranks user profile results according to priority.
 *
 * Ranking criteria:
 * 1. Match Priority (1 -> 5)
 * 2. Secondary sort: Alphabetical by full_name
 * 3. Tertiary sort: Stable ID
 *
 * @param {Array} profiles - List of public user profiles
 * @param {string} query - Raw search query string
 * @param {number} [limit=25] - Maximum number of results to return
 * @returns {Array} Ranked list of profiles with attached `matchMeta` { priority, matchReason, matchedField }
 */
export function rankUserSearchResults(profiles = [], query = '', limit = 25) {
  if (!Array.isArray(profiles) || profiles.length === 0) return [];
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    // If empty query, return up to limit sorted alphabetically
    return profiles.slice(0, limit);
  }

  const scored = [];

  for (const profile of profiles) {
    const score = scoreUserProfileMatch(profile, normalizedQuery);
    if (score.priority < Infinity) {
      scored.push({
        ...profile,
        matchMeta: score
      });
    }
  }

  scored.sort((a, b) => {
    // 1. Primary: Priority order (1 is top priority, 5 is lowest)
    if (a.matchMeta.priority !== b.matchMeta.priority) {
      return a.matchMeta.priority - b.matchMeta.priority;
    }
    // 2. Secondary: Alphabetical order by name
    const nameA = (a.full_name || '').toLowerCase();
    const nameB = (b.full_name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    // 3. Tertiary: Stable ID
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  return scored.slice(0, limit);
}
