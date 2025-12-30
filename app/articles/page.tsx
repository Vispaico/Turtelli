import Layout from '@/components/Layout';
import ArticleCard from '@/components/ArticleCard';
import { getAllPublishedArticles } from '@/lib/articles';
import Link from 'next/link';

export const revalidate = 3600;

const PER_PAGE = 9;

export default async function ArticlesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pageParam = page ? Number(page) : 1;
  const articles = getAllPublishedArticles();
  const totalPages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  const currentPage = Math.min(Math.max(1, isNaN(pageParam) ? 1 : pageParam), totalPages);

  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageArticles = articles.slice(start, end);

  return (
    <Layout>
      <section className="text-center py-12 space-y-4 animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
          Articles
        </h1>
        <p className="text-lg md:text-xl opacity-70 max-w-3xl mx-auto font-light">
          A library of Turtle Trading content: breakout rules, ATR risk, market adaptations (stocks/crypto/forex/futures), and the thinking behind the Turtelli dashboard.
        </p>
        <p className="text-sm opacity-70 max-w-2xl mx-auto">
          Read these if you want practical, rule-based trading guides with a casual tone—no hype, just how to size risk, follow breakouts, and stay disciplined.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1 h-8 bg-accent-green rounded-full"></span>
          <h2 className="text-2xl font-bold">Online articles</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pageArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3 text-sm">
            <Link
              href={`/articles?page=${Math.max(1, currentPage - 1)}`}
              className={`px-3 py-2 rounded-lg border ${currentPage === 1 ? 'opacity-50 pointer-events-none' : 'hover:border-accent-green'}`}
            >
              Previous
            </Link>
            <span className="text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={`/articles?page=${Math.min(totalPages, currentPage + 1)}`}
              className={`px-3 py-2 rounded-lg border ${currentPage === totalPages ? 'opacity-50 pointer-events-none' : 'hover:border-accent-green'}`}
            >
              Next
            </Link>
          </div>
        ) : null}
      </section>
    </Layout>
  );
}
