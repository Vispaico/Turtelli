import Link from 'next/link';
import type { ArticleMeta } from '@/lib/articles';

export default function ArticleCard({ article }: { article: ArticleMeta }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="block p-6 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold leading-tight">{article.title}</h3>
        <span className="text-xs opacity-60 whitespace-nowrap">{article.readingTimeMinutes} min</span>
      </div>

      <p className="mt-3 text-slate-700 leading-relaxed">{article.excerpt}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {article.tags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 text-sm text-slate-500">{new Date(article.publishedAt).toLocaleDateString()}</div>
    </Link>
  );
}
