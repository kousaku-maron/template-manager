type Props = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  createdAt: string | Date;
};

function estimateReadingTime(text: string): number {
  const cjkCount = (text.match(/[\u3000-\u9fff\uf900-\ufaff]/g) || []).length;
  const wordCount = text
    .replace(/[\u3000-\u9fff\uf900-\ufaff]/g, '')
    .split(/\s+/)
    .filter(Boolean).length;
  const totalWords = wordCount + cjkCount * 0.5;
  return Math.max(1, Math.round(totalWords / 200));
}

export function PostCard({ id, title, excerpt, content, createdAt }: Props) {
  const date = new Date(createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const summary = excerpt ?? content.slice(0, 160);
  const readMin = estimateReadingTime(content);

  return (
    <a href={`/posts/${id}`} className="post-card">
      <h2 className="post-card-title">{title}</h2>
      <p className="post-card-excerpt">{summary}</p>
      <div className="post-card-footer">
        <time className="post-card-date">{date}</time>
        <span className="post-card-dot" />
        <span className="post-card-reading">{readMin} min read</span>
      </div>
    </a>
  );
}
