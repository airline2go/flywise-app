'use strict';

// [SOCIAL-STUDIO] Smart recommendations engine — operational "next best actions"
// for the content pipeline. Where opportunity.js ranks WHICH routes deserve
// content, this looks at the pipeline itself (the queue, the schedule, the
// automation config, and the ranked opportunities) and surfaces concrete gaps:
// approved posts nobody scheduled, high-opportunity routes with no post yet,
// platforms/languages the operator targets but isn't producing for, and drafts
// going stale. Pure, deterministic, no LLM/network: every recommendation is
// derived from real data the app already holds and is explainable — never a
// black box or an invented number.

const DAY = 24 * 60 * 60 * 1000;
const STALE_DRAFT_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 7;

// Statuses that count as "live pipeline" (produced, not discarded).
const ACTIVE_STATUSES = ['draft', 'pending_review', 'approved', 'scheduled', 'published'];

// Severity ordering for the final sort (higher = more urgent).
const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function parseTime(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

// Build the ranked list of recommendations. Inputs are plain data:
//   opportunities: [{ slug, stars, label }]   (already ranked/scored upstream)
//   queue:         social-post rows { platform, language, subject_ref, status,
//                                     scheduled_at, created_at, campaign }
//   config:        { platforms: [], languages: [] }  (automation targets)
//   now:           epoch ms (injectable for tests)
function buildRecommendations({ opportunities = [], queue = [], config = {}, now = Date.now() } = {}) {
  const posts = asArray(queue);
  const opps = asArray(opportunities);
  const recs = [];

  const active = posts.filter((p) => ACTIVE_STATUSES.includes(p.status));
  const scheduledOrApproved = posts.filter((p) => p.status === 'scheduled' || p.status === 'approved');

  // 1) Empty pipeline — nothing approved or scheduled to go out.
  if (scheduledOrApproved.length === 0) {
    recs.push({
      id: 'empty-pipeline',
      type: 'empty_pipeline',
      severity: 'high',
      title: 'لا محتوى جاهز للنشر',
      detail: active.length
        ? 'لديك مسودات لكن لا شيء معتمد أو مجدول — اعتمد وجدول منشوراً.'
        : 'الطابور فارغ — ولّد منشوراً من فرصة عالية للبدء.',
      meta: { activeCount: active.length },
    });
  }

  // 2) Approved but unscheduled — ready to go, just needs a date.
  const unscheduledApproved = posts.filter((p) => p.status === 'approved' && !p.scheduled_at);
  if (unscheduledApproved.length > 0) {
    recs.push({
      id: 'unscheduled-approved',
      type: 'unscheduled_approved',
      severity: 'high',
      title: `${unscheduledApproved.length} منشور معتمد بلا جدولة`,
      detail: 'منشورات معتمدة وجاهزة — أضف وقت نشر لكل منها.',
      action: { kind: 'filter_status', status: 'approved' },
      meta: { count: unscheduledApproved.length },
    });
  }

  // 3) High-opportunity routes with no post in the pipeline yet.
  const coveredSlugs = new Set(posts.map((p) => p.subject_ref).filter(Boolean));
  const uncovered = opps
    .filter((o) => o && o.slug && Number(o.stars) >= 4 && !coveredSlugs.has(o.slug))
    .slice(0, 5);
  if (uncovered.length > 0) {
    recs.push({
      id: 'uncovered-opportunities',
      type: 'uncovered_opportunities',
      severity: 'high',
      title: `${uncovered.length} فرصة عالية بلا محتوى`,
      detail: `مسارات بدرجة 4★+ لم تُولّد لها منشورات بعد: ${uncovered.map((o) => o.label || o.slug).join('، ')}.`,
      action: { kind: 'generate_opportunities', slugs: uncovered.map((o) => o.slug) },
      meta: { slugs: uncovered.map((o) => o.slug), count: uncovered.length },
    });
  }

  // 4) Targeted platforms with nothing in the pipeline.
  const targetPlatforms = asArray(config.platforms).filter(Boolean);
  if (targetPlatforms.length) {
    const producedPlatforms = new Set(active.map((p) => p.platform));
    const missingPlatforms = targetPlatforms.filter((p) => !producedPlatforms.has(p));
    if (missingPlatforms.length) {
      recs.push({
        id: 'platform-gaps',
        type: 'platform_gaps',
        severity: 'medium',
        title: `${missingPlatforms.length} منصّة مستهدفة بلا محتوى`,
        detail: `تستهدف هذه المنصّات لكن لا منشورات لها بعد: ${missingPlatforms.join('، ')}.`,
        action: { kind: 'platforms', platforms: missingPlatforms },
        meta: { platforms: missingPlatforms },
      });
    }
  }

  // 5) Targeted languages with nothing in the pipeline.
  const targetLangs = asArray(config.languages).filter(Boolean);
  if (targetLangs.length) {
    const producedLangs = new Set(active.map((p) => p.language));
    const missingLangs = targetLangs.filter((l) => !producedLangs.has(l));
    if (missingLangs.length) {
      recs.push({
        id: 'language-gaps',
        type: 'language_gaps',
        severity: 'medium',
        title: `${missingLangs.length} لغة مستهدفة بلا محتوى`,
        detail: `لا منشورات باللغات: ${missingLangs.map((l) => String(l).toUpperCase()).join('، ')}.`,
        action: { kind: 'languages', languages: missingLangs },
        meta: { languages: missingLangs },
      });
    }
  }

  // 6) No posts scheduled in the upcoming window — a cadence gap.
  const upcomingEnd = now + UPCOMING_WINDOW_DAYS * DAY;
  const upcomingScheduled = posts.filter((p) => {
    if (p.status !== 'scheduled' || !p.scheduled_at) return false;
    const t = parseTime(p.scheduled_at);
    return t != null && t >= now && t <= upcomingEnd;
  });
  if (scheduledOrApproved.length > 0 && upcomingScheduled.length === 0) {
    recs.push({
      id: 'no-upcoming',
      type: 'schedule_gap',
      severity: 'medium',
      title: 'لا منشورات مجدولة خلال 7 أيام',
      detail: 'لديك محتوى جاهز لكن لا شيء مجدول للأسبوع القادم — وزّع منشوراتك على الأيام.',
      action: { kind: 'filter_status', status: 'scheduled' },
      meta: { windowDays: UPCOMING_WINDOW_DAYS },
    });
  }

  // 7) Drafts going stale.
  const staleBefore = now - STALE_DRAFT_DAYS * DAY;
  const staleDrafts = posts.filter((p) => {
    if (p.status !== 'draft') return false;
    const t = parseTime(p.created_at);
    return t != null && t < staleBefore;
  });
  if (staleDrafts.length > 0) {
    recs.push({
      id: 'stale-drafts',
      type: 'stale_drafts',
      severity: 'low',
      title: `${staleDrafts.length} مسودة قديمة`,
      detail: `مسودات مضى عليها أكثر من ${STALE_DRAFT_DAYS} أيام — راجعها واعتمدها أو احذفها.`,
      action: { kind: 'filter_status', status: 'draft' },
      meta: { count: staleDrafts.length },
    });
  }

  // Stable sort: severity desc, then insertion order (preserved by index).
  return recs
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (SEVERITY_RANK[b.r.severity] - SEVERITY_RANK[a.r.severity]) || (a.i - b.i))
    .map(({ r }) => r);
}

module.exports = {
  buildRecommendations,
  STALE_DRAFT_DAYS,
  UPCOMING_WINDOW_DAYS,
  ACTIVE_STATUSES,
};
