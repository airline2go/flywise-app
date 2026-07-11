'use client';

import { useCallback, useEffect, useState } from 'react';
import CrudTable from '../../../../lib/admin/CrudTable';
import EntityModal from '../../../../lib/admin/EntityModal';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };

// [BLOG-SINGLE-FIELD] Mirrors admin.js's parseSingleBlogInput() exactly:
// one textarea in, four fields out. First non-empty line = title
// (HTML-stripped). The line right after it, if a bare URL, = cover
// image (and only that line — any other link stays in the body, where
// the server turns it into a clickable link). Everything else =
// content. Excerpt/meta description are derived client-side just for
// the slug preview's sibling text; the server re-derives its own copy
// (and AI-strengthens it if thin) independently on save.
function parseSingleBlogInput(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  const title = (lines[i] || '').replace(/<[^>]+>/g, '').trim();
  i++;
  while (i < lines.length && !lines[i].trim()) i++;
  let coverUrl = '';
  if (i < lines.length && /^https?:\/\/\S+$/i.test(lines[i].trim())) {
    coverUrl = lines[i].trim();
    i++;
  }
  const content = lines.slice(i).join('\n').replace(/^\s*\n+/, '').trim();
  const firstParagraph = (content.split(/\n\s*\n/)[0] || content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const excerpt = truncateAtWordBoundary(firstParagraph, 155);
  return { title, content, cover_image_url: coverUrl, excerpt, meta_description: excerpt };
}

function truncateAtWordBoundary(s, max) {
  if (s.length <= max) return s;
  let cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 40) cut = cut.slice(0, lastSpace);
  return cut.trim() + '…';
}

function slugPreviewFor(title) {
  const slug = title
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c] || c)
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  return slug ? `airpiv.com/blog-post.html?slug=${slug}` : '';
}

function postToSingleText(post) {
  if (!post) return '';
  let single = post.title || '';
  if (post.cover_image_url) single += `\n${post.cover_image_url}`;
  single += `\n\n${post.content || ''}`;
  return single;
}

export default function BlogPostsClient() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [single, setSingle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/blog-posts');
    const data = await res.json();
    if (data.ok) setPosts(data.posts || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditId(null);
    setSingle('');
    setError('');
    setModalOpen(true);
  }

  function openEdit(post) {
    setEditId(post.id);
    setSingle(postToSingleText(post));
    setError('');
    setModalOpen(true);
  }

  async function handleDelete(post) {
    if (!confirm('تأكيد حذف هذا المقال نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch(`/admin/api/blog-posts/${post.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل الحذف');
  }

  async function save(status) {
    const parsed = parseSingleBlogInput(single);
    if (!parsed.title || !parsed.content) { setError('لازم تكتب عنوان (السطر الأول) ومحتوى'); return; }
    setSubmitting(true);
    setError('');
    const payload = {
      title: parsed.title,
      meta_description: parsed.meta_description,
      excerpt: parsed.excerpt,
      cover_image_url: parsed.cover_image_url,
      content: parsed.content,
      status,
    };
    const url = editId ? `/admin/api/blog-posts/${editId}` : '/admin/api/blog-posts';
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'فشل الحفظ'); return; }
    setModalOpen(false);
    load();
  }

  const parsedTitle = parseSingleBlogInput(single).title;
  const slugPreview = slugPreviewFor(parsedTitle);

  const columns = [
    { key: 'title', label: 'العنوان', render: (r) => r.title },
    { key: 'status', label: 'الحالة', render: (r) => (
      r.status === 'published'
        ? <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ منشور</span>
        : <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ مسودة</span>
    ) },
    { key: 'published_at', label: 'تاريخ النشر', render: (r) => (r.published_at ? new Date(r.published_at).toLocaleDateString('ar') : '—') },
    { key: 'views_count', label: 'المشاهدات', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.views_count || 0}</span> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>المدونة</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>كتابة ونشر مقالات بدون الحاجة لمطوّر</p>
        </div>
        <button type="button" onClick={openCreate} style={primaryBtnStyle}>✍️ مقال جديد</button>
      </div>

      <CrudTable
        columns={columns}
        rows={posts}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyLabel='لا توجد مقالات بعد — اضغط "مقال جديد" للبدء'
      />

      {modalOpen && (
        <EntityModal
          title={editId ? 'تعديل المقال' : 'مقال جديد'}
          values={{}}
          onChange={() => {}}
          onClose={() => setModalOpen(false)}
          submitting={submitting}
          error={error}
          extra={
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>المقال *</label>
              <textarea
                value={single} onChange={(e) => setSingle(e.target.value)}
                style={{ ...inputStyle, minHeight: 380, resize: 'vertical', fontSize: 13.5, marginTop: 4 }}
                placeholder={
                  'السطر الأول = العنوان (نص عادي بس، من غير أي HTML أو رموز).\n\n' +
                  'لو حابب صورة غلاف، حط رابطها في السطر اللي بعد العنوان مباشرة (مثلاً https://airpiv.com/blog-images/xyz.jpg).\n\n' +
                  'بعد كده اكتب المقال بشكل طبيعي — فقرة، سطر فاضي، فقرة تانية. أي رابط تحطه جوه المقال (زي رابط مسار طيران) هيتحول تلقائياً لرابط قابل للدوس عليه.\n\n' +
                  'الوصف المختصر ووصف SEO بيتولدوا تلقائياً — لو طلعوا ضعاف، النظام بيقوّيهم بالذكاء الاصطناعي أوتوماتيك.'
                }
              />
              <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 4 }}>{slugPreview}</div>
              <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 6 }}>
                ✨ السطر الأول = العنوان (نص عادي) · السطر اللي بعده مباشرة، لو رابط، = صورة الغلاف · الباقي = المحتوى، وأي رابط جواه بيتحول لرابط شغال تلقائياً. المقتطف ووصف SEO بيتولدوا أوتوماتيك ويتقووا بالذكاء الاصطناعي لو ضعاف. مفيش حد لطول المقال.
              </div>
            </div>
          }
          footer={
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" disabled={submitting} onClick={() => save('draft')} style={ghostBtnStyle}>💾 حفظ كمسودة</button>
              <button type="button" disabled={submitting} onClick={() => save('published')} style={primaryFlexBtnStyle}>🚀 نشر الآن</button>
            </div>
          }
        />
      )}
    </div>
  );
}

function badgeStyle(color) {
  return { display: 'inline-block', fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px', color, background: `${color}22` };
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2 };
const inputStyle = {
  display: 'block', width: '100%', padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const primaryFlexBtnStyle = { ...primaryBtnStyle, flex: 1, whiteSpace: 'normal' };
const ghostBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer', flex: 1,
};
