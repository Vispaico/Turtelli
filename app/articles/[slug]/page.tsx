import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Layout from '@/components/Layout';
import ArticleCard from '@/components/ArticleCard';
import ShareBar from '@/components/ShareBar';
import AdSlot from '@/components/AdSlot';
import { getAllPublishedArticles, getArticleBySlug, getArticlePath, getRelatedArticles } from '@/lib/articles';

export const revalidate = 3600;

export function generateStaticParams() {
  return getAllPublishedArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const url = getArticlePath(article.slug);

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    keywords: [article.primaryKeyword, ...article.secondaryKeywords, ...article.tags],
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      type: 'article',
      url,
      images: [{ url: article.hero.src, alt: article.hero.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle,
      description: article.metaDescription,
      images: [article.hero.src],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(article.slug, 4);
  const path = getArticlePath(article.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedAt,
    author: { '@type': 'Organization', name: 'Turtelli' },
    publisher: { '@type': 'Organization', name: 'Turtelli' },
    image: article.hero.src,
    mainEntityOfPage: { '@type': 'WebPage', '@id': path },
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto pb-24">
        <div className="mb-6">
          <Link href="/articles" className="opacity-70 hover:text-accent-green transition-colors">
            ← Back to Articles
          </Link>
        </div>

        <div className="article-page bg-white text-slate-900 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-10">
            <header className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter">{article.title}</h1>
              <p className="text-slate-700 leading-relaxed">{article.excerpt}</p>

              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="text-sm text-slate-500">
                {new Date(article.publishedAt).toLocaleDateString()} · {article.readingTimeMinutes} min read
              </div>
            </header>

            <figure className="mt-8 overflow-hidden rounded-xl border border-slate-200">
              <Image
                src={article.hero.src}
                alt={article.hero.alt}
                width={1600}
                height={900}
                className="w-full h-auto"
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <figcaption className="p-3 text-xs text-slate-500">Image placeholder (Unsplash).</figcaption>
            </figure>

            <div className="mt-8">
              <ShareBar title={article.title} path={path} />
            </div>

            <div className="mt-6">
              <div className="hidden md:block">
                <AdSlot variant="big728x90" />
              </div>
              <div className="md:hidden">
                <AdSlot variant="small320x50" />
              </div>
            </div>

            <div className="mt-10">
              {article.contentHtml ? (
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                />
              ) : (
                <div className="space-y-6">{article.content}</div>
              )}
            </div>

            <div className="mt-10">
              <div className="hidden md:block">
                <AdSlot variant="big728x90" />
              </div>
              <div className="md:hidden">
                <AdSlot variant="small320x50" />
              </div>
            </div>

            <section className="mt-12 glass-card p-6">
              <h2 className="text-xl font-bold">Affiliate ideas (placeholders)</h2>
              <p className="mt-2 text-slate-700 text-sm">
                Links below are placeholders. Replace with your real affiliate URLs. Commercial links should be nofollow.
              </p>
              <ul className="mt-4 space-y-2 text-slate-700 list-disc pl-5">
                {article.affiliateIdeas.map((a) => (
                  <li key={a.label}>
                    <a
                      href={a.href}
                      target="_blank"
                      rel="nofollow sponsored noreferrer"
                      className="underline underline-offset-4 hover:text-accent-green transition-colors"
                    >
                      {a.label}
                    </a>
                    {a.note ? <span className="text-slate-500"> — {a.note}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">{article.adLayoutNote}</p>
            </section>

            {article.notesForYou?.length ? (
              <section className="mt-8 glass-card p-6">
                <h2 className="text-xl font-bold">Builder notes (remove before launch if you want)</h2>
                <ul className="mt-3 space-y-2 text-slate-700 list-disc pl-5">
                  {article.notesForYou.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-10">
              <ShareBar title={article.title} path={path} />
            </div>

            <section className="mt-12">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1 h-8 bg-accent-green rounded-full"></span>
                <h2 className="text-2xl font-bold">Further reading</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {related.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            </section>

            <section className="mt-12 glass-card p-6">
              <h2 className="text-xl font-bold">Disclaimer</h2>
              <p className="mt-2 text-slate-700 leading-relaxed">
                Educational content only. Not financial advice. Trading involves risk and you can lose money.
              </p>
            </section>
          </div>
        </div>
      </article>

    </Layout>
  );
}
