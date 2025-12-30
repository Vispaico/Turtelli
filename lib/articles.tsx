import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';

export type ArticleMeta = {
  id: string;
  slug: string;
  status: 'DONE' | 'DRAFT';
  published: boolean;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  publishedAt: string; // ISO
  readingTimeMinutes: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeyword: string;
  tags: string[];
  hero: { src: string; alt: string };
  affiliateIdeas: { label: string; href: string; note?: string }[];
  adLayoutNote: string;
};

export type Article = ArticleMeta & {
  content: React.ReactNode;
  contentHtml?: string;
  notesForYou?: string[];
};

function readArticleHtml(slug: string): string | undefined {
  try {
    const filePath = path.join(process.cwd(), 'content', 'articles', `${slug}.html`);
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

const publishedAt = {
  a001: '2025-12-29T10:00:00.000Z',
  a002: '2025-12-29T10:05:00.000Z',
  a003: '2025-12-29T10:10:00.000Z',
  a004: '2025-12-29T10:15:00.000Z',
  a005: '2025-12-29T10:20:00.000Z',
  a006: '2025-12-29T10:25:00.000Z',
  a007: '2025-12-29T10:30:00.000Z',
  a008: '2025-12-29T10:35:00.000Z',
  a009: '2025-12-29T10:40:00.000Z',
} as const;

const External = ({ href, children, rel }: { href: string; children: React.ReactNode; rel?: string }) => (
  <a
    href={href}
    target="_blank"
    rel={rel ?? 'noreferrer'}
    className="underline underline-offset-4 hover:text-accent-green transition-colors"
  >
    {children}
  </a>
);

export const ARTICLES: Article[] = [
  {
    id: '001',
    slug: 'turtle-trading-explained-beginner-guide',
    status: 'DONE',
    published: true,
    title: 'Turtle Trading Explained: The Complete Beginner Guide (Rules, Mindset, Markets)',
    metaTitle: 'Turtle Trading Strategy Explained (Beginner Guide + Rules & Mindset)',
    metaDescription:
      'A funny, beginner-friendly guide to the turtle trading strategy: Donchian breakouts, ATR risk, common mistakes, and a simple daily checklist. Educational only.',
    excerpt:
      'Turtle Trading is the “boring on purpose” breakout strategy that tries to catch big trends. Here’s the origin story, the rules, and how to not faceplant as a beginner.',
    publishedAt: publishedAt.a001,
    readingTimeMinutes: 14,
    primaryKeyword: 'turtle trading strategy',
    secondaryKeywords: ['trend following', 'donchian channels', 'breakout trading'],
    longTailKeyword: 'how turtle trading strategy works step by step',
    tags: ['turtle-trading', 'trend-following', 'breakouts', 'donchian', 'risk-management', 'beginner'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?turtle,finance',
      alt: 'A turtle toy on top of a trading chart notebook (placeholder image)',
    },
    affiliateIdeas: [
      {
        label: 'TradingView (charting)',
        href: 'https://example.com/affiliate/tradingview',
        note: 'Replace with your affiliate link.',
      },
      {
        label: 'Beginner-friendly broker',
        href: 'https://example.com/affiliate/broker',
        note: 'Replace with your region-specific broker link.',
      },
      {
        label: 'Trading journal app',
        href: 'https://example.com/affiliate/journal',
        note: 'Replace with your preferred journal affiliate.',
      },
    ],
    adLayoutNote:
      'Ad layout: 1× in-article native after “What is Turtle Trading?” + 1× 300×250 mid-article + 1× sticky footer anchor (mobile).',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          You know what’s funny about Turtle Trading? It’s basically a system designed for people who hate making
          decisions… which is perfect, because decisions are where most traders do their finest work: panicking.
        </p>
        <p className="opacity-80 leading-relaxed">
          Turtle Trading is a classic <strong>trend following</strong> breakout approach. It buys when price breaks to new
          highs, sells when it breaks to new lows, sizes positions based on volatility, and tries to ride big moves like a
          turtle rides… well… slowly, stubbornly, and with an expression that says “I can do this all day.”
        </p>

        <div className="glass-card p-5 mt-6">
          <h3 className="text-lg font-bold">Quick cheat sheet</h3>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              Entries use <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian channels</Link> (breakouts).
            </li>
            <li>
              Risk uses <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">ATR</Link> (volatility-based sizing + stops).
            </li>
            <li>Expect lots of small losses and a few chunky winners.</li>
            <li>
              If you want a live “how it looks” example, open the <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>.
            </li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold mt-10">The origin story (Richard Dennis, Bill Eckhardt, and a famous bet)</h2>
        <p className="opacity-80 leading-relaxed">
          In the early 1980s, trader Richard Dennis and his partner William Eckhardt argued about whether great traders are
          born or made. Dennis basically said: “Give me a rulebook and some students and I’ll build traders.” Eckhardt was
          skeptical. They ran an experiment, trained a group (the “Turtles”), and—awkward for the skeptics—many of them did
          extremely well.
        </p>
        <p className="opacity-80 leading-relaxed">
          If you want to go down the rabbit hole, start with the people:
          {' '}
          <External href="https://en.wikipedia.org/wiki/Richard_Dennis" rel="noreferrer">Richard Dennis</External>
          {' '}and{' '}
          <External href="https://en.wikipedia.org/wiki/William_Eckhardt" rel="noreferrer">William Eckhardt</External>.
        </p>

        <h2 className="text-2xl font-bold mt-10">What is Turtle Trading?</h2>
        <p className="opacity-80 leading-relaxed">
          At its simplest: Turtle Trading is a rules-based breakout system. You define a lookback window (like 20 days or
          55 days). If price breaks above the highest high of that window, you go long. If price breaks below the lowest
          low, you go short (where shorting is available). Exits are also rule-based.
        </p>

        <h3 className="text-xl font-bold mt-8">Infographic: the whole system in 60 seconds</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="glass-card p-5">
            <div className="text-sm opacity-60">1) Find breakouts</div>
            <div className="mt-2 font-semibold">Price makes a new 20D/55D high → BUY</div>
            <div className="mt-2 opacity-80 text-sm">(Or new low → SELL/short if your market allows)</div>
          </div>
          <div className="glass-card p-5">
            <div className="text-sm opacity-60">2) Control risk</div>
            <div className="mt-2 font-semibold">Size by volatility (ATR) + set a stop</div>
            <div className="mt-2 opacity-80 text-sm">So one trade can’t turn into a “career change.”</div>
          </div>
          <div className="glass-card p-5">
            <div className="text-sm opacity-60">3) Exit by rules</div>
            <div className="mt-2 font-semibold">Opposite channel breakout or stop hit</div>
            <div className="mt-2 opacity-80 text-sm">Your feelings are not an exit signal.</div>
          </div>
        </div>

        <h3 className="text-xl font-bold mt-8">Video slot (optional, but helpful)</h3>
        <div className="glass-card p-5 mt-4">
          <p className="opacity-80 leading-relaxed">
            Add a short explainer video here (2–6 minutes): “What is Turtle Trading?” + “How Donchian breakouts work.”
            Bonus points if you screen-record the <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>.
          </p>
          <p className="mt-3 text-sm opacity-60">
            Suggestion: embed a YouTube/Vimeo video here (use privacy-friendly embeds like youtube-nocookie).
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">The core principles (aka “why this isn’t just random line drawing”)</h2>
        <ul className="mt-4 space-y-3 opacity-80 list-disc pl-5">
          <li>
            <strong>Trends exist.</strong> Not always, but enough that catching a few big ones can pay for many small losses.
          </li>
          <li>
            <strong>Rules beat mood.</strong> The system is designed to remove “vibes-based trading.”
          </li>
          <li>
            <strong>Risk comes first.</strong> This is why ATR and position sizing matter as much as entry rules.
          </li>
          <li>
            <strong>Lots of trades are boring.</strong> The best trade often looks like “still holding.” That’s the point.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">What markets can you trade with Turtle rules?</h2>
        <p className="opacity-80 leading-relaxed">
          The original turtles traded futures. Today people adapt it everywhere: stocks, crypto, forex, CFDs—whatever your
          broker offers. Each market has its own traps though, so if you’re picking a playground:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>
            Stocks: gaps and earnings landmines → read{' '}
            <Link href="/articles/turtle-trading-in-stocks" className="underline underline-offset-4">Turtle Trading in Stocks</Link>.
          </li>
          <li>
            Crypto: 24/7 volatility rollercoaster → read{' '}
            <Link href="/articles/turtle-trading-in-crypto" className="underline underline-offset-4">Turtle Trading in Crypto</Link>.
          </li>
          <li>
            Futures: margin + contract roll → read{' '}
            <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">Turtle Trading in Futures</Link>.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">Common beginner mistakes (so you can skip the expensive part)</h2>
        <ol className="mt-4 space-y-3 opacity-80 list-decimal pl-5">
          <li>
            <strong>Taking one loss personally.</strong> Turtle systems expect losses. If you can’t handle small losses, you
            can’t ride big winners.
          </li>
          <li>
            <strong>“Improving” the rules after three trades.</strong> That’s not research. That’s emotional arts & crafts.
          </li>
          <li>
            <strong>Ignoring costs.</strong> Slippage and spreads matter (especially in fast markets). If this topic scares you,
            it’s normal.
          </li>
          <li>
            <strong>Overtrading.</strong> Breakout systems already trade enough. Don’t add “because I was bored” entries.
          </li>
        </ol>

        <h2 className="text-2xl font-bold mt-10">A simple daily checklist (steal this)</h2>
        <div className="glass-card p-5 mt-4">
          <ul className="space-y-2 opacity-80 list-disc pl-5">
            <li>Scan your universe for 20D/55D breakouts (Donchian highs/lows).</li>
            <li>Calculate risk per trade and position size (ATR-based).</li>
            <li>Place entry + stop orders. Do not improvise mid-sentence.</li>
            <li>Update journal: what you did, why, and whether you followed your rules.</li>
          </ul>
        </div>

        <p className="opacity-80 leading-relaxed mt-8">
          Next step: learn the breakout tool itself (Donchian channels) in{' '}
          <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">article 002</Link>, then compare{' '}
          <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">System 1 vs System 2</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">Friendly reminder</div>
          <p className="mt-2 opacity-80 leading-relaxed">
            Educational content only, not financial advice. If you copy a system, you also copy its drawdowns. That’s the
            deal.
          </p>
        </div>
      </>
    ),
    notesForYou: [
      'Add a “Start here” box on /articles that links to 001 → 002 → 004 → 003 in that order.',
      'Consider a lightweight email capture (newsletter) under each article: “Get the weekly turtle signals digest.”',
      'Add a “Terms / Risk Disclaimer” link in the footer when you’re ready for production.',
    ],
  },
  {
    id: '002',
    slug: 'donchian-channels-for-traders',
    status: 'DONE',
    published: true,
    title: 'Donchian Channels for Traders: How to Use Breakout Levels Correctly',
    metaTitle: 'Donchian Channel Strategy: Breakout Levels, Rules, and Pitfalls',
    metaDescription:
      'Learn Donchian channels the Turtle way: breakout entries, exits, 20/10 vs 55/20 settings, examples, and how to avoid whipsaws. Educational only.',
    excerpt:
      'Donchian channels are “new-high/new-low” breakouts in a clean suit. Here’s how to trade them without getting chopped into salad by whipsaws.',
    publishedAt: publishedAt.a002,
    readingTimeMinutes: 12,
    primaryKeyword: 'donchian channel',
    secondaryKeywords: ['20 day high breakout', '55 day breakout', 'channel indicator'],
    longTailKeyword: 'how to trade donchian channels without getting whipsawed',
    tags: ['donchian', 'breakouts', 'turtle-trading', 'trend-following', 'entries', 'exits'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?candlestick,chart',
      alt: 'Candlestick chart with breakout levels drawn (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'TradingView indicators', href: 'https://example.com/affiliate/indicators' },
      { label: 'Charting course', href: 'https://example.com/affiliate/charting-course' },
      { label: 'Premium data feed', href: 'https://example.com/affiliate/data' },
    ],
    adLayoutNote:
      'Ad layout: 1× 728×90 (desktop) below intro + 1× 300×250 in-content after first example + 1× end-of-article native.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Donchian channels are the no-drama version of technical analysis. No astrology lines. No “this looks like a
          dragon’s elbow.” Just: <strong>highest high</strong> and <strong>lowest low</strong> over a lookback window.
        </p>
        <p className="opacity-80 leading-relaxed">
          If you already read{' '}
          <Link href="/articles/turtle-trading-explained-beginner-guide" className="underline underline-offset-4">Turtle Trading Explained</Link>,
          this is the tool behind those entry/exit rules.
        </p>

        <h2 className="text-2xl font-bold mt-10">What is a Donchian channel?</h2>
        <p className="opacity-80 leading-relaxed">
          A Donchian channel plots two lines:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>
            Upper band: highest high of the last <strong>N</strong> periods
          </li>
          <li>
            Lower band: lowest low of the last <strong>N</strong> periods
          </li>
        </ul>
        <p className="opacity-80 leading-relaxed mt-4">
          Richard Donchian was doing trend-following work long before it was cool. Background here:{' '}
          <External href="https://en.wikipedia.org/wiki/Richard_Donchian">Richard Donchian</External>.
        </p>

        <h2 className="text-2xl font-bold mt-10">The basic breakout rules (Turtle-ish version)</h2>
        <div className="glass-card p-5 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm opacity-60">Entry</div>
              <ul className="mt-2 space-y-2 opacity-80 list-disc pl-5">
                <li>Buy when price breaks above the N-day high.</li>
                <li>Sell/short when price breaks below the N-day low (if you can short).</li>
              </ul>
            </div>
            <div>
              <div className="text-sm opacity-60">Exit</div>
              <ul className="mt-2 space-y-2 opacity-80 list-disc pl-5">
                <li>Exit long on a break below the M-day low.</li>
                <li>Exit short on a break above the M-day high.</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 opacity-80 leading-relaxed">
            The famous parameter combos are 20/10 and 55/20. Which one is “better”? Depends on your tolerance for boredom
            and whipsaws.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">20/10 vs 55/20 (aka “chatty vs chill”)</h2>
        <p className="opacity-80 leading-relaxed">
          Think of 20-day breakouts as the friend who texts you 14 times in a row. You’ll get more signals (and more
          false starts). 55-day breakouts are the friend who replies three days later but always has a good point.
        </p>
        <p className="opacity-80 leading-relaxed">
          For a deeper “which fits your personality” breakdown, read{' '}
          <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">System 1 vs System 2</Link>.
        </p>

        <h2 className="text-2xl font-bold mt-10">Example walkthrough (no magic, just math)</h2>
        <p className="opacity-80 leading-relaxed">
          Say you track the 20-day high. Each day, you update “highest high of the last 20 trading days.” If today’s price
          trades above that level, that’s your breakout.
        </p>
        <p className="opacity-80 leading-relaxed">
          Two details separate grown-up breakouts from fantasy breakouts:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>
            <strong>Execution:</strong> Will you use stop orders, limit orders, or “click buy and hope”? Each has different
            slippage.
          </li>
          <li>
            <strong>Risk:</strong> Your stop distance + position size should be decided before entry. See{' '}
            <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">ATR sizing</Link>.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">How to avoid getting whipsawed (without overfitting your life)</h2>
        <p className="opacity-80 leading-relaxed">
          Whipsaws happen when price pokes above the channel, sucks you in, then immediately reverses. You can’t delete
          whipsaws from a breakout system without deleting the strategy.
        </p>
        <p className="opacity-80 leading-relaxed">
          What you <em>can</em> do is control damage:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Use volatility-based position sizing (smaller when markets are jumpy).</li>
          <li>Trade a diversified basket (so one chop-fest doesn’t dominate).</li>
          <li>Accept that “small losses are rent.” The big trends pay the mortgage.</li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          Want the psychological reason breakouts keep working? Read{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">Why Trend Following Works</Link>.
          Want to see breakouts in action? The <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link> is literally built for that.
        </p>
      </>
    ),
    notesForYou: [
      'Add a tiny “Channel settings” toggle in the dashboard (20/10 vs 55/20) so readers can match the article to live signals.',
      'Consider a small chart screenshot component (static images) for examples; keep it lightweight (no heavy embeds).',
    ],
  },
  {
    id: '003',
    slug: 'turtle-system-1-vs-system-2',
    status: 'DONE',
    published: true,
    title: 'Turtle System 1 vs System 2: Which Breakout Rules Fit Your Personality?',
    metaTitle: 'Turtle System 1 vs System 2 (20-Day vs 55-Day Breakouts Explained)',
    metaDescription:
      'System 1 vs System 2: compare 20-day and 55-day turtle breakout rules, trade frequency, drawdowns, and how to choose without overthinking it.',
    excerpt:
      'System 1 is faster and noisier. System 2 is slower and steadier. Here’s how they differ (and which one you’ll actually stick with).',
    publishedAt: publishedAt.a003,
    readingTimeMinutes: 11,
    primaryKeyword: 'turtle trading system 1 vs system 2',
    secondaryKeywords: ['20 day breakout', '55 day breakout', 'trend following rules'],
    longTailKeyword: 'system 1 versus system 2 turtle trading differences',
    tags: ['turtle-trading', 'system-design', 'breakouts', 'donchian', 'risk-management'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?strategy,finance',
      alt: 'Two paths in a forest representing two trading systems (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Backtesting platform', href: 'https://example.com/affiliate/backtesting' },
      { label: 'TradingView', href: 'https://example.com/affiliate/tradingview' },
      { label: 'Low-fee broker', href: 'https://example.com/affiliate/low-fee-broker' },
    ],
    adLayoutNote: 'Ad layout: 1× in-content native after comparison table + 1× 300×250 before “How to choose”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Turtle Trading usually gets described like it’s one fixed rulebook. In reality, you’ll see two “systems” people
          talk about all the time:
          {' '}<strong>System 1 (shorter breakouts)</strong> and <strong>System 2 (longer breakouts)</strong>.
        </p>
        <p className="opacity-80 leading-relaxed">
          Both can work. The bigger question is: which one can you follow when you’re bored, annoyed, and convinced the
          market is personally mocking you?
        </p>

        <h2 className="text-2xl font-bold mt-10">The comparison table (print it, tattoo it, whatever)</h2>
        <div className="glass-card p-5 mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="text-left opacity-80">
                <th className="py-2">Topic</th>
                <th className="py-2">System 1 (20-day)</th>
                <th className="py-2">System 2 (55-day)</th>
              </tr>
            </thead>
            <tbody className="opacity-80">
              <tr className="border-t border-white/10">
                <td className="py-2 font-semibold">Signal frequency</td>
                <td className="py-2">Higher (more trades)</td>
                <td className="py-2">Lower (fewer trades)</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="py-2 font-semibold">Noise / whipsaws</td>
                <td className="py-2">More</td>
                <td className="py-2">Less</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="py-2 font-semibold">Holding time</td>
                <td className="py-2">Shorter</td>
                <td className="py-2">Longer</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="py-2 font-semibold">Your biggest enemy</td>
                <td className="py-2">Overtrading + frustration</td>
                <td className="py-2">Boredom + doubt</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold mt-10">What’s actually different in the rules?</h2>
        <p className="opacity-80 leading-relaxed">
          The engine is still{' '}
          <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian breakouts</Link>.
          System 1 typically uses a 20-day breakout for entry and a shorter window for exit (like 10 days). System 2 uses a
          55-day breakout for entry and something like 20 days for exit.
        </p>
        <p className="opacity-80 leading-relaxed">
          Risk management stays the same idea: volatility sizing + stops. If you skipped that, go read{' '}
          <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">ATR for Turtle Trading</Link>.
        </p>

        <h2 className="text-2xl font-bold mt-10">Drawdowns: the part no one puts on the thumbnail</h2>
        <p className="opacity-80 leading-relaxed">
          Both systems can have drawdowns. System 1 tends to have more “death by a thousand papercuts” phases (lots of small
          stop-outs). System 2 can sit through longer stretches of nothing and then wake up during a major trend and do the
          heavy lifting.
        </p>

        <h2 className="text-2xl font-bold mt-10">How to choose (simple and honest)</h2>
        <ol className="mt-4 space-y-3 opacity-80 list-decimal pl-5">
          <li>
            If you hate missing moves and prefer action → start with System 1.
          </li>
          <li>
            If you hate noise and prefer fewer, bigger decisions → start with System 2.
          </li>
          <li>
            If you don’t know → pick System 2 for 8 weeks. If you abandon it out of boredom, you learned something useful.
          </li>
        </ol>
        <p className="opacity-80 leading-relaxed mt-6">
          You can also combine them (some traders do). But if you’re a beginner, combining systems too early is like adding
          turbo to a car you haven’t learned to steer.
        </p>

        <p className="opacity-80 leading-relaxed mt-8">
          Want the “why does this even work” brain stuff? Read{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">article 005</Link>.
          Want to apply the rules to specific markets? Pick your flavor:{' '}
          <Link href="/articles/turtle-trading-in-stocks" className="underline underline-offset-4">stocks</Link>,{' '}
          <Link href="/articles/turtle-trading-in-crypto" className="underline underline-offset-4">crypto</Link>,{' '}
          <Link href="/articles/turtle-trading-in-forex" className="underline underline-offset-4">forex</Link>,{' '}
          <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">futures</Link>.
        </p>
      </>
    ),
    notesForYou: [
      'Add a “System” column to your signals table (20/55) so content readers can map articles to what they see.',
      'Consider a “Personality quiz” CTA: 5 questions → suggests System 1 or 2 and links to this article.',
    ],
  },
  {
    id: '004',
    slug: 'atr-for-turtle-trading-stops-position-sizing',
    status: 'DONE',
    published: true,
    title: 'ATR for Turtle Trading: Stops, Targets, and Volatility Position Sizing',
    metaTitle: 'ATR Explained for Turtle Trading (Stops + Position Sizing, Step by Step)',
    metaDescription:
      'Learn Average True Range (ATR) for Turtle Trading: how it’s calculated, 2×ATR stops, volatility position sizing, and how to handle volatility spikes.',
    excerpt:
      'ATR is the “seatbelt” of Turtle Trading. It helps size positions, set stops, and survive volatility without doing a dramatic backflip off your equity curve.',
    publishedAt: publishedAt.a004,
    readingTimeMinutes: 13,
    primaryKeyword: 'average true range atr',
    secondaryKeywords: ['atr stop loss', 'volatility', 'position sizing'],
    longTailKeyword: 'how to use atr for turtle trading stops',
    tags: ['atr', 'risk-management', 'position-sizing', 'turtle-trading', 'trend-following'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?risk,chart',
      alt: 'Risk management notes next to a chart (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Technical analysis course', href: 'https://example.com/affiliate/ta-course' },
      { label: 'Charting platform', href: 'https://example.com/affiliate/charting' },
      { label: 'Spreadsheet template tool', href: 'https://example.com/affiliate/spreadsheets' },
    ],
    adLayoutNote: 'Ad layout: 1× 300×250 after ATR formula section + 1× sticky sidebar (desktop).',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Breakouts are fun until you size them wrong. ATR is the boring-but-heroic piece that answers: “How wild is this
          market right now?” and “How big should my position be so one move doesn’t erase my personality?”
        </p>

        <h2 className="text-2xl font-bold mt-10">What is ATR (Average True Range)?</h2>
        <p className="opacity-80 leading-relaxed">
          ATR is a measure of volatility. It’s not direction. It doesn’t tell you if price will go up or down. It tells you
          how much price tends to move.
        </p>

        <h3 className="text-xl font-bold mt-8">True Range (TR) in plain English</h3>
        <p className="opacity-80 leading-relaxed">
          For a given day, True Range is basically the biggest of:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Today’s high − today’s low</li>
          <li>Absolute(today’s high − yesterday’s close)</li>
          <li>Absolute(today’s low − yesterday’s close)</li>
        </ul>
        <p className="opacity-80 leading-relaxed mt-4">
          That “yesterday’s close” part is how ATR respects gaps (important for stocks). For more on gap risk, see{' '}
          <Link href="/articles/turtle-trading-in-stocks" className="underline underline-offset-4">article 006</Link>.
        </p>

        <h3 className="text-xl font-bold mt-8">ATR = average of True Range</h3>
        <p className="opacity-80 leading-relaxed">
          ATR is a moving average of True Range over N periods (often 14). If TR is “today’s volatility,” ATR is
          “volatility lately.”
        </p>

        <h2 className="text-2xl font-bold mt-10">2×ATR stops (the Turtle classic)</h2>
        <p className="opacity-80 leading-relaxed">
          A common Turtle-style stop is around <strong>2×ATR</strong> away from the entry. If ATR is large, your stop is wider
          (because the market is jumpy). If ATR is small, your stop is tighter.
        </p>
        <div className="glass-card p-5 mt-4">
          <div className="text-sm opacity-60">Example</div>
          <p className="mt-2 opacity-80 leading-relaxed">
            If ATR is $2 and you enter long at $100, a 2×ATR stop might be around $96. That’s a $4 risk per share.
            Position sizing decides how many shares you can buy so that $4-per-share risk equals your chosen risk budget.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">Volatility position sizing (aka “units” without the drama)</h2>
        <p className="opacity-80 leading-relaxed">
          The goal is simple: risk roughly the same amount on every trade, even though markets have different volatility.
          That’s why ATR matters.
        </p>
        <p className="opacity-80 leading-relaxed">
          A basic formula looks like:
        </p>
        <div className="glass-card p-5 mt-4 font-mono text-sm opacity-90">
          position size ≈ (risk per trade) / (stop distance)
        </div>
        <p className="opacity-80 leading-relaxed mt-4">
          And the stop distance is often 2×ATR. So:
        </p>
        <div className="glass-card p-5 mt-4 font-mono text-sm opacity-90">
          position size ≈ (risk per trade) / (2 × ATR)
        </div>

        <h2 className="text-2xl font-bold mt-10">Adding units (pyramiding) — optional, but spicy</h2>
        <p className="opacity-80 leading-relaxed">
          Some Turtle implementations add to winners in increments (often spaced by 0.5×ATR). This can juice big trends,
          but it can also juice your anxiety. If you’re new, get the base system working first.
        </p>
        <p className="opacity-80 leading-relaxed">
          The “don’t blow up” trick is remembering that adds must respect total portfolio risk. Adding units in five
          correlated markets is how people speedrun regret.
        </p>

        <h2 className="text-2xl font-bold mt-10">Volatility spikes: what to do when ATR explodes</h2>
        <p className="opacity-80 leading-relaxed">
          Volatility spikes aren’t a bug. They’re the market doing market things. When ATR expands:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Your position sizes naturally shrink (good).</li>
          <li>Your stops widen (also good, because noise grows).</li>
          <li>Slippage can increase (annoying, but real).</li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          Pair this with clean breakout entries from{' '}
          <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian channels</Link>,
          and you’ve got the mechanical core of Turtle Trading. If you’re wondering why breakouts keep working at all,
          you’ll like{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">article 005</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">External references</div>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              <External href="https://en.wikipedia.org/wiki/Average_true_range">Average true range (ATR)</External>
            </li>
            <li>
              <External href="https://en.wikipedia.org/wiki/J._Welles_Wilder_Jr.">J. Welles Wilder Jr.</External>
            </li>
          </ul>
        </div>
      </>
    ),
    notesForYou: [
      'Implement ATR and position-size columns in the dashboard table (even if you label it “educational”).',
      'Add a “risk per trade” setting in UI, stored in localStorage, so readers can play with sizing.',
    ],
  },
  {
    id: '005',
    slug: 'why-trend-following-works-market-psychology',
    status: 'DONE',
    published: true,
    title: 'Why Trend Following Works: The Market Psychology Behind Breakouts',
    metaTitle: 'Why Trend Following Works (Psychology Behind Breakouts + Momentum)',
    metaDescription:
      'Why do breakouts keep working? A practical explanation: underreaction, institutional flows, stop orders, and when trend following fails—without hype.',
    excerpt:
      'Trend following looks too simple… which makes people suspicious. Here’s the human behavior (and market structure) that keeps breakouts alive.',
    publishedAt: publishedAt.a005,
    readingTimeMinutes: 12,
    primaryKeyword: 'why trend following works',
    secondaryKeywords: ['momentum', 'behavioral finance', 'breakout trading'],
    longTailKeyword: 'why breakouts keep working in modern markets',
    tags: ['trend-following', 'momentum', 'breakouts', 'psychology', 'market-structure'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?crowd,market',
      alt: 'Crowd of people representing market psychology (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Trading psychology books', href: 'https://example.com/affiliate/books' },
      { label: 'Trading newsletter subscriptions', href: 'https://example.com/affiliate/newsletter' },
    ],
    adLayoutNote: 'Ad layout: 1× in-article native after “Core reasons” + 1× 300×250 near “When it fails”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          The funniest criticism of trend following is: “It’s too obvious.”
          {' '}
          Like the market is a magician who only respects strategies that require 19 indicators, a full moon, and a
          suspicious crystal.
        </p>

        <h2 className="text-2xl font-bold mt-10">Core reasons breakouts work (again and again)</h2>
        <h3 className="text-xl font-bold mt-8">1) Humans underreact… then overreact</h3>
        <p className="opacity-80 leading-relaxed">
          Big moves often start with small, boring changes (earnings guidance, a policy shift, a slow rotation). Many
          participants don’t fully adjust immediately. Price drifts. Then it becomes obvious. Then everyone adjusts. That’s
          where trends come from.
        </p>

        <h3 className="text-xl font-bold mt-8">2) Institutions move slowly</h3>
        <p className="opacity-80 leading-relaxed">
          Large funds can’t just “click buy” like retail. They scale in and out. Their flows create follow-through.
          Breakouts are basically a way to hitch a ride behind those flows without pretending you’re smarter than them.
        </p>

        <h3 className="text-xl font-bold mt-8">3) Stop orders create fuel</h3>
        <p className="opacity-80 leading-relaxed">
          Breakout levels become self-reinforcing because traders place stops and entries around them. When price breaks a
          level, those orders can cascade. It’s not magic—it’s plumbing.
        </p>

        <h3 className="text-xl font-bold mt-8">4) Volatility clusters</h3>
        <p className="opacity-80 leading-relaxed">
          Markets tend to go from calm → active → very active. When volatility expands, trends can accelerate. That’s why
          Turtle-style systems pair breakouts with volatility sizing (ATR). If you missed that, go read{' '}
          <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">article 004</Link>.
        </p>

        <h2 className="text-2xl font-bold mt-10">When trend following fails (and why that’s normal)</h2>
        <p className="opacity-80 leading-relaxed">
          Trend following struggles in choppy, mean-reverting markets where price ping-pongs around levels. That’s when
          breakouts turn into a series of small losses.
        </p>
        <p className="opacity-80 leading-relaxed">
          The “trick” isn’t to avoid that phase perfectly. The trick is:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Keep losses small (stops + sizing).</li>
          <li>Stay diversified so one market’s chop doesn’t dominate.</li>
          <li>Stick around long enough to catch the next real trend.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">So what should you do with this?</h2>
        <p className="opacity-80 leading-relaxed">
          If you want a clean implementation, start with the actual mechanics:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>
            Learn the breakout tool: <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian channels</Link>
          </li>
          <li>
            Pick rules you can follow: <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">System 1 vs System 2</Link>
          </li>
          <li>
            Apply it to your market: <Link href="/articles/turtle-trading-in-stocks" className="underline underline-offset-4">stocks</Link> /{' '}
            <Link href="/articles/turtle-trading-in-crypto" className="underline underline-offset-4">crypto</Link> /{' '}
            <Link href="/articles/turtle-trading-in-forex" className="underline underline-offset-4">forex</Link> /{' '}
            <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">futures</Link>
          </li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          And if you just want to poke at real signals and see how boring can be beautiful, open the{' '}
          <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">External reading (authoritative, non-salesy)</div>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              <External href="https://en.wikipedia.org/wiki/Momentum_(finance)">Momentum (finance)</External>
            </li>
            <li>
              <External href="https://www.nber.org/">NBER research portal</External> (search “momentum” and “trend following”)
            </li>
          </ul>
        </div>
      </>
    ),
    notesForYou: [
      'Add a “Regime: trending vs choppy” badge in the dashboard (even a simple proxy like ADX/volatility regime).',
      'Consider an FAQ section under articles explaining that losses are expected and the content is educational.',
    ],
  },
  {
    id: '006',
    slug: 'turtle-trading-in-stocks',
    status: 'DONE',
    published: true,
    title: 'Turtle Trading in Stocks: How to Apply Breakouts Without Overtrading',
    metaTitle: 'Turtle Trading in Stocks (Breakouts, Filters, Gap Risk, Position Sizing)',
    metaDescription:
      'How to adapt Turtle Trading to stocks: universe selection, liquidity filters, gap/earnings risk, position sizing examples, and portfolio construction tips.',
    excerpt:
      'Stocks are great for Turtle Trading… until earnings day launches your stop into orbit. Here’s how to trade stock breakouts with fewer nasty surprises.',
    publishedAt: publishedAt.a006,
    readingTimeMinutes: 13,
    primaryKeyword: 'turtle trading stocks',
    secondaryKeywords: ['stock breakouts', 'position sizing', 'risk management'],
    longTailKeyword: 'how to apply turtle trading to stock markets',
    tags: ['stocks', 'breakouts', 'turtle-trading', 'risk-management', 'liquidity', 'portfolio'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?stock,exchange',
      alt: 'Stock exchange board with prices (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Stock screener', href: 'https://example.com/affiliate/screener' },
      { label: 'Broker', href: 'https://example.com/affiliate/stocks-broker' },
      { label: 'Earnings calendar tool', href: 'https://example.com/affiliate/earnings' },
    ],
    adLayoutNote: 'Ad layout: 1× 728×90 after intro + 1× in-content native after “Stock filters”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Turtle Trading was born in futures, but stocks are a very workable home—if you respect the stock-specific risks.
          The big one is <strong>gaps</strong>. Stocks can open far away from yesterday’s close. Your “nice tidy stop” can get
          skipped like a bad song.
        </p>

        <h2 className="text-2xl font-bold mt-10">Start with the core rules (don’t freestyle)</h2>
        <p className="opacity-80 leading-relaxed">
          The foundation doesn’t change:
          {' '}<Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian breakouts</Link>
          +{' '}
          <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">ATR sizing</Link>.
          If you skip those, stock-specific tweaks won’t save you.
        </p>

        <h2 className="text-2xl font-bold mt-10">Universe selection (aka “please don’t trade garbage”) </h2>
        <p className="opacity-80 leading-relaxed">
          Your universe matters more than your indicator settings. You want liquid names where spreads are reasonable and
          fills aren’t a lottery.
        </p>
        <div className="glass-card p-5 mt-4">
          <h3 className="text-lg font-bold">Simple stock filters</h3>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>Minimum average daily volume (e.g. 1–2M shares) so you can actually get in/out.</li>
            <li>Minimum price (e.g. $5+) to avoid microcap chaos.</li>
            <li>Avoid extremely wide spreads (your breakout edge shouldn’t be paying the spread 3 times).</li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold mt-10">Earnings, halts, and other “surprise” events</h2>
        <p className="opacity-80 leading-relaxed">
          Earnings can gap a stock 5–20% overnight. Trend following can handle that if you size properly, but if you sized
          like a maniac, this is where the universe teaches humility.
        </p>
        <p className="opacity-80 leading-relaxed">
          Practical approach: either (1) accept earnings as part of the game and size smaller, or (2) exclude stocks around
          earnings dates. Just be consistent.
        </p>

        <h2 className="text-2xl font-bold mt-10">Portfolio construction (how to avoid 12 tech stocks pretending to diversify)</h2>
        <p className="opacity-80 leading-relaxed">
          The easiest way to accidentally concentrate risk is sector clustering. Ten “different” tickers can move together.
          Consider limits by sector or correlation groups.
        </p>
        <p className="opacity-80 leading-relaxed">
          If you want the original Turtle playground and diversification by asset class, read{' '}
          <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">article 009</Link>.
        </p>

        <h2 className="text-2xl font-bold mt-10">Overtrading prevention (the stock market has infinite shiny objects)</h2>
        <p className="opacity-80 leading-relaxed">
          Stocks throw breakouts constantly. That doesn’t mean you should take all of them. Keep it systematic:
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Trade a fixed universe, scanned on a schedule (daily, not every 5 minutes).</li>
          <li>Cap new positions per day/week if your execution process gets sloppy.</li>
          <li>Log every trade. If you can’t explain it, it’s probably boredom.</li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          Want the bigger “why breakouts work” picture? Read{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">article 005</Link>.
          Want to compare systems?{' '}
          <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">article 003</Link>.
          Want a live view? <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">External references</div>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              <External href="https://www.investor.gov/">Investor.gov (SEC investor education)</External>
            </li>
            <li>
              <External href="https://en.wikipedia.org/wiki/Earnings_call">Earnings calls (background)</External>
            </li>
          </ul>
        </div>
      </>
    ),
    notesForYou: [
      'Add an “earnings date” integration later so signals can warn: “Earnings in 3 days (gap risk).”',
      'Add liquidity/spread filters server-side so the signals page avoids thin tickers automatically.',
    ],
  },
  {
    id: '007',
    slug: 'turtle-trading-in-crypto',
    status: 'DONE',
    published: true,
    title: 'Turtle Trading in Crypto: Adapting Breakouts for 24/7 Markets',
    metaTitle: 'Turtle Trading in Crypto (Bitcoin Breakouts, Volatility Sizing, 24/7 Rules)',
    metaDescription:
      'How to run Turtle breakouts in crypto: volatility sizing, exchange risk, fees/funding, stablecoin considerations, and practical rules for BTC and alts.',
    excerpt:
      'Crypto never sleeps and neither do your charts. Here’s how to adapt Turtle breakouts to 24/7 markets without turning your risk management into confetti.',
    publishedAt: publishedAt.a007,
    readingTimeMinutes: 12,
    primaryKeyword: 'turtle trading crypto',
    secondaryKeywords: ['bitcoin breakout', 'volatility', 'crypto risk'],
    longTailKeyword: 'turtle trading strategy for bitcoin and altcoins',
    tags: ['crypto', 'bitcoin', 'breakouts', 'turtle-trading', 'risk-management', 'fees'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?bitcoin,chart',
      alt: 'Bitcoin-themed chart illustration (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Crypto exchange', href: 'https://example.com/affiliate/exchange' },
      { label: 'Hardware wallet', href: 'https://example.com/affiliate/wallet' },
      { label: 'On-chain analytics tool', href: 'https://example.com/affiliate/onchain' },
    ],
    adLayoutNote: 'Ad layout: 1× 300×250 mid-article + 1× sticky footer anchor (mobile).',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Crypto is trend following’s chaotic cousin. Sometimes it trends beautifully. Sometimes it does a 12% candle just
          because someone tweeted a meme.
        </p>
        <p className="opacity-80 leading-relaxed">
          The good news: Turtle rules translate well. The catch: you must respect 24/7 trading, exchange risk, and fees.
        </p>

        <h2 className="text-2xl font-bold mt-10">What changes in crypto?</h2>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>24/7 markets:</strong> no “open/close” rhythm like stocks.</li>
          <li><strong>Volatility:</strong> ATR can be huge; sizing matters even more.</li>
          <li><strong>Venue risk:</strong> exchanges can fail, freeze, or delist assets.</li>
          <li><strong>Fees/funding:</strong> perpetuals can add costs (and surprises).</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">Breakouts still use Donchian channels</h2>
        <p className="opacity-80 leading-relaxed">
          Your entry/exit logic is still{' '}
          <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian channels</Link>.
          If you trade daily candles, the concept stays the same. (Your candle timestamps matter more though—pick a consistent
          exchange feed.)
        </p>

        <h2 className="text-2xl font-bold mt-10">Sizing: ATR is non-negotiable</h2>
        <p className="opacity-80 leading-relaxed">
          Crypto’s volatility means fixed position sizing is a quick way to experience intense personal growth.
          Use{' '}
          <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">ATR-based sizing</Link>
          so your risk is consistent.
        </p>

        <h2 className="text-2xl font-bold mt-10">Stablecoins and quote currency reality</h2>
        <p className="opacity-80 leading-relaxed">
          If you’re measuring performance in USD, trading pairs quoted in stablecoins makes accounting easier. But stablecoins
          have their own risks (issuer risk, depegs). Keep it simple and transparent.
        </p>

        <h2 className="text-2xl font-bold mt-10">Practical rules (beginner-friendly)</h2>
        <div className="glass-card p-5 mt-4">
          <ul className="space-y-2 opacity-80 list-disc pl-5">
            <li>Start with BTC and ETH before you go full “rare jungle token.”</li>
            <li>Trade one timeframe (daily) for 8–12 weeks.</li>
            <li>Cap leverage (or avoid it entirely at first).</li>
            <li>Write down your execution rule: market, limit, or stop orders—then follow it.</li>
          </ul>
        </div>

        <p className="opacity-80 leading-relaxed mt-8">
          Curious why breakouts work at all? Read{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">article 005</Link>.
          Curious about the original Turtle playground? Read{' '}
          <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">article 009</Link>.
          And if you want to see signals like a normal person (not a chart goblin), check the{' '}
          <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">External references</div>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              <External href="https://en.wikipedia.org/wiki/Bitcoin">Bitcoin (background)</External>
            </li>
            <li>
              <External href="https://www.cftc.gov/LearnAndProtect">CFTC Learn & Protect</External>
            </li>
          </ul>
        </div>
      </>
    ),
    notesForYou: [
      'Add exchange selector + data-source label so readers know where prices come from.',
      'Add a “fees & funding” note section in the dashboard for crypto instruments.',
    ],
  },
  {
    id: '008',
    slug: 'turtle-trading-in-forex',
    status: 'DONE',
    published: true,
    title: 'Turtle Trading in Forex: Breakouts, Spreads, and Session Effects',
    metaTitle: 'Turtle Trading in Forex (Breakouts + Spreads + Session Effects)',
    metaDescription:
      'Forex Turtle Trading guide: pair selection, session effects, spread-aware assumptions, ATR sizing in pips, and execution tips that match reality.',
    excerpt:
      'Forex is liquid, global, and full of spread tricks. Here’s how to run Turtle breakouts with spread-aware expectations and fewer “why did I lose?” moments.',
    publishedAt: publishedAt.a008,
    readingTimeMinutes: 12,
    primaryKeyword: 'turtle trading forex',
    secondaryKeywords: ['forex breakout strategy', 'spreads', 'slippage'],
    longTailKeyword: 'turtle trading forex strategy with realistic spreads',
    tags: ['forex', 'breakouts', 'donchian', 'atr', 'execution', 'spreads'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?forex,finance',
      alt: 'World map with currency symbols (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Forex broker', href: 'https://example.com/affiliate/forex-broker' },
      { label: 'VPS for low latency', href: 'https://example.com/affiliate/vps' },
      { label: 'Economic calendar', href: 'https://example.com/affiliate/calendar' },
    ],
    adLayoutNote: 'Ad layout: 1× in-article native after “Session effects” + 1× 300×250 after “Execution tips”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Forex is the largest, most liquid market on earth… and also the market where beginners learn the hard way that
          “tight spreads” is sometimes marketing and sometimes a bedtime story.
        </p>

        <h2 className="text-2xl font-bold mt-10">Pair selection (keep it boring at first)</h2>
        <p className="opacity-80 leading-relaxed">
          Major pairs tend to have the best liquidity and more stable spreads. That makes them friendlier for breakout rules.
          Exotic pairs can have spreads that eat your edge for breakfast.
        </p>

        <h2 className="text-2xl font-bold mt-10">Session effects (the market has moods)</h2>
        <p className="opacity-80 leading-relaxed">
          Liquidity and volatility change across sessions (Asia, London, New York). Breakouts can behave differently when the
          market is thin vs active.
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>London/NY overlap tends to be the most active (more follow-through, but also more whipsaw).</li>
          <li>Thin periods can mean worse fills even on “liquid” pairs.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">ATR sizing in pips (same idea, different units)</h2>
        <p className="opacity-80 leading-relaxed">
          ATR doesn’t care if you call it dollars or pips. You still size based on stop distance. If you haven’t read the ATR
          guide yet, do that now: <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">article 004</Link>.
        </p>

        <h2 className="text-2xl font-bold mt-10">Spread-aware backtests (reality check time)</h2>
        <p className="opacity-80 leading-relaxed">
          Many “amazing” forex strategies are amazing because the backtest assumed zero spreads and perfect fills.
          Breakout systems are sensitive to trading costs. If your spread is large relative to ATR, you’re paying a big toll.
        </p>

        <h2 className="text-2xl font-bold mt-10">Execution tips (small things that matter)</h2>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Define your order type and stick to it (stop orders are common for breakouts).</li>
          <li>Watch major economic releases (spreads can widen).</li>
          <li>Don’t add leverage “because it feels slow.” That’s the beginning of a cautionary tale.</li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          Want the core breakout logic refresher?{' '}
          <Link href="/articles/donchian-channels-for-traders" className="underline underline-offset-4">Donchian channels</Link>.
          Want to compare faster vs slower rules?{' '}
          <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">System 1 vs System 2</Link>.
          Want to understand why this works at all?{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">article 005</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">External references</div>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              <External href="https://www.bis.org/statistics/rpfx.htm">BIS FX statistics (Triennial Survey)</External>
            </li>
            <li>
              <External href="https://en.wikipedia.org/wiki/Foreign_exchange_market">Foreign exchange market (background)</External>
            </li>
          </ul>
        </div>
      </>
    ),
    notesForYou: [
      'Add “spread” and “estimated slippage” assumptions to the UI (even as educational).',
      'Consider a “session label” (Asia/London/NY) on intraday views if you add them later.',
    ],
  },
  {
    id: '009',
    slug: 'turtle-trading-in-futures',
    status: 'DONE',
    published: true,
    title: 'Turtle Trading in Futures: The Original Playground (and What Changed)',
    metaTitle: 'Turtle Trading in Futures (Margin, Contract Rolls, Diversification)',
    metaDescription:
      'The original Turtle Trading market: futures. Learn margin basics, contract rolls, continuous contracts, diversification across sectors, and risk controls.',
    excerpt:
      'Futures are where Turtle Trading grew up: diversified markets, clean trends, and real leverage. Here’s how it works today (and what to watch out for).',
    publishedAt: publishedAt.a009,
    readingTimeMinutes: 14,
    primaryKeyword: 'turtle trading futures',
    secondaryKeywords: ['commodities trend following', 'margin', 'contract roll'],
    longTailKeyword: 'how turtle trading works on futures contracts',
    tags: ['futures', 'commodities', 'trend-following', 'turtle-trading', 'margin', 'roll'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?commodities,oil',
      alt: 'Commodities imagery representing futures markets (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Futures broker', href: 'https://example.com/affiliate/futures-broker' },
      { label: 'Data vendor', href: 'https://example.com/affiliate/data-vendor' },
      { label: 'Backtesting software', href: 'https://example.com/affiliate/backtesting' },
    ],
    adLayoutNote: 'Ad layout: 1× 728×90 (desktop) + 1× 300×250 after “Contract roll explained”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          Futures are the OG Turtle habitat: commodities, rates, currencies, indices—lots of markets, lots of trends, lots of
          diversification. Also: <strong>leverage</strong>. Which is great if you respect it, and catastrophic if you treat it like a toy.
        </p>

        <h2 className="text-2xl font-bold mt-10">Why futures fit trend following so well</h2>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>Many unrelated markets (energy, metals, grains, rates, FX, equity indices).</li>
          <li>Ability to go long or short more naturally than stocks.</li>
          <li>Clean exposure to macro trends (when they show up).</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">Margin mechanics (the part that bites)</h2>
        <p className="opacity-80 leading-relaxed">
          Futures use margin: you post a fraction of the contract value. That makes them capital-efficient, but it also means
          small moves can have big P&L effects. Turtle systems were built with position sizing in mind—don’t ignore it.
        </p>
        <p className="opacity-80 leading-relaxed">
          If you haven’t read the sizing piece, do it now: <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">ATR sizing</Link>.
        </p>

        <h2 className="text-2xl font-bold mt-10">Contract rolls (the “wait, why did my chart jump?” moment)</h2>
        <p className="opacity-80 leading-relaxed">
          Futures expire. If you want continuous exposure, you roll from one contract month to the next. Charts often use a
          “continuous contract” series to represent this, which introduces roll mechanics and sometimes artificial jumps.
        </p>
        <div className="glass-card p-5 mt-4">
          <div className="text-sm opacity-60">Practical note</div>
          <p className="mt-2 opacity-80 leading-relaxed">
            Your backtest and your live trading must match: same roll rules, same data series assumptions. Otherwise you’ll
            “discover” an edge that disappears the moment you hit a real order button.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">Diversification across sectors (where the magic actually lives)</h2>
        <p className="opacity-80 leading-relaxed">
          The superpower of futures trend following is not one market—it’s many. A turtle-style portfolio might hold trends
          in bonds, energy, and currencies at the same time. That diversification can smooth the ride.
        </p>

        <h2 className="text-2xl font-bold mt-10">What changed since the original turtles?</h2>
        <p className="opacity-80 leading-relaxed">
          Markets are more electronic, more crowded, and often more efficient. But trends still happen because humans and
          institutions still behave like humans and institutions. If you want the “why,” read{' '}
          <Link href="/articles/why-trend-following-works-market-psychology" className="underline underline-offset-4">article 005</Link>.
        </p>

        <p className="opacity-80 leading-relaxed mt-8">
          If you’re choosing between system styles, read{' '}
          <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">System 1 vs System 2</Link>.
          If you’re applying turtles outside futures, see: {' '}
          <Link href="/articles/turtle-trading-in-stocks" className="underline underline-offset-4">stocks</Link>,{' '}
          <Link href="/articles/turtle-trading-in-crypto" className="underline underline-offset-4">crypto</Link>,{' '}
          <Link href="/articles/turtle-trading-in-forex" className="underline underline-offset-4">forex</Link>.
        </p>

        <div className="glass-card p-5 mt-8">
          <div className="text-sm opacity-60">External references (authoritative)</div>
          <ul className="mt-3 space-y-2 opacity-80 list-disc pl-5">
            <li>
              <External href="https://www.cmegroup.com/education.html">CME Group education</External>
            </li>
            <li>
              <External href="https://www.cftc.gov/">CFTC (market structure, futures basics)</External>
            </li>
          </ul>
        </div>
      </>
    ),
    notesForYou: [
      'Add a “continuous vs front-month” data source note wherever you show futures charts/signals.',
      'Add a “contract specs” link-out per futures symbol (tick value, margin, session).',
    ],
  },
  {
    id: '010',
    slug: 'turtle-trading-rules-checklist',
    status: 'DONE',
    published: true,
    title: 'The Turtle Trading Checklist: A One-Page System You Can Follow Daily',
    metaTitle: 'Turtle Trading Checklist: Daily Rules for Breakout Traders',
    metaDescription: 'A simple one-page checklist for Turtle Trading: pre-market routine, scanning for signals, sizing positions, and journaling. Trade without the stress.',
    excerpt: 'Trading is hard because remembering 15 rules while money is moving is stressful. Here is the daily checklist to keep your brain from short-circuiting.',
    publishedAt: '2025-12-29T10:45:00.000Z',
    readingTimeMinutes: 8,
    primaryKeyword: 'turtle trading rules checklist',
    secondaryKeywords: ['trading plan', 'systematic trading', 'breakout rules'],
    longTailKeyword: 'turtle trading daily checklist for disciplined execution',
    tags: ['checklist', 'routine', 'turtle-trading', 'discipline', 'process'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?checklist,clipboard',
      alt: 'Clipboard with a checklist on a trading desk (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Journal app', href: 'https://example.com/affiliate/journal' },
      { label: 'Checklist templates', href: 'https://example.com/affiliate/templates' },
      { label: 'Habit tracker', href: 'https://example.com/affiliate/habit-tracker' },
    ],
    adLayoutNote: 'Ad layout: 1× in-content native right before downloadable checklist + 1× end-of-article.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          The problem with trading isn’t that the math is hard. The math is literally 5th-grade subtraction. The problem is that your
          brain turns into a squirrel on espresso when the market opens. You see a flashing red number, your heart rate jumps to 110,
          and suddenly your plan to &quot;follow the rules&quot; is replaced by a primal urge to &quot;do something now.&quot;
        </p>
        <p className="opacity-80 leading-relaxed">
          The solution isn’t “more willpower” or “better mindset.” Willpower is a battery that runs out by 2 PM. The solution is a checklist.
          Pilots use them so they don’t forget to lower the landing gear. Surgeons use them so they don’t leave scissors inside your abdomen.
          You should use one so you don’t forget to place a stop loss or accidentally risk 10% of your account on a single &quot;hunch.&quot;
        </p>
        <p className="opacity-80 leading-relaxed">
          This article is the exact daily routine for a systematic trend follower. It is boring. It is repetitive. And it will save your financial life.
          Print it out. Tape it to your monitor. Do not click a mouse until you have checked the boxes.
        </p>

        <h2 className="text-2xl font-bold mt-10">Phase 1: The Pre-Market Routine (Don&apos;t Skip This)</h2>
        <p className="opacity-80 leading-relaxed">
          Most traders roll out of bed, open Twitter (sorry, X), see that someone thinks &quot;crypto is dead&quot; or &quot;oil is going to $500,&quot; panic, and then open their broker app.
          This is how you lose money. You are letting other people&apos;s noise become your signal.
        </p>
        <p className="opacity-80 leading-relaxed">
          Your pre-market routine is about establishing a &quot;zero state.&quot; You need to be neutral. You are not a bull. You are not a bear. You are a robot waiting for instructions.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 1: The HALT Check</h3>
        <p className="opacity-80 leading-relaxed">
          Ask yourself: Am I <strong>H</strong>ungry, <strong>A</strong>ngry, <strong>L</strong>onely, or <strong>T</strong>ired?
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li>If you are <strong>Hungry</strong>: Your glucose is low. Your decision-making will be impulsive. Eat a sandwich.</li>
          <li>If you are <strong>Angry</strong>: You will revenge-trade. If you fought with your partner or got cut off in traffic, do not trade.</li>
          <li>If you are <strong>Tired</strong>: You will miss details. You will type 1000 instead of 100.</li>
        </ul>
        <p className="opacity-80 leading-relaxed mt-2">
          If you fail the HALT check, walk away. The market will be there tomorrow. Your capital might not be if you trade like a zombie.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 2: Check Existing Positions</h3>
        <p className="opacity-80 leading-relaxed">
          Before looking for <em>new</em> trouble, manage the trouble you already have.
        </p>
        <div className="glass-card p-5 mt-4">
          <ul className="space-y-3 opacity-80 list-disc pl-5">
            <li><strong>Did any stops hit overnight?</strong> If you trade crypto or futures, you might have been stopped out while you slept. Log it. Accept it. Do not try to &quot;get it back.&quot;</li>
            <li><strong>Do I need to roll?</strong> If you trade futures, is your contract expiring soon? Don&apos;t let the exchange auto-liquidate you. Roll the position.</li>
            <li><strong>Move stops to breakeven?</strong> If the price has moved significantly in your favor (e.g., &gt; 1N or 2N), check your rules. Is it time to trail the stop?</li>
          </ul>
        </div>

        <h3 className="text-xl font-bold mt-8">Step 3: Update Account Equity</h3>
        <p className="opacity-80 leading-relaxed">
          This is crucial for Turtle Trading. Your position size depends on your <em>current</em> account size.
          If you have $10,000 yesterday but lost $500 overnight, you now have $9,500. Your risk calculation for today <em>must</em> use $9,500.
          This is called &quot;Mark-to-Market.&quot; It ensures you naturally trade smaller during a losing streak (preserving capital) and larger during a winning streak (compounding gains).
        </p>

        <h2 className="text-2xl font-bold mt-10">Phase 2: The Signal Scan (The Core Work)</h2>
        <p className="opacity-80 leading-relaxed">
          Now you are ready to look at the market. Remember, you are not predicting. You are scanning.
          You are looking for specific conditions: Price &gt; 20-Day High (for System 1) or Price &gt; 55-Day High (for System 2).
        </p>

        <h3 className="text-xl font-bold mt-8">Step 4: Run the Scanners</h3>
        <p className="opacity-80 leading-relaxed">
          Do not manually click through 500 charts. That is inefficient and leads to hallucinating patterns that aren&apos;t there.
          Use a scanner (like the <Link href="/dashboard" className="underline underline-offset-4">Turtelli Dashboard</Link> or TradingView screener).
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The Filter:</strong>
          <br />
          - Price &gt;= 20-Day High?
          <br />
          - Price &lt;= 20-Day Low?
        </p>
        <p className="opacity-80 leading-relaxed mt-2">
          If the answer is NO for a market, you ignore it. It is dead to you. Move on.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 5: The &quot;Almost&quot; Trap</h3>
        <p className="opacity-80 leading-relaxed">
          You will see a chart that is <em>almost</em> breaking out. It is one cent away. You will think: &quot;It&apos;s going to break anyway, I&apos;ll just get in early to get a better price.&quot;
          <strong>STOP.</strong>
          This is the siren song of the amateur. &quot;Almost&quot; breakouts are often exact resistance levels where the price reverses and crushes you.
          If the rule says $50.00 and the price is $49.99, you do not buy. You wait for $50.01. Discipline is binary. You either have it or you don&apos;t.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 6: Liquidity Check</h3>
        <p className="opacity-80 leading-relaxed">
          You found a breakout! Exciting. Now, look at the spread and volume.
          If the stock trades 1,000 shares a day and has a $0.50 spread, you cannot trade it. The <Link href="/articles/trading-costs" className="underline underline-offset-4">slippage</Link> will destroy your edge.
          Rule of thumb: If you can&apos;t enter and exit without moving the price, skip it. There are other fish in the sea.
        </p>

        <h2 className="text-2xl font-bold mt-10">Phase 3: Order Placement (The &quot;Don’t Think&quot; Phase)</h2>
        <p className="opacity-80 leading-relaxed">
          Once you have a valid signal, you switch from &quot;analyst&quot; to &quot;execution bot.&quot; Do not hesitate. Hesitation costs money.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 7: Calculate N (ATR)</h3>
        <p className="opacity-80 leading-relaxed">
          Check the 20-day ATR (Average True Range). Let&apos;s say it is $2.00. This is your measure of volatility.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 8: Calculate Position Size</h3>
        <p className="opacity-80 leading-relaxed">
          This is the most important math you will do. Do not guess.
          <br />
          <strong>Formula:</strong> (Account Equity * Risk %) / (2 * ATR)
        </p>
        <div className="glass-card p-5 mt-4">
          <p className="opacity-80 leading-relaxed">
            <strong>Example:</strong>
            <br />
            - Account: $100,000
            <br />
            - Risk per trade: 1% ($1,000)
            <br />
            - ATR: $2.00
            <br />
            - 2 * ATR: $4.00 (This is your stop distance)
            <br />
            <br />
            <strong>Size:</strong> $1,000 / $4.00 = <strong>250 shares</strong>.
          </p>
          <p className="opacity-80 leading-relaxed mt-2">
            You buy 250 shares. Not 300 because you &quot;feel good.&quot; Not 100 because you are &quot;scared.&quot; You buy 250.
          </p>
        </div>

        <h3 className="text-xl font-bold mt-8">Step 9: Place the Orders (Both of Them!)</h3>
        <p className="opacity-80 leading-relaxed">
          Entering a trade without a stop loss is like skydiving without checking your chute. You might survive, but it&apos;s a bad habit.
          Place your Entry Order (Buy Stop or Market).
          <strong>IMMEDIATELY</strong> place your Protective Stop Loss order at (Entry - 2N).
          Do not &quot;keep it in your head.&quot; Mental stops are not real. When the market crashes 10% in a flash crash, your mental stop will be paralyzed by fear. A hard stop order works while you are crying under your desk.
        </p>

        <h2 className="text-2xl font-bold mt-10">Phase 4: Post-Trade Journaling (The Learning Phase)</h2>
        <p className="opacity-80 leading-relaxed">
          The market closes. You are done. But you are not <em>done</em> done. You need to log the data.
          Your journal is the only boss you have. If you don&apos;t report to it, you are unsupervised. And unsupervised traders blow up.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 10: The Entry Log</h3>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>Date/Time:</strong> When did you enter?</li>
          <li><strong>Symbol:</strong> What did you buy?</li>
          <li><strong>Price:</strong> What was your fill? (Compare this to your desired price to track slippage).</li>
          <li><strong>Size:</strong> How many units?</li>
          <li><strong>Stop Price:</strong> Where is the exit?</li>
        </ul>

        <h3 className="text-xl font-bold mt-8">Step 11: The &quot;Why&quot; Log</h3>
        <p className="opacity-80 leading-relaxed">
          Write down exactly which rule triggered the trade.
          <br />
          &quot;System 1 breakout: Price $55.20 &gt; 20-day high $55.10.&quot;
          <br />
          If you cannot write this sentence, <strong>you made a mistake</strong>. You impulse-traded. Admit it, log it as an &quot;Error,&quot; and close the trade.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 12: The &quot;Feelings&quot; Log</h3>
        <p className="opacity-80 leading-relaxed">
          &quot;I felt nervous taking this trade because the news is bad.&quot;
          &quot;I felt overconfident because my last 3 trades won.&quot;
          Tracking your emotions helps you spot patterns. You might realize you always lose money when you trade while bored. (See <Link href="/articles/trading-signals-hold-meaning" className="underline underline-offset-4">Article 013: The Boredom Problem</Link>).
        </p>

        <h2 className="text-2xl font-bold mt-10">Phase 5: The Weekly Review (The CEO Meeting)</h2>
        <p className="opacity-80 leading-relaxed">
          Once a week (Friday afternoon or Sunday morning), you stop being the &quot;Trader&quot; and become the &quot;Risk Manager.&quot;
        </p>

        <h3 className="text-xl font-bold mt-8">Step 13: Sector Exposure Check</h3>
        <p className="opacity-80 leading-relaxed">
          Scan your portfolio. Are you long 4 oil stocks, 2 energy ETFs, and 3 oil futures?
          You don&apos;t have 9 positions. You have <strong>one giant position</strong> in Oil. If Oil crashes, you die.
          Turtle rules limit total units per sector (usually max 4 units). If you are over the limit, reduce positions immediately.
        </p>

        <h3 className="text-xl font-bold mt-8">Step 14: Execution Audit</h3>
        <p className="opacity-80 leading-relaxed">
          Look at your journal. Did you follow the checklist every day?
          Give yourself a grade.
          A = Followed all rules (even if you lost money).
          F = Broke rules (even if you made money).
          In systematic trading, process is everything. Outcome is luck in the short term, but process is skill in the long term.
        </p>

        <h2 className="text-2xl font-bold mt-10">Summary: The One-Page Cheat Sheet</h2>
        <div className="glass-card p-5 mt-4">
          <ol className="space-y-3 opacity-80 list-decimal pl-5">
            <li><strong>HALT Check:</strong> Am I Hungry, Angry, Lonely, Tired?</li>
            <li><strong>Equity Update:</strong> Mark-to-market account balance.</li>
            <li><strong>Manage Opens:</strong> Check stops, rolls, and trails.</li>
            <li><strong>Scan:</strong> Look for 20-day / 55-day breakouts.</li>
            <li><strong>Filter:</strong> Ignore low liquidity / &quot;almost&quot; signals.</li>
            <li><strong>Calc Size:</strong> Risk / 2N = Units.</li>
            <li><strong>Execute:</strong> Place Entry + Hard Stop.</li>
            <li><strong>Journal:</strong> Log price, reason, and emotion.</li>
            <li><strong>Close:</strong> Walk away. Live your life.</li>
          </ol>
        </div>

        <p className="opacity-80 leading-relaxed mt-8">
          That&apos;s it. It&apos;s not sexy. It&apos;s not exciting. It&apos;s just professional.
          If you want excitement, go to a casino. If you want to trade trends, follow the checklist.
          <br /><br />
          Ready to automate the &quot;Scan&quot; and &quot;Calc Size&quot; steps? The <Link href="/dashboard" className="underline underline-offset-4">Turtelli Dashboard</Link> handles the math so you can focus on the discipline.
        </p>
      </>
    ),
    notesForYou: [
      'Create a downloadable PDF version of this checklist later to capture emails.',
      'Add a “Today’s Status” widget in the dashboard: “Scanned? Sized? Ordered?”',
    ],
  },
  {
    id: '011',
    slug: 'breakout-trading-filters',
    status: 'DONE',
    published: true,
    title: 'Breakout Filters: When to Skip Turtle Signals (and Why)',
    metaTitle: 'Breakout Trading Filters: Trend, Volatility, and Volume Filters',
    metaDescription: 'Learn which filters improve breakout trading (and which ones destroy it). Volatility contraction, trend alignment, and how to avoid curve-fitting.',
    excerpt: 'Not all breakouts are equal. Some are traps. Here’s how to filter out the garbage signals without filtering out your profits.',
    publishedAt: '2025-12-29T10:50:00.000Z',
    readingTimeMinutes: 10,
    primaryKeyword: 'breakout trading filters',
    secondaryKeywords: ['trend filter', 'volatility filter', 'regime detection'],
    longTailKeyword: 'best filters to reduce false breakout signals',
    tags: ['filters', 'optimization', 'turtle-trading', 'backtesting', 'whipsaw'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?filter,coffee',
      alt: 'Pour-over coffee filter representing trading filters (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Backtesting platform', href: 'https://example.com/affiliate/backtesting' },
      { label: 'Data provider', href: 'https://example.com/affiliate/data' },
      { label: 'TradingView premium', href: 'https://example.com/affiliate/tradingview' },
    ],
    adLayoutNote: 'Ad layout: 1× 300×250 after “Avoid overfitting” + 1× sticky sidebar (desktop).',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          The original Turtle Trading rule was simple: <strong>Take every single signal.</strong>
          If the price hits the 20-day high, you buy. Even if the news is bad. Even if the chart looks &quot;weird.&quot; Even if your gut says &quot;no.&quot;
        </p>
        <p className="opacity-80 leading-relaxed">
          Why? Because the Turtles knew that one missed trade could be the &quot;monster trend&quot; that pays for the entire year.
          However, markets have changed. They are noisier. Algorithmic wash trading exists. &quot;Fakeouts&quot; are an industry sport.
          This has led modern trend followers to ask: <em>Can we filter out the garbage signals without filtering out the winners?</em>
        </p>
        <p className="opacity-80 leading-relaxed">
          The answer is &quot;Yes, but be careful.&quot; A good filter improves your &quot;Win Rate&quot; but might lower your &quot;Total Profit.&quot;
          A bad filter just makes you feel smart while you lose money. Let&apos;s look at the filters that actually work.
        </p>

        <h2 className="text-2xl font-bold mt-10">Filter 1: The Volatility Contraction (The &quot;Squeeze&quot;)</h2>
        <p className="opacity-80 leading-relaxed">
          Imagine a spring. If you compress it, it stores energy. When you let go, it explodes.
          Markets are the same. Periods of low volatility (compression) often lead to periods of high volatility (expansion/trend).
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The Problem:</strong> Breakouts that happen after the market has <em>already</em> made a huge move are often exhausted.
          Buying a breakout after a vertical 50% rally is risky. Buying a breakout after 3 months of &quot;boring sideways chop&quot; is where the gold is.
        </p>
        <div className="glass-card p-5 mt-4">
          <p className="opacity-80 leading-relaxed">
            <strong>How to Filter:</strong>
            <br />
            - Measure the ATR or Standard Deviation over the last 6 months.
            <br />
            - <strong>Rule:</strong> Only take the breakout if volatility is currently <em>below</em> its historical average.
            <br />
            - This ensures you are entering at the <em>start</em> of the expansion phase, not the end.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">Filter 2: Trend Alignment (The &quot;Regime&quot; Filter)</h2>
        <p className="opacity-80 leading-relaxed">
          This is the &quot;Don&apos;t swim upstream&quot; rule. If the overall market is crashing, buying a single stock breakout is like trying to run up a down escalator. You might make it, but the odds are against you.
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The 200-Day Moving Average (SMA):</strong>
          <br />
          This is the dividing line between a Bull Market and a Bear Market for many institutions.
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>The Rule:</strong> Only take Long (Buy) signals if Price &gt; 200 SMA.</li>
          <li><strong>The Short Rule:</strong> Only take Short (Sell) signals if Price &lt; 200 SMA.</li>
        </ul>
        <p className="opacity-80 leading-relaxed mt-4">
          <strong>Why it works:</strong> It keeps you out of &quot;Bear Market Rallies&quot; (short spikes that fail quickly).
          <br />
          <strong>The Cost:</strong> You will be late. At the bottom of a crash, the new bull market starts <em>below</em> the 200 SMA. You will miss the first 20-30% of the recovery. For many traders, that is a price worth paying for safety.
        </p>

        <h2 className="text-2xl font-bold mt-10">Filter 3: Volume Confirmation (The &quot;Institutional Vote&quot;)</h2>
        <p className="opacity-80 leading-relaxed">
          In Forex, volume is tricky (it&apos;s decentralized). But in Stocks and Crypto, volume is the lie detector.
          Price can be moved by one rich dentist clicking &quot;Market Buy.&quot; But <em>Volume</em> requires an army.
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The Scenario:</strong>
          <br />
          Stock XYZ breaks the 20-day high.
          <br />
          <strong>Scenario A:</strong> Volume is 50% <em>lower</em> than average. (This is likely a trap. No one cares.)
          <br />
          <strong>Scenario B:</strong> Volume is 200% <em>higher</em> than average. (This is real. Institutions are piling in.)
        </p>
        <div className="glass-card p-5 mt-4">
          <p className="opacity-80 leading-relaxed">
            <strong>The Filter Rule:</strong>
            <br />
            Only take the trade if Volume on the breakout day is &gt; 1.2x (or 1.5x) the 20-day Average Volume.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">The Dangerous Filter: &quot;It Looks Too High&quot;</h2>
        <p className="opacity-80 leading-relaxed">
          This is not a technical filter. This is an emotional filter. And it is the worst one.
          You look at a chart. It has gone from $10 to $20. Now it breaks out at $21.
          Your brain says: &quot;It&apos;s too expensive. I missed it. I&apos;ll wait for a pullback.&quot;
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>Trend Following Truth:</strong> &quot;High&quot; prices usually go higher. &quot;Low&quot; prices usually go lower.
          By filtering out &quot;expensive&quot; charts, you are literally filtering out the strongest trends. Amazon looked &quot;too high&quot; at $50, $100, $500, and $2000.
          Never use &quot;price level&quot; as a filter. Use structure.
        </p>

        <h2 className="text-2xl font-bold mt-10">The Overfitting Trap (The Data Science Disease)</h2>
        <p className="opacity-80 leading-relaxed">
          Here is how you destroy a trading system:
          You run a backtest. You lose money.
          You add a filter: &quot;Only trade on Tuesdays.&quot; Now you make money.
          You add another: &quot;Only trade if RSI is exactly 62.&quot; Now you make a million dollars!
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>This is Curve Fitting.</strong> You are not finding a market truth; you are finding a coincidence in the past data.
          If you add five filters—RSI below 70, Volume &gt; MA, Moon in Capricorn, CEO wearing a blue tie—you will create a
          system that looks perfect in the past and fails tomorrow.
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The Robustness Test:</strong>
          If you change your filter parameter slightly (e.g., change 200 SMA to 190 SMA), does the result hold up?
          If changing 200 to 190 turns a profit into a loss, your system is brittle junk. Throw it away.
        </p>

        <h2 className="text-2xl font-bold mt-10">Summary: When to Filter?</h2>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>Beginners:</strong> Do NOT filter. Trade <Link href="/articles/turtle-system-1-vs-system-2" className="underline underline-offset-4">System 1</Link> raw. Learn what false breakouts feel like. You need the scars.</li>
          <li><strong>Intermediate:</strong> Add <em>one</em> filter. Usually the 200 SMA trend filter. It reduces stress.</li>
          <li><strong>Advanced:</strong> Use Volatility Contraction. This requires more patience but increases the quality of entries significantly.</li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          The <Link href="/dashboard" className="underline underline-offset-4">Turtelli Dashboard</Link> shows you the raw signals. It is up to you to apply the filter.
          Check the &quot;Trend&quot; column or look at the Volume bars before you click buy.
        </p>
      </>
    ),
    notesForYou: [
      'Add a “Trend Filter” toggle in the dashboard (e.g., “Only show signals > SMA200”).',
      'Link to a future article about backtesting overfitting.',
    ],
  },
  {
    id: '012',
    slug: 'trend-following-drawdowns',
    status: 'DONE',
    published: true,
    title: 'Turtle Trading Drawdowns: What to Expect and How to Survive Them',
    metaTitle: 'Trend Following Drawdowns: Survival Guide for Turtle Traders',
    metaDescription: 'Trend following drawdowns are inevitable. Learn why they happen, how long they last, and how to size positions so you don’t blow up before the recovery.',
    excerpt: 'You will lose money. Sometimes for months. That’s the price of admission for the big winners. Here is how to survive the drawdown valley.',
    publishedAt: '2025-12-29T10:55:00.000Z',
    readingTimeMinutes: 12,
    primaryKeyword: 'trend following drawdowns',
    secondaryKeywords: ['turtle trading risk', 'equity curve', 'risk of ruin'],
    longTailKeyword: 'how to handle long drawdowns in trend following',
    tags: ['drawdowns', 'psychology', 'risk-management', 'turtle-trading', 'survival'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?storm,ocean',
      alt: 'Stormy ocean waves representing market drawdowns (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Risk management books', href: 'https://example.com/affiliate/risk-books' },
      { label: 'Portfolio tracker', href: 'https://example.com/affiliate/tracker' },
      { label: 'Trading community', href: 'https://example.com/affiliate/community' },
    ],
    adLayoutNote: 'Ad layout: 1× in-article native after “Typical drawdown lengths” + 1× 300×250 before “Action plan”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          If someone sold you a trading system that &quot;never loses,&quot; check your wallet. Trend following works <em>because</em> it has drawdowns.
          If it were easy, if the line just went straight up like a Ponzi scheme, the edge would be arbitraged away by high-frequency bots in 4 milliseconds.
          The drawdown is the &quot;pain premium&quot; you pay for the big returns.
        </p>
        <p className="opacity-80 leading-relaxed">
          But knowing that intellectually and feeling it viscerally are two different things. A 20% drawdown feels like a &quot;correction.&quot;
          A 40% drawdown feels like &quot;My strategy is broken.&quot;
          A 50% drawdown feels like &quot;I am a failure as a human being.&quot;
          Here is how to survive the valley of death.
        </p>

        <h2 className="text-2xl font-bold mt-10">Why Drawdowns Happen (The Mechanics)</h2>
        <p className="opacity-80 leading-relaxed">
          Turtle trading buys breakouts. Most breakouts fail (false breakouts). You take small losses on the fakes, waiting for the
          real trend. A &quot;drawdown&quot; is simply a cluster of false breakouts happening back-to-back, or a period where markets are choppy and mean-reverting.
        </p>
        <p className="opacity-80 leading-relaxed">
          Imagine you are a casino. You have a mathematical edge (Green 00 in Roulette). But sometimes, Red hits 10 times in a row.
          Does the casino panic? No. They know the math.
          But you are a casino with emotions. And when you lose 10 times in a row, you want to fire the dealer (your system).
        </p>

        <h2 className="text-2xl font-bold mt-10">The Math of Pain: What is &quot;Normal&quot;?</h2>
        <p className="opacity-80 leading-relaxed">
          Let&apos;s look at the cold, hard probabilities.
          If you have a Trend Following system with a 40% Win Rate (which is typical for Turtles):
        </p>
        <div className="glass-card p-5 mt-4">
          <ul className="space-y-3 opacity-80 list-disc pl-5">
            <li><strong>Probability of 5 losers in a row:</strong> ~8% (Will happen often).</li>
            <li><strong>Probability of 10 losers in a row:</strong> ~0.6% (Will happen eventually over 1000 trades).</li>
            <li><strong>Time spent in Drawdown:</strong> About 70-80% of your trading life.</li>
          </ul>
          <p className="mt-4 opacity-80 leading-relaxed">
            Read that last one again. <strong>You will spend most of your life below your &quot;High Water Mark&quot; (Account Peak).</strong>
            If you need to hit a new equity high every day to feel happy, do not be a trend follower. Go work for a salary.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">Historical Context: The Turtles Bleed Too</h2>
        <p className="opacity-80 leading-relaxed">
          The original Turtles in the 1980s had massive returns (some made 100%+ per year). But they also had massive drawdowns.
          It was common for them to be down 20%, 30%, or even more.
          Richard Dennis himself blew up accounts.
          The difference between the survivors and the quitters was <strong>Risk Management</strong>.
        </p>

        <h2 className="text-2xl font-bold mt-10">Survival Tactic 1: The &quot;Cut Size&quot; Rule</h2>
        <p className="opacity-80 leading-relaxed">
          This is the most important rule in the Turtle arsenal for survival.
          <strong>If your account drops 10%, you cut your risk unit (N-unit) by 20%.</strong>
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>Example:</strong>
          <br />
          - Account: $100,000. Risk per trade: 1% ($1,000).
          <br />
          - Account drops to $90,000 (10% drawdown).
          <br />
          - <strong>Panic Reaction:</strong> &quot;I need to double my size to make it back!&quot; (This is Martingale. You will die.)
          <br />
          - <strong>Turtle Reaction:</strong> &quot;I will now risk 0.8% instead of 1%.&quot;
          <br />
          - Account drops to $80,000. Now risk 0.6%.
        </p>
        <p className="opacity-80 leading-relaxed">
          This makes your equity curve &quot;convex.&quot; You lose slower as you get poorer. It keeps you alive so you are still at the table when the winning streak finally comes.
        </p>

        <h2 className="text-2xl font-bold mt-10">Survival Tactic 2: Aggressive Diversification</h2>
        <p className="opacity-80 leading-relaxed">
          If you only trade Tech Stocks, and Tech Stocks go sideways for 2 years, you are in a 2-year drawdown.
          The only way to smooth the curve is to trade uncorrelated assets.
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>Stocks</strong> are chopping? Maybe <strong>Gold</strong> is trending.</li>
          <li><strong>Gold</strong> is dead? Maybe the <strong>Euro</strong> is crashing.</li>
          <li><strong>Forex</strong> is flat? Maybe <strong>Crypto</strong> is mooning.</li>
        </ul>
        <p className="opacity-80 leading-relaxed mt-2">
          Read <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">Turtle Trading in Futures</Link> to understand why multi-asset trading is the holy grail of drawdown reduction.
        </p>

        <h2 className="text-2xl font-bold mt-10">Survival Tactic 3: Stop Watching the Scoreboard</h2>
        <p className="opacity-80 leading-relaxed">
          During a drawdown, checking your P&L daily is psychological torture. It&apos;s like weighing yourself every hour when you&apos;re trying to lose weight.
          Shift your focus from <strong>Outcome</strong> (Money) to <strong>Process</strong> (Execution).
        </p>
        <p className="opacity-80 leading-relaxed">
          Every day, ask: &quot;Did I follow my rules?&quot;
          <br />
          - If you lost money but followed rules: <strong>Good Day.</strong>
          <br />
          - If you made money but broke rules: <strong>Bad Day.</strong>
          <br />
          Rewire your brain to get dopamine from discipline, not dollars.
        </p>

        <h2 className="text-2xl font-bold mt-10">The &quot;System Hop&quot; Trap</h2>
        <p className="opacity-80 leading-relaxed">
          Here is the cycle of doom:
          <br />
          1. Start Strategy A (Trend Following).
          <br />
          2. Drawdown happens (Strategy A is &quot;out of favor&quot;).
          <br />
          3. Switch to Strategy B (Mean Reversion) because it&apos;s working <em>now</em>.
          <br />
          4. Strategy A recovers (you missed it). Strategy B goes into drawdown.
          <br />
          5. Switch back to Strategy A.
        </p>
        <p className="opacity-80 leading-relaxed">
          This guarantees you capture all the losses and none of the wins. Pick a strategy that fits your personality and stick to it for at least 6-12 months.
        </p>

        <h2 className="text-2xl font-bold mt-10">When to Actually Quit (Risk of Ruin)</h2>
        <p className="opacity-80 leading-relaxed">
          Is there a point where you <em>should</em> stop? Yes.
          If you hit your &quot;Uncle Point&quot; (e.g., 50% drawdown), stop trading.
          Take a month off. Re-evaluate your position sizing. Usually, blowing up happens because you sized too big, not because the strategy failed.
          (See <Link href="/articles/atr-for-turtle-trading-stops-position-sizing" className="underline underline-offset-4">Article 004: Position Sizing</Link>).
        </p>

        <p className="opacity-80 leading-relaxed mt-8">
          The night is darkest just before the dawn. Most traders quit right at the bottom of the drawdown, mere days before the trend that would have made their career.
          Stay small. Stay disciplined. Stay in the game.
        </p>
      </>
    ),
    notesForYou: [
      'Add a “Max Drawdown” stat in the backtest section of the dashboard (make it red and scary).',
      'Create a “Drawdown Simulator” calculator where users input win rate and see probability of N losses.',
    ],
  },
  {
    id: '013',
    slug: 'trading-signals-hold-meaning',
    status: 'DONE',
    published: true,
    title: 'The “No Breakout” Problem: Why HOLD Signals Are Normal (and Profitable)',
    metaTitle: 'Why HOLD Signals Matter: The Art of Doing Nothing in Trading',
    metaDescription: 'Frustrated by no signals? Good. In trend following, money is made by sitting on your hands. Learn why “Hold” is an active and profitable position.',
    excerpt: 'The hardest trade is doing nothing. Here is why signal scarcity is a feature, not a bug, and how to handle the boredom.',
    publishedAt: '2025-12-29T11:00:00.000Z',
    readingTimeMinutes: 9,
    primaryKeyword: 'trading signals hold meaning',
    secondaryKeywords: ['no breakout', 'patience', 'signal frequency'],
    longTailKeyword: 'why hold signals are important in breakout systems',
    tags: ['patience', 'psychology', 'turtle-trading', 'holding', 'signals'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?meditation,rock',
      alt: 'Zen rocks balancing, representing patience (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Trading journal', href: 'https://example.com/affiliate/journal' },
      { label: 'Market alerts tool', href: 'https://example.com/affiliate/alerts' },
    ],
    adLayoutNote: 'Ad layout: 1× 300×250 after “Edge comes in clusters” + 1× anchor (mobile).',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          You wake up. You drink your coffee. You open the Turtelli dashboard.
          You see a blank table. No new highs. No new lows. No signals.
          You check your charts. Everything is just... drifting.
        </p>
        <p className="opacity-80 leading-relaxed">
          You feel an itch. A physical discomfort. &quot;I am a trader,&quot; you say. &quot;I should be trading.&quot;
          So you find a chart that looks &quot;kind of good.&quot; You squint at it until it looks like a breakout. You click buy.
          Congratulations. You just paid the <strong>Boredom Tax</strong>.
        </p>
        <p className="opacity-80 leading-relaxed">
          This article is about the hardest skill in Trend Following: <strong>Doing Absolutely Nothing.</strong>
        </p>

        <h2 className="text-2xl font-bold mt-10">The Action Bias: Why We Hate Silence</h2>
        <p className="opacity-80 leading-relaxed">
          Humans are evolved to act. If a lion is coming, you run. If you are hungry, you hunt.
          Sitting still feels like failure. In most jobs, if you sit at your desk doing nothing for 4 hours, you get fired.
          In trading, if you sit at your desk doing nothing for 4 months, you might be the best trader in the room.
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>Reframing &quot;Cash&quot;:</strong>
          In Trend Following, <strong>Cash is a position</strong>. It is a defensive position.
          When you are in Cash, you are not &quot;out of the market.&quot; You are &quot;shielding your ammo&quot; for the moment the market becomes rational again.
        </p>

        <h2 className="text-2xl font-bold mt-10">Edge Comes in Clusters (The Pareto Principle)</h2>
        <p className="opacity-80 leading-relaxed">
          Markets do not trend linearly. They follow a &quot;Power Law&quot; distribution.
          <br />
          - <strong>80% of the time:</strong> Markets are noisy, choppy, and mean-reverting. (No edge for turtles).
          <br />
          - <strong>20% of the time:</strong> Markets trend aggressively. (Huge edge for turtles).
        </p>
        <p className="opacity-80 leading-relaxed">
          This means you make 80-90% of your yearly profit in just 2 or 3 months.
          The other 9 months are just waiting.
          If you try to force profits during the &quot;Waiting Months,&quot; you will churn your account down by 10-15%.
          Then, when the &quot;Profit Months&quot; finally arrive, you have less capital to trade with, and you are emotionally exhausted.
        </p>

        <h2 className="text-2xl font-bold mt-10">The Tale of Two Traders</h2>
        <div className="glass-card p-5 mt-4">
          <p className="opacity-80 leading-relaxed">
            <strong>Trader A (The Boredom Addict):</strong>
            <br />
            - Market is sideways. Trader A trades anyway. &quot;I&apos;ll scalp.&quot; &quot;I&apos;ll try a mean reversion bot.&quot;
            <br />
            - Loses 15% in chop over 6 months.
            <br />
            - Market finally breaks out. Trader A is scared (&quot;I just lost 15%&quot;) or broke. He misses the trend.
            <br />
            <strong>Result:</strong> -15% Year.
          </p>
          <p className="opacity-80 leading-relaxed mt-4">
            <strong>Trader B (The Zen Turtle):</strong>
            <br />
            - Market is sideways. Trader B checks dashboard. &quot;No signals.&quot; Closes laptop. Goes to gym.
            <br />
            - Loses 0% in chop. (Maybe small admin fees).
            <br />
            - Market breaks out. Trader B is fresh, capitalized, and ready. He buys the breakout.
            <br />
            - The trend runs for 40%.
            <br />
            <strong>Result:</strong> +40% Year.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">How to Interpret &quot;No Signal&quot; on the Dashboard</h2>
        <p className="opacity-80 leading-relaxed">
          When <Link href="/dashboard" className="underline underline-offset-4">Turtelli</Link> shows an empty list, it is not broken.
          It is shouting a very specific piece of advice: <strong>&quot;Stay out of the crossfire.&quot;</strong>
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The &quot;Hold&quot; Status:</strong>
          <br />
          - If you are already in a trade and the status is &quot;Hold&quot; (no new Buy/Sell signal), it means &quot;Let the trend work.&quot;
          <br />
          - Do not take profits early because you are bored.
          <br />
          - Do not move your stop closer because you are nervous.
          <br />
          - HOLD means HOLD.
        </p>

        <h2 className="text-2xl font-bold mt-10">Practical Tips for surviving the boredom</h2>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>Get a Hobby:</strong> Seriously. If trading is your only source of dopamine, you will overtrade. Play video games, learn to code, bake bread. Do anything that gives you a &quot;win&quot; feeling so you don&apos;t seek it in the charts.</li>
          <li><strong>Automate the Check:</strong> Set an alarm. Check signals at 9:00 AM. If none, do not check again until tomorrow. Staring at a sideways chart will trick your brain into seeing a pattern.</li>
          <li><strong>Trade System 2:</strong> If you really hate false signals, switch to the 55-day breakout. It trades much less often. It is the ultimate &quot;Lazy&quot; strategy. (See <Link href="/articles/55-day-breakout-strategy" className="underline underline-offset-4">Article 015</Link>).</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">Summary: The &quot;No Signal&quot; Signal</h2>
        <p className="opacity-80 leading-relaxed">
          &quot;No Signal&quot; is a signal. It tells you the market conditions are not right for your strategy.
          Respect it. Protect your capital.
          The market will wake up eventually. It always does.
          Your only job is to be solvent when it happens.
        </p>
      </>
    ),
    notesForYou: [
      'Ensure the dashboard explicitly says “No Signals Found (Relax)” instead of just an empty table.',
      'Add a “Boredom Index” metric? (Just kidding, but maybe).',
    ],
  },
  {
    id: '014',
    slug: '20-day-breakout-strategy',
    status: 'DONE',
    published: true,
    title: '20-Day Breakout Strategy: A Practical Guide With Examples',
    metaTitle: '20-Day Breakout Strategy Guide (Rules, Exits, Examples)',
    metaDescription: 'The 20-day breakout is the aggressive engine of Turtle Trading. Learn the exact entry and exit rules, how to place stops, and see trade examples.',
    excerpt: 'The 20-day breakout is fast, aggressive, and catches every trend. It also catches every fake-out. Here is how to trade it without going crazy.',
    publishedAt: '2025-12-29T11:05:00.000Z',
    readingTimeMinutes: 11,
    primaryKeyword: '20 day breakout strategy',
    secondaryKeywords: ['donchian 20', 'entry rules', 'exit rules'],
    longTailKeyword: 'how to trade the 20 day breakout strategy',
    tags: ['system-1', 'short-term', 'breakouts', 'turtle-trading', 'examples'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?sprint,runner',
      alt: 'Sprinter starting a race, representing fast breakouts (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Charting tool', href: 'https://example.com/affiliate/charting' },
      { label: 'Broker', href: 'https://example.com/affiliate/broker' },
      { label: 'Strategy alerts', href: 'https://example.com/affiliate/alerts' },
    ],
    adLayoutNote: 'Ad layout: 1× in-content native after rules + 1× 300×250 after sample trades.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          The 20-day breakout (often called <strong>System 1</strong>) is the aggressive engine of the Turtle Trading experiment.
          It is designed to ensure that you never, ever miss a major trend. If a market moves, System 1 will be in it.
        </p>
        <p className="opacity-80 leading-relaxed">
          The price you pay for this responsiveness is &quot;Whipsaws.&quot; System 1 enters early. It gets fake-out often. It takes many small jabs to the face.
          But when the market truly rips (think Nvidia in 2023 or Bitcoin in 2017), System 1 is in from the ground floor.
        </p>

        <h2 className="text-2xl font-bold mt-10">The Core Rules (No ambiguity allowed)</h2>
        <div className="glass-card p-5 mt-4">
          <ul className="space-y-3 opacity-80 list-disc pl-5">
            <li><strong>Entry Rule:</strong> Buy when price exceeds the High of the preceding 20 days. Sell Short when price drops below the Low of the preceding 20 days.</li>
            <li><strong>Stop Loss:</strong> 2 × ATR (N) from the entry price.</li>
            <li><strong>Exit Rule:</strong> Exit Long when price touches the 10-day Low. Exit Short when price touches the 10-day High.</li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold mt-10">Deep Dive: The Entry (Don&apos;t Wait for Close)</h2>
        <p className="opacity-80 leading-relaxed">
          A common mistake beginners make is waiting for the daily candle to <em>close</em> before entering.
          <strong>Turtles do not wait.</strong>
          If the 20-day high is $50.00, and the price ticks to $50.01 at 10:00 AM, you buy.
          Why? Because in a strong momentum breakout, the price might close at $55.00. If you wait for the close, you missed $5.00 of profit and your risk (stop distance) is now huge.
          Use <strong>Stop-Limit</strong> or <strong>Stop-Market</strong> orders to enter automatically.
        </p>

        <h2 className="text-2xl font-bold mt-10">Deep Dive: The 10-Day Exit (The &quot;Give Back&quot;)</h2>
        <p className="opacity-80 leading-relaxed">
          Notice the asymmetry. You enter on a 20-day signal, but exit on a 10-day signal.
          This is crucial. The faster exit allows you to lock in profits before the trend completely reverses.
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>The Psychology of the Exit:</strong>
          This is the hardest part.
          Let&apos;s say you bought at $100. Price goes to $150. You feel like a genius.
          Then the trend slows. The 10-day low moves up to $140.
          Price drops to $140. You exit.
          You feel bad because you &quot;lost&quot; the $10 from the peak ($150 to $140).
          <strong>Get over it.</strong> You cannot catch the exact top. System 1 ensures you catch the meat, not the bones.
        </p>

        <h2 className="text-2xl font-bold mt-10">The &quot;Last Breakout&quot; Filter (Advanced Rule)</h2>
        <p className="opacity-80 leading-relaxed">
          The original Turtles had a special rule for System 1 called the &quot;Filter Rule.&quot;
          <strong>Rule:</strong> Ignore a System 1 breakout signal if the <em>previous</em> System 1 breakout signal for this market was a <strong>winning trade</strong>.
        </p>
        <p className="opacity-80 leading-relaxed">
          <strong>Why?</strong> The logic was that markets rarely trend twice in a row without a consolidation.
          If you just caught a big trend, the next breakout is likely a fake-out.
          However, if the filtered breakout turns into a massive trend, you re-enter at the System 2 (55-day) level. This is a fail-safe.
          <em>Note for beginners: You can ignore this rule at first. Taking every signal is simpler.</em>
        </p>

        <h2 className="text-2xl font-bold mt-10">Step-by-Step Trade Anatomy</h2>
        <p className="opacity-80 leading-relaxed">
          Let&apos;s walk through a hypothetical trade in Gold Futures.
        </p>
        <h3 className="text-xl font-bold mt-8">Day 1: The Breakout</h3>
        <p className="opacity-80 leading-relaxed">
          Gold 20-day High is $2000.
          Price hits $2000.10. You buy 1 Unit.
          ATR is $20. Stop is at $1960 (2N).
        </p>
        <h3 className="text-xl font-bold mt-8">Day 3: The Add-on (Pyramiding)</h3>
        <p className="opacity-80 leading-relaxed">
          Price moves to $2010 (increase of 0.5N).
          You buy another Unit.
          You move stops for BOTH units up to $1970. (Protecting profits).
        </p>
        <h3 className="text-xl font-bold mt-8">Day 20: The Trend</h3>
        <p className="opacity-80 leading-relaxed">
          Price is $2200. You are sitting on huge open profits.
          You do nothing. You just update your trailing stop (the 10-day low).
        </p>
        <h3 className="text-xl font-bold mt-8">Day 45: The Exit</h3>
        <p className="opacity-80 leading-relaxed">
          Price drops. It touches the 10-day low at $2150.
          You sell everything.
          Trade result: Big Win.
        </p>

        <h2 className="text-2xl font-bold mt-10">Common Errors with System 1</h2>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>Second Guessing:</strong> &quot;This breakout looks weak.&quot; You don&apos;t know that. Weak-looking breakouts often become strong trends because no one believes them.</li>
          <li><strong>Exiting Early:</strong> &quot;I made 20%, I&apos;ll cash out.&quot; Then the market goes up another 80% and you cry. System 1 requires you to stay until the 10-day low is hit.</li>
          <li><strong>Re-entering Late:</strong> You got stopped out. The market breaks out again 2 days later. You are &quot;scared&quot; so you don&apos;t buy. That second breakout was the real one.</li>
        </ul>

        <p className="opacity-80 leading-relaxed mt-8">
          System 1 is a grind. It has a lower win rate than System 2 (often 35-40%). But it catches the V-bottoms that System 2 misses.
          If you want to be the &quot;First in, First out,&quot; this is your strategy.
          <br /><br />
          Verify the levels yourself on the <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>.
        </p>
      </>
    ),
    notesForYou: [
      'Generate a static chart image for the "Perfect Move" example using the canvas helper later.',
      'Link this article heavily from the dashboard System 1 signals.',
    ],
  },
  {
    id: '015',
    slug: '55-day-breakout-strategy',
    status: 'DONE',
    published: true,
    title: '55-Day Breakout Strategy: Capturing the Big Trends Without Micromanaging',
    metaTitle: '55-Day Breakout Strategy (System 2): Long-Term Trend Following Rules',
    metaDescription: 'The 55-day breakout (System 2) is for patient traders. Fewer trades, fewer whipsaws, bigger trends. Learn the rules and why it might save your sanity.',
    excerpt: 'If the 20-day system stresses you out, meet its chill older sibling. The 55-day breakout ignores the noise and only wakes up for the big moves.',
    publishedAt: '2025-12-29T11:10:00.000Z',
    readingTimeMinutes: 12,
    primaryKeyword: '55 day breakout strategy',
    secondaryKeywords: ['turtle system 2', 'long term trend following', 'donchian 55'],
    longTailKeyword: 'how to trade a 55 day breakout strategy',
    tags: ['system-2', 'long-term', 'breakouts', 'turtle-trading', 'patience'],
    hero: {
      src: 'https://source.unsplash.com/featured/1600x900/?mountain,hiker',
      alt: 'Hiker looking at a vast landscape, representing long-term view (placeholder image)',
    },
    affiliateIdeas: [
      { label: 'Backtesting platform', href: 'https://example.com/affiliate/backtesting' },
      { label: 'Long-term portfolio tracker', href: 'https://example.com/affiliate/tracker' },
    ],
    adLayoutNote: 'Ad layout: 1× 728×90 (desktop) + 1× in-article native near “Markets that fit”.',
    content: (
      <>
        <p className="opacity-80 leading-relaxed">
          If System 1 (20-day breakout) is a caffeinated day trader, <strong>System 2 (55-day breakout)</strong> is a wise old owl.
          It trades less often. It filters out the noise. It is designed for people who have jobs, families, or simply hate getting whipsawed.
        </p>
        <p className="opacity-80 leading-relaxed">
          The philosophy of System 2 is: &quot;I am willing to be late to the party, as long as I can be sure it&apos;s a <em>real</em> party.&quot;&quot;
          You give up the first chunk of the trend (the entry is later) to avoid the false starts that kill System 1 traders.
        </p>

        <h2 className="text-2xl font-bold mt-10">The Core Rules (System 2)</h2>
        <div className="glass-card p-5 mt-4">
          <ul className="space-y-3 opacity-80 list-disc pl-5">
            <li><strong>Entry Rule:</strong> Buy when price exceeds the High of the preceding 55 days. Sell Short when price drops below the Low of the preceding 55 days.</li>
            <li><strong>Stop Loss:</strong> 2 × ATR (N) from the entry price. (Standard Turtle risk).</li>
            <li><strong>Exit Rule:</strong> Exit Long when price touches the 20-day Low. Exit Short when price touches the 20-day High.</li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold mt-10">The Trade-off: Late Entry, Wide Exit</h2>
        <p className="opacity-80 leading-relaxed">
          Let&apos;s be honest about the pain points of System 2.
        </p>
        <div className="glass-card p-5 mt-4">
          <p className="opacity-80 leading-relaxed">
            <strong>Pain Point 1: Being Late</strong>
            <br />
            By the time price breaks a 55-day high, the trend might already be up 15% or 20% from the bottom.
            Your brain will scream: &quot;I missed it! It&apos;s too expensive!&quot;
            <strong>Reframe:</strong> You didn&apos;t miss it. You let the System 1 traders take the risk of the early reversal. You are paying a premium for a higher probability trend.
          </p>
          <p className="opacity-80 leading-relaxed mt-4">
            <strong>Pain Point 2: Giving Back Profits</strong>
            <br />
            The exit is the 20-day low. In a strong trend, the 20-day low might be far below the current price.
            You might ride a stock from $100 to $200, then watch it fall to $170 before the 20-day exit triggers.
            Giving back $30 of profit feels terrible. But it is necessary to stay in the trend for the move to $300 or $400.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-10">What Markets Fit System 2?</h2>
        <p className="opacity-80 leading-relaxed">
          System 2 relies on &quot;fat tails&quot;—trends that go on for months or years. It does not work well in mean-reverting chop.
        </p>
        <ul className="mt-4 space-y-2 opacity-80 list-disc pl-5">
          <li><strong>Commodities:</strong> <Link href="/articles/turtle-trading-in-futures" className="underline underline-offset-4">Futures</Link> like Oil, Copper, or Wheat. Supply shocks take a long time to resolve. System 2 eats these up.</li>
          <li><strong>Crypto:</strong> <Link href="/articles/turtle-trading-in-crypto" className="underline underline-offset-4">Bitcoin</Link> bull runs are historic. System 2 keeps you in through the 30% corrections that shake out weaker hands.</li>
          <li><strong>Currencies:</strong> Interest rate divergence trends (e.g., USD/JPY) can last for years.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10">System 2 vs. The &quot;Filter Rule&quot;</h2>
        <p className="opacity-80 leading-relaxed">
          Unlike System 1, <strong>System 2 has no filter.</strong>
          You take every single 55-day breakout.
          Why? Because 55-day breakouts are rare. If a market hits a 55-day high, something significant has changed.
          If you skip one, you are almost guaranteed to miss the year&apos;s best trade.
        </p>

        <h2 className="text-2xl font-bold mt-10">Expectations: The Boredom is Real</h2>
        <p className="opacity-80 leading-relaxed">
          You might go 3 months without a trade.
          You might check the dashboard every day for 12 weeks and see nothing but &quot;Hold&quot; or &quot;Flat.&quot;
          (See <Link href="/articles/trading-signals-hold-meaning" className="underline underline-offset-4">Article 013: The No Breakout Problem</Link>).
        </p>
        <p className="opacity-80 leading-relaxed">
          This is why System 2 is perfect for part-time traders.
          - <strong>System 1</strong> requires checking the market daily, urgently.
          - <strong>System 2</strong> allows you to check the market daily, calmly.
          If you miss a System 2 entry by 4 hours, it rarely matters. If you miss a System 1 entry by 4 hours, you might miss the move.
        </p>

        <h2 className="text-2xl font-bold mt-10">Pyramiding in System 2</h2>
        <p className="opacity-80 leading-relaxed">
          Because System 2 entries are safer (higher win rate), Aggressive Turtles often pyramid more heavily here.
          <strong>Standard Pyramid Rule:</strong>
          - Enter 1 Unit at Breakout.
          - Enter 1 Unit at Breakout + 0.5N.
          - Enter 1 Unit at Breakout + 1.0N.
          - Move stops up aggressively.
          This allows you to build a massive position in a safe trend, while keeping your initial risk small.
        </p>

        <p className="opacity-80 leading-relaxed mt-8">
          <strong>Final Verdict:</strong>
          If you want excitement, trade System 1.
          If you want wealth and a lower ulcer rate, trade System 2.
          <br /><br />
          Compare the signals live on the <Link href="/dashboard" className="underline underline-offset-4">Dashboard</Link>. Look for the &quot;55D&quot; tag.
        </p>
      </>
    ),
    notesForYou: [
      'Highlight System 2 signals in the dashboard with a different color/badge (e.g., “Long Term Signal”).',
    ],
  },
];

