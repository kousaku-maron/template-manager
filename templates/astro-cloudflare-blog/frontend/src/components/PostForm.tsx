import { useState, useEffect } from 'preact/hooks';
import { FormField } from './FormField';

type Props = {
  mode: 'create' | 'edit';
  postId?: string;
  initialTitle?: string;
  initialExcerpt?: string;
  initialContent?: string;
};

export function PostForm({ mode, postId, initialTitle, initialExcerpt, initialContent }: Props) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(mode === 'edit');
  const [authEmail, setAuthEmail] = useState('');

  useEffect(() => {
    if (mode === 'create') {
      fetch('/api/me', { credentials: 'include', cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const me = json?.data;
          if (!me?.authenticated) {
            window.location.href = '/login';
            return;
          }
          setAuthEmail(me.user?.email ?? 'user');
          setAuthChecked(true);
        });
    }
  }, [mode]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const payload = {
      title: String(data.get('title') || ''),
      excerpt: String(data.get('excerpt') || ''),
      content: String(data.get('content') || ''),
    };

    const url = mode === 'create' ? '/api/posts' : `/api/posts/${postId}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      setStatus(mode === 'create' ? 'Publishing...' : 'Updating...');
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      setStatus(mode === 'create' ? 'Published. Redirecting...' : 'Updated. Redirecting...');
      setTimeout(() => {
        window.location.href = mode === 'create' ? '/' : `/posts/${postId}`;
      }, 400);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setLoading(true);
    setStatus('Deleting...');
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      window.location.href = '/';
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Delete failed');
      setLoading(false);
    }
  };

  if (!authChecked) {
    return <p className="muted text-sm">Checking session...</p>;
  }

  return (
    <>
      {authEmail && <p className="muted text-sm">Signed in as {authEmail}</p>}

      <form onSubmit={handleSubmit} className="stack" style={{ marginTop: 16 }}>
        <FormField label="Title" name="title" required maxLength={200} placeholder="Post title" value={initialTitle} />
        <FormField label="Excerpt" name="excerpt" maxLength={500} placeholder="Brief description (optional)" value={initialExcerpt} />
        <FormField label="Content" name="content" required placeholder="Write your post..." multiline value={initialContent} />

        <div className="btn-row">
          <button type="submit" disabled={loading}>
            {mode === 'create' ? 'Publish' : 'Update'}
          </button>
          {mode === 'edit' && (
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={loading}>
              Delete
            </button>
          )}
        </div>
      </form>

      {status && <p className="status-message">{status}</p>}
    </>
  );
}