export function getAllPublishedArticles(): ArticleMeta[] {
  return ARTICLES.filter((a) => a.published && a.status === 'DONE').map((a) => ({
    id: a.id,
    slug: a.slug,
    status: a.status,
    published: a.published,
    title: a.title,
    metaTitle: a.metaTitle,
    metaDescription: a.metaDescription,
    excerpt: a.excerpt,
    publishedAt: a.publishedAt,
    readingTimeMinutes: a.readingTimeMinutes,
    primaryKeyword: a.primaryKeyword,
    secondaryKeywords: a.secondaryKeywords,
    longTailKeyword: a.longTailKeyword,
    tags: a.tags,
    hero: a.hero,
    affiliateIdeas: a.affiliateIdeas,
    adLayoutNote: a.adLayoutNote,
  }));
}

export function getArticleBySlug(slug: string): Article | undefined {
  const article = ARTICLES.find((a) => a.slug === slug && a.published && a.status === 'DONE');
  if (!article) return undefined;
  return {
    ...article,
    contentHtml: readArticleHtml(article.slug),
  };
}

export function getRelatedArticles(slug: string, count = 4): ArticleMeta[] {
  const current = ARTICLES.find((a) => a.slug === slug);
  if (!current) return getAllPublishedArticles().slice(0, count);

  const metas = getAllPublishedArticles().filter((a) => a.slug !== slug);
  const scored = metas
    .map((a) => {
      const overlap = a.tags.filter((t) => current.tags.includes(t)).length;
      return { a, score: overlap };
    })
    .sort((x, y) => y.score - x.score);

  return scored.slice(0, count).map((x) => x.a);
}

export function getArticlePath(slug: string) {
  return `/articles/${slug}`;
}
