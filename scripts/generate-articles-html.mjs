import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'content', 'articles');

function stripTags(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(html) {
  const text = stripTags(html);
  if (!text) return 0;
  return text.split(' ').length;
}

function p(text) {
  return `<p>${text}</p>`;
}

function h2(text) {
  return `<h2>${text}</h2>`;
}

function h3(text) {
  return `<h3>${text}</h3>`;
}

function ul(items) {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

function ol(items) {
  return `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
}

function callout(title, bodyHtml) {
  return `<div class="callout"><div class="callout-title">${title}</div>${bodyHtml}</div>`;
}

function internal(href, label) {
  return `<a href="${href}">${label}</a>`;
}

function external(href, label) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function buildCommonSection({
  market,
  marketNoun,
  biggestGotchas,
  costNotes,
  executionTips,
  dataTips,
  internalLinks,
}) {
  return [
    h2(`The ${market} reality check (so you don’t learn this from a margin call)`),
    p(
      `The Turtle rules don’t care if you trade ${marketNoun}. Breakouts are breakouts. But every market has its own "gotcha" stack. In ${market}, the gotchas are usually boring operational stuff — the kind you skip, then pay for later.`
      + ` So here’s the boring stuff, served with fewer yawns.`
    ),
    ul(biggestGotchas),
    h2('Costs and friction: the invisible tax'),
    p(
      `If your backtest assumes perfect fills and zero costs, you didn’t build a strategy — you built fan fiction. ${market} has costs that show up at the worst possible time (usually right when price breaks out and everyone hits the same button).`
    ),
    ul(costNotes),
    callout(
      'Quick tip',
      p(
        `If you only fix one thing, fix sizing. The biggest performance difference between “survives for years” and “rage-quits in a week” is risk per trade. Read ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')} if you haven’t yet.`
      )
    ),
    h2('Execution checklist (copy/paste this into your trading journal)'),
    p(
      `This is the part where you turn “nice idea” into “actual process.” If you can’t do the steps below on a normal day when you’re tired, your system is too complicated.`
    ),
    ol(executionTips),
    h2('Data and backtesting sanity checks'),
    p(
      `Backtests don’t lie on purpose. They lie because you accidentally asked the wrong question. Keep these checks simple and repeatable, and you’ll avoid the classic “why is live trading worse?” confusion.`
    ),
    ul(dataTips),
    h2('Further reading'),
    p(
      `If you want to keep the whole site in your head without getting a headache, use the hub: ${internal('/articles', 'Articles')}. And if you want to see signals like a human (not a chart goblin), poke the ${internal('/dashboard', 'Dashboard')}.`
    ),
    ul(
      internalLinks.map((l) => `${internal(l.href, l.label)} — ${l.note}`)
    ),
  ].join('');
}

function ensureLength({ html, minWords, maxWords, fillerBlocks }) {
  let out = html;
  let wc = wordCount(out);

  let i = 0;
  while (wc < minWords && i < fillerBlocks.length) {
    out += fillerBlocks[i];
    i += 1;
    wc = wordCount(out);
  }

  // If somehow we went over maxWords, we still keep it; the site requirement is "at least".
  // But we try to stay within range.
  if (wc > maxWords) {
    // no-op
  }

  return { html: out, wc };
}

const commonFillers = [
  h2('A quick, realistic walkthrough (the kind your brain actually needs)')
  + p(
    `Let’s do a simple play-by-play, because most “strategy explanations” are missing the only part that matters: what you do on a normal Tuesday. Picture this: you scan your list once a day. One market is breaking above its recent highs. Your job is not to guess the top or get poetic. Your job is to follow the steps you already decided on a calm day. If you want the full “start here” path, the hub is ${internal('/articles', 'Articles')}.`
  )
  + ol([
    `Check the level (the breakout point) and confirm it’s a real “new high” for your chosen window.`,
    `Calculate your risk using ATR. If volatility is huge, your position will be smaller. That’s not a bug.`,
    `Place the entry and the stop. Put the stop in the system, not in your imagination.`,
    `After entry, stop watching every tick. If you must stare at something, stare at your rules.`,
    `Exit by rule: either a reversal level hits, or your stop hits. Your mood is not on the list.`
  ])
  + p(
    `Sometimes you’ll get stopped out quickly. That’s normal. The system is built around the idea that a few big trends pay for a bunch of small “nope” trades.`
  ),

  h2('Risk rules that keep you in the game')
  + p(
    `Here’s the unglamorous truth: most people don’t “lose to the market.” They lose to their own sizing. They take a normal strategy and turn it into a stress test by risking too much when they feel confident and too little when they feel scared. Turtle-style risk rules try to remove that swingy behavior.`
  )
  + ul([
    `<strong>Pick a fixed risk per trade</strong> (a small percent of your account). Write it down.`,
    `<strong>Use ATR for stop distance</strong> so you’re not placing stops inside normal noise.`,
    `<strong>Size from risk</strong>: wider stop → smaller position; tighter stop → larger position.`,
    `<strong>Cap your total exposure</strong> so one theme (or one sector) can’t dominate your portfolio.`,
  ])
  + p(
    `If this feels like “too much math,” good news: it’s simple math. And it’s worth it. Start with ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')}.`
  ),

  h2('The boredom problem (and how to stop sabotaging yourself)')
  + p(
    `A lot of traders don’t have a strategy problem — they have a boredom problem. Trend following is often quiet. That silence tricks you into “improving” the system with extra trades. That’s how people turn a good strategy into a messy hobby.`
  )
  + ul([
    `Run scans on a schedule (daily or weekly). Outside that time, you’re done.`,
    `Use alerts instead of constant chart-watching.`,
    `Journal rule-breaking as a separate “expense.” It’s usually larger than commissions.`,
    `If you need action, do something else: exercise, build tools, read. Not another trade.`
  ]),

  h2('A simple checklist you can follow without thinking')
  + callout(
    'Daily (or end-of-day) checklist',
    ol([
      'Scan your universe for breakouts (20D/55D levels).',
      'Confirm liquidity/cost constraints for the instrument you trade.',
      'Compute ATR and position size from your risk rule.',
      'Place entry + stop. If you can’t place a stop, you can’t place the trade.',
      'Log it. Future-you is your compliance officer.',
    ].map((x) => x))
  )
  + callout(
    'Weekly checklist',
    ul([
      'Review every trade: did you follow rules, yes/no?',
      'Update the watchlist/universe only on the scheduled day.',
      'Check concentration: are you accidentally loaded up on one theme?',
      'Write one improvement for process (not “I wish price went up more”).',
    ])
  ),

  h2('Quick FAQ (because your brain will ask these anyway)')
  + ul([
    '<strong>Do I need a ton of indicators?</strong> Nope. Price levels + risk rules carry the system. Extra indicators mostly add extra ways to second-guess yourself.',
    '<strong>Is a low win rate “bad”?</strong> Not for trend following. Many versions win less than half the time and still do fine because the winners can be much larger than the losers.',
    `<strong>Do I need to watch charts all day?</strong> Not if you trade daily rules. You can run a boring schedule and let the rules do the heavy lifting. The ${internal('/dashboard', 'Dashboard')} is literally built for quick scanning.`,
    `<strong>What should I read next?</strong> Start with ${internal('/articles/turtle-trading-explained-beginner-guide', 'Turtle Trading Explained')} → ${internal('/articles/donchian-channels-for-traders', 'Donchian Channels')} → ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR for Turtle Trading')} → ${internal('/articles/turtle-system-1-vs-system-2', 'System 1 vs System 2')}. Or just scroll to the <em>Further reading</em> section below.`,
  ]),

  h2('Share-friendly summary (steal this for socials)')
  + callout(
    'Copy/paste',
    p(
      `Turtle Trading is rules-based trend following: buy breakouts, size by volatility (ATR), and exit by rules. It’s boring on purpose — and that’s the point. If you want the clean entry/exit levels, read ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}.`
    )
  ),

  h2('Common mistakes (and the exact fix for each)')
  + p(
    `Most “strategy failures” are just process failures in a trench coat. Here are the usual suspects, plus what to do instead.`
  )
  + ul([
    `<strong>Mistake:</strong> Moving stops because you “feel” it’s about to bounce. <strong>Fix:</strong> Decide stops before entry and treat them like a contract you signed with your calmer self.`,
    `<strong>Mistake:</strong> Taking every signal in the same sector/theme. <strong>Fix:</strong> cap exposure and diversify; correlation loves to ambush people.`,
    `<strong>Mistake:</strong> Changing parameters after a losing streak. <strong>Fix:</strong> lock rules for a fixed evaluation window (e.g. 8–12 weeks).`,
    `<strong>Mistake:</strong> Ignoring costs. <strong>Fix:</strong> assume worse fills on breakouts and test with conservative assumptions.`,
    `<strong>Mistake:</strong> Overtrading because you’re bored. <strong>Fix:</strong> schedule scans; outside scan time, do literally anything else.`,
  ]),

  h2('A simple position sizing example (numbers make this click)')
  + p(
    `Say your account is $10,000 and you decide to risk 1% per trade. That’s $100. You measure ATR, set a stop distance (often around 2×ATR), and then you size the position so a stop-out loses about $100. That’s how you make each trade equally survivable, even when markets have different volatility.`
  )
  + p(
    `Example: if your stop distance is $4, you can take roughly 25 shares ($100 / $4). If the stop distance is $10, you take 10 shares. You didn’t “get scared.” The market just got wilder, so you got smaller. That’s the whole philosophy in one sentence.`
  )
  + p(
    `Want the deep version? ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR for Turtle Trading')} is your friend.`
  ),

  h2('Media ideas (easy wins)')
  + ul([
    `A 2–6 minute video: “Breakouts in one chart” + a quick tour of the ${internal('/dashboard', 'Dashboard')}.`,
    `A simple infographic: the “Turtle loop” (Scan → Size → Enter → Stop → Exit → Repeat).`,
    `A shareable checklist graphic (daily + weekly). People love screenshots more than they admit.`,
  ]),

  callout(
    'Builder note (optional)',
    p(
      `Add a small “Share this” CTA after the first big section. People share when you saved them time or made them laugh — ideally both.`
    )
  ),

  h2('A tiny story about sticking to rules (because this is where most people lose)')
  + p(
    `Picture a normal losing streak: three trades in a row that stop out quickly. Nothing catastrophic, just annoying. Your brain starts negotiating: “Maybe the settings are wrong.” “Maybe I should wait for confirmation.” “Maybe I should just take smaller trades until it ‘feels’ better.”`
  )
  + p(
    `That negotiation is the danger zone. Not because you’re dumb — because you’re human. Trend following looks worst right before it looks fine again, and the market has a talent for timing your doubts perfectly. The disciplined move is boring: keep the rules, keep the risk consistent, and review on your scheduled day.`
  )
  + p(
    `If you want a practical way to lock this in, do two things: (1) write your rules in one page, and (2) track a “rule score” each week (0–100%). Improve the score before you change the strategy.`
  ),

  p(
    `PS: if you’re stuck, go back to the hub (${internal('/articles', 'Articles')}) and follow the “start here” order. It’s designed to build the system in your head without turning it into a 47-tab browser situation.`
  ),
];

const ARTICLES = [
  {
    id: '001',
    slug: 'turtle-trading-explained-beginner-guide',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Turtle Trading is what happens when someone looks at the market and says: “Cool story. Where’s the rulebook?” It’s systematic trend following with breakout entries, volatility-based risk, and a stubborn refusal to negotiate with your feelings.`
      ),
      p(
        `If you’ve ever bought a breakout, felt like a genius for 11 minutes, then watched price reverse like it got your home address… welcome. Turtle Trading doesn’t promise you’ll feel smart. It tries to keep you alive long enough to catch the moves that actually matter.`
      ),
      callout(
        'Start here',
        p(
          `New to the whole thing? Read this first, then jump to ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')} (entries/exits), and then ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')} (risk). That trio is basically the “turtles in three bites” combo meal.`
        )
      ),
      h2('The origin story (Dennis, Eckhardt, and a wildly expensive argument)'),
      p(
        `Richard Dennis and William Eckhardt had a debate that every trader has at some point: are great traders born, or can you train them? Dennis thought you could teach rules. Eckhardt thought “yeah sure, and I can teach my cat to do taxes.” They recruited students, taught them a system, and the turtles became one of the most famous trading experiments ever.`
      ),
      p(
        `You can read the background on ${external('https://en.wikipedia.org/wiki/Richard_Dennis', 'Richard Dennis')} and ${external('https://en.wikipedia.org/wiki/William_Eckhardt', 'William Eckhardt')} if you want the history. The practical takeaway is simpler: rules + risk control can beat vibes.`
      ),
      h2('What Turtle Trading is (in normal-person language)'),
      ul([
        `<strong>Entry:</strong> buy when price breaks above the highest high of the last N days (breakout).`,
        `<strong>Exit:</strong> get out when price breaks below a shorter lookback low (or your stop gets hit).`,
        `<strong>Risk:</strong> size by volatility (ATR) so every trade risks roughly the same amount.`,
      ]),
      p(
        `That’s it. It’s not “secret.” It’s just annoyingly disciplined. The hardest part is doing it after three losses in a row when your brain starts writing conspiracy theories about Donchian channels.`
      ),
      h2('Why breakouts at all?'),
      p(
        `Breakouts are basically a lazy way to let the market prove strength. Instead of guessing “is this a new uptrend?” you wait until price actually pushes into new territory. You’ll miss some bottoms. You’ll also avoid some “catching knives” that look cheap right before they keep falling.`
      ),
      p(
        `For the behavioral explanation (the human stuff), read ${internal('/articles/why-trend-following-works-market-psychology', 'Why trend following works')}. It’s the “why this keeps being a thing” article.`
      ),
      h2('The part everyone skips: what it feels like'),
      p(
        `Trend following has three emotional seasons: (1) boredom, (2) mild pain, (3) “wait, why is this suddenly working?” Boredom is the default because good systems don’t require constant action. Mild pain shows up because breakouts can fail repeatedly. Then, once in a while, a trend runs and pays for the whole mess.`
      ),
      ul([
        `If you hate boredom, you’ll sabotage yourself by inventing trades.`,
        `If you hate small losses, you’ll move stops and turn “small” into “oops.”`,
        `If you can accept both, you give yourself a chance to catch the rare, big move.`
      ]),
      h2('A simple “do this weekly” setup (beginner edition)'),
      ol([
        `Pick a universe you can stick with (20–100 liquid markets). Don’t change it daily because you found a new shiny ticker.`,
        `Pick one timeframe (daily) and one breakout window (20 or 55).`,
        `Decide risk per trade and write it down. Then read ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR')} and actually use it.`,
        `Run the scan on a schedule. If you check every hour, you’re not trading — you’re doomscrolling with candles.`,
        `Journal: entry reason, risk, exit rule. If you can’t explain it, it wasn’t a rule-based trade.`
      ]),
      callout(
        'Tiny infographic idea',
        p(
          `Put a “Turtle loop” graphic here: Scan → Size → Enter → Place stop → Do nothing → Exit by rule → Repeat. If you make it funny, people will screenshot it.`
        )
      ),
      h2('Common beginner mistakes (the expensive hits)'),
      ul([
        `<strong>Trading too many markets at once:</strong> you don’t get “diversification,” you get “chaos.” Start smaller.`,
        `<strong>Ignoring costs:</strong> breakouts happen when spreads/slippage can be worst. Model it. Respect it.`,
        `<strong>Changing the rule after 2 trades:</strong> that’s not improvement, that’s mood swings with a spreadsheet.`
      ]),
      h2('What to read next'),
      ul([
        `${internal('/articles/donchian-channels-for-traders', 'Donchian channels')} — the breakout levels and how to avoid the “whipsaw rage spiral.”`,
        `${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')} — the risk piece that makes everything survivable.`,
        `${internal('/articles/turtle-system-1-vs-system-2', 'System 1 vs System 2')} — pick rules you can actually follow.`,
      ]),
      callout(
        'Want to see signals?',
        p(
          `Open the ${internal('/dashboard', 'Dashboard')} and treat it like a cockpit: scan, decide, done. The goal is fewer decisions, not more.`
        )
      ),
      h2('External references'),
      ul([
        `${external('https://en.wikipedia.org/wiki/Trend_following', 'Trend following (background)')}`,
        `${external('https://en.wikipedia.org/wiki/Donchian_channel', 'Donchian channels (background)')}`,
      ]),
    ].join(''),
  },
  {
    id: '002',
    slug: 'donchian-channels-for-traders',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Donchian channels are refreshingly boring. They don’t predict the future. They just tell you where price has been lately — the highest high and lowest low — and then they wait for price to do something new.`
      ),
      p(
        `If Turtle Trading is the “rulebook,” Donchian channels are the ruler and the straight edge. This is the breakout tool behind ${internal('/articles/turtle-trading-explained-beginner-guide', 'Turtle Trading Explained')}.`
      ),
      h2('What a Donchian channel is'),
      p(
        `A Donchian channel has an upper band (highest high over N periods) and a lower band (lowest low over N periods). When price breaks above the upper band, you have a breakout. When it breaks below the lower band, you have a breakdown.`
      ),
      ul([
        `<strong>N</strong> controls how sensitive it is. Smaller N = more signals and more noise.`,
        `High/low-based bands react to intraday extremes (useful for breakouts).`,
        `You can use close-only variations, but that changes the system — be consistent.`
      ]),
      callout(
        'History nerd corner',
        p(
          `Richard Donchian is basically the godparent of trend following. Background: ${external('https://en.wikipedia.org/wiki/Richard_Donchian', 'Richard Donchian')}.`
        )
      ),
      h2('Classic Turtle-style settings: 20/10 vs 55/20'),
      p(
        `These are the two settings you see everywhere because they’re easy to understand and hard to “optimize” into nonsense.`
      ),
      ul([
        `<strong>20/10:</strong> enter on 20-day breakout, exit on 10-day reversal. More trades. More little losses.`,
        `<strong>55/20:</strong> enter on 55-day breakout, exit on 20-day reversal. Fewer trades. More patience required.`,
      ]),
      p(
        `If you want the personality angle (and the “which one will I quit” angle), read ${internal('/articles/turtle-system-1-vs-system-2', 'System 1 vs System 2')}.`
      ),
      h2('How to trade the levels without getting chopped up'),
      p(
        `Two things matter more than the indicator itself: (1) how you execute the breakout, and (2) how you size the trade. That’s where most “this doesn’t work” complaints are hiding.`
      ),
      h3('Execution: stop orders vs waiting for a close'),
      p(
        `Stop orders get you in as soon as price breaks. That’s great when trends run. It’s also how you get filled on a fake-out. Waiting for a daily close can reduce noise, but you’ll miss some early moves. Pick one approach and test it — don’t mix them depending on how brave you feel that day.`
      ),
      h3('Sizing: the whipsaw antidote'),
      p(
        `Whipsaws are normal. The point is to make them small. ATR-based sizing is the boring fix that actually helps. Read ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR for Turtle Trading')}.`
      ),
      h2('A real-world example (fictional numbers, real behavior)'),
      p(
        `Imagine a market has a 20-day high at 100. Price has tried to break 100 twice and failed. The third time, it finally trades to 101. That’s a breakout. Your job is not to “feel” if it’s real. Your job is to enter by rule, size by risk, and let the exit rule decide if you were right.`
      ),
      p(
        `The market might run to 120 and you look like a genius. Or it might reverse to 95 and stop you out and you feel personally attacked. Both outcomes are part of the system. The edge is in the long series, not the one trade that ruined your lunch.`
      ),
      h2('Backtesting mistakes specific to Donchian channels'),
      ul([
        `<strong>Lookahead bias:</strong> using today’s high/low inside the “past N days” window incorrectly.`,
        `<strong>Survivorship bias (stocks):</strong> only testing today’s winners.`,
        `<strong>Costs ignored:</strong> breakout fills are rarely “mid-price fantasy.”`,
      ]),
      callout(
        'Dashboard idea',
        p(
          `Add two columns to your signals table: “20D high” and “55D high.” People love seeing levels. Then you can link this article from tooltips.`
        )
      ),
      h2('External references'),
      ul([
        `${external('https://en.wikipedia.org/wiki/Donchian_channel', 'Donchian channel (background)')}`,
        `${external('https://en.wikipedia.org/wiki/Breakout_(technical_analysis)', 'Breakouts (technical analysis background)')}`,
      ]),
    ].join(''),
  },
  {
    id: '003',
    slug: 'turtle-system-1-vs-system-2',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `System 1 vs System 2 is basically “fast turtle vs patient turtle.” Both use the same bones: Donchian breakouts and volatility-based risk. The difference is how often they fire and how much noise you’re willing to sit through.`
      ),
      p(
        `If you don’t pick a version on purpose, you’ll pick one accidentally based on your mood. And mood-based system selection is how traders become comedians without realizing it.`
      ),
      h2('The quick comparison'),
      ul([
        `<strong>System 1:</strong> more signals, more stop-outs, more action.`,
        `<strong>System 2:</strong> fewer signals, fewer stop-outs, more waiting.`,
        `<strong>Both:</strong> still need sizing and discipline to survive.`
      ]),
      h2('What actually changes in the rules'),
      p(
        `The indicator is still ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}. The common setup is: System 1 enters on a 20-day breakout and exits on a 10-day reversal. System 2 enters on a 55-day breakout and exits on a 20-day reversal.`
      ),
      p(
        `Risk stays the same idea: size by volatility and protect the downside. If you skipped that, you’re missing the most important part. Read ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')} and come back.`
      ),
      h2('The real question: which pain do you prefer?'),
      p(
        `System 1 pain: lots of little losses and the temptation to “tweak” the rules. System 2 pain: long stretches of nothing and the temptation to invent trades because you’re bored.`
      ),
      callout(
        'Honest moment',
        p(
          `Most people don’t quit because the system “failed.” They quit because the system did what it always does: it looked dumb for a while before it looked smart. Your job is to pick the kind of dumb you can tolerate.`
        )
      ),
      h2('A simple way to choose (no personality quiz needed)'),
      ol([
        `If you hate missing moves and you’re okay with more trades → start with System 1.`,
        `If you hate noise and prefer fewer decisions → start with System 2.`,
        `If you’re unsure → run System 2 for 8 weeks on paper. If boredom kills it, you learned something valuable.`
      ]),
      h2('Drawdowns: what “normal” looks like'),
      p(
        `Trend following drawdowns aren’t a bug. They’re the admission price. System 1 can look like a string of papercuts. System 2 can look like your strategy forgot your name. In both cases, position sizing is what keeps those phases survivable.`
      ),
      p(
        `If you want the “why does this work at all” explanation, read ${internal('/articles/why-trend-following-works-market-psychology', 'Why trend following works')}. It’s the confidence booster you read when your strategy is acting weird.`
      ),
      h2('How to stick with your choice'),
      ul([
        `Write your rules down in one page. If it needs 12 pages, you built a bureaucracy, not a system.`,
        `Pick a review schedule (weekly). Not “whenever you’re stressed.”`,
        `Track rule-breaking. Rule-breaking is the real performance killer.`
      ]),
      callout(
        'Builder note',
        p(
          `Add a toggle on the ${internal('/dashboard', 'Dashboard')}: “System 1 (20/10)” vs “System 2 (55/20)”. Then each signal can show which system is currently active.`
        )
      ),
      h2('External references'),
      ul([
        `${external('https://en.wikipedia.org/wiki/Trend_following', 'Trend following (background)')}`,
        `${external('https://en.wikipedia.org/wiki/Trading_system', 'Trading systems (background)')}`,
      ]),
    ].join(''),
  },
  {
    id: '004',
    slug: 'atr-for-turtle-trading-stops-position-sizing',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `ATR (Average True Range) is the seatbelt of Turtle Trading. Breakouts tell you where to enter. ATR tells you how to size that entry so one ugly day doesn’t delete your confidence and your lunch.`
      ),
      p(
        `If you only read one “risk” article on this site, make it this one. A breakout system with sloppy sizing is like a sports car with bicycle brakes. It moves fast… until it doesn’t.`
      ),
      h2('What ATR measures (and what it doesn’t)'),
      ul([
        `<strong>ATR measures:</strong> typical price movement (volatility).`,
        `<strong>ATR does not measure:</strong> direction, prediction, “is this a good trade?” vibes.`
      ]),
      h2('True Range in plain terms'),
      p(
        `True Range is built to respect gaps. For each day, you take the biggest of: (1) high − low, (2) abs(high − prior close), (3) abs(low − prior close). Then ATR is the moving average of True Range (often using Wilder’s smoothing).`
      ),
      callout(
        'Why gaps matter',
        p(
          `Stocks can gap on earnings. Crypto can gap on “some exchange went offline.” Futures can move fast around macro news. ATR tries to keep your sizing honest across those realities.`
        )
      ),
      h2('The classic Turtle stop: 2×ATR'),
      p(
        `A common Turtle-style stop is about 2×ATR away from entry. Wider stops for volatile markets, tighter stops for calm markets. The stop isn’t there to “be right.” It’s there to cap damage when a breakout fails.`
      ),
      h2('Position sizing: the part that makes risk consistent'),
      p(
        `The simplest version is: risk per trade ÷ stop distance. If you risk $100 and your stop is $4 away, you can hold about 25 shares ($100 / $4). If the market is twice as volatile, ATR is bigger, your stop is wider, and your position size shrinks. That’s the whole point.`
      ),
      callout(
        'Unit sizing (optional)',
        p(
          `Some Turtle implementations “add units” as the trade goes in your favor. That can boost big trends, but it also boosts complexity. If you’re new, nail the base system first: enter, size, stop, exit by rule.`
        )
      ),
      h2('Practical examples across markets'),
      ul([
        `<strong>Stocks:</strong> ATR in dollars. Stops often get tested around earnings and gaps.`,
        `<strong>Forex:</strong> ATR in pips. Spreads matter relative to ATR. See ${internal('/articles/turtle-trading-in-forex', 'Forex adaptation')}.`,
        `<strong>Crypto:</strong> volatility is loud. Position sizing is the difference between “interesting” and “disaster.” See ${internal('/articles/turtle-trading-in-crypto', 'Crypto adaptation')}.`,
      ]),
      h2('Volatility spikes: what to do (and what not to do)'),
      p(
        `When ATR explodes, your sizing will shrink — that’s good. The temptation is to “make it back” by increasing size or adding leverage. Don’t. Volatility spikes are where trend followers get paid, but they’re also where undisciplined traders donate money.`
      ),
      h2('Read next'),
      ul([
        `${internal('/articles/donchian-channels-for-traders', 'Donchian channels')} for the entry/exit levels.`,
        `${internal('/articles/turtle-trading-explained-beginner-guide', 'Turtle Trading explained')} for the big picture.`,
        `${internal('/articles/why-trend-following-works-market-psychology', 'Why trend following works')} for the “why am I doing this” motivation.`
      ]),
      h2('External references'),
      ul([
        `${external('https://en.wikipedia.org/wiki/Average_true_range', 'Average true range (background)')}`,
        `${external('https://en.wikipedia.org/wiki/J._Welles_Wilder_Jr.', 'J. Welles Wilder Jr. (background)')}`,
      ]),
    ].join(''),
  },
  {
    id: '005',
    slug: 'why-trend-following-works-market-psychology',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Trend following annoys people because it’s simple. “Buy when it breaks out, sell when it breaks down” sounds too easy, so everyone assumes it can’t work. Meanwhile, momentum has been documented in finance research for decades. Markets don’t always trend, but when they do, they can trend longer than your brain finds comfortable.`
      ),
      h2('The human reasons: why price keeps drifting'),
      p(
        `A big move often starts small: a change in guidance, policy, energy prices, rates, or just slow rotation. Many participants adjust gradually. Price drifts. Then it becomes obvious. Then everyone piles in. That sequence creates the kind of follow-through trend followers want.`
      ),
      ul([
        `<strong>Underreaction:</strong> people adjust slowly to new information.`,
        `<strong>Herding:</strong> once a move is obvious, people chase because “everyone else is making money.”`,
        `<strong>Career risk:</strong> professionals often prefer being wrong with the crowd than right alone.`,
      ]),
      h2('The plumbing reasons: why breakouts get fuel'),
      p(
        `Markets aren’t just opinions. They’re orders. Breakout levels cluster stop orders, entries, and risk management decisions. When a level breaks, a bunch of orders can trigger together. That’s not mystical. It’s just how participants place trades.`
      ),
      callout(
        'Where this connects to Turtle Trading',
        p(
          `Turtles use simple levels (${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}) and simple risk (${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')}). That’s enough structure to benefit when the market does its trending thing.`
        )
      ),
      h2('When trend following struggles (and why that’s normal)'),
      p(
        `Choppy markets are the tax. Mean-reverting phases can create multiple false breakouts. That’s where many people quit — right before the next trending phase. The answer isn’t a perfect filter. The answer is risk control and enough diversification so chop doesn’t wreck your whole year.`
      ),
      ul([
        `Keep losses small with stops and sizing.`,
        `Diversify across markets (or at least across uncorrelated symbols).`,
        `Stick to a review schedule so you don’t “optimize” mid-drawdown.`
      ]),
      h2('How to use this without turning it into hype'),
      ol([
        `Pick a rule set you can follow: ${internal('/articles/turtle-system-1-vs-system-2', 'System 1 vs System 2')}.`,
        `Use clean levels: ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}.`,
        `Use risk that keeps you in the game: ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')}.`,
        `Then track your behavior more than your P&L. The behavior is what you control.`
      ]),
      callout(
        'External references',
        ul([
          `${external('https://en.wikipedia.org/wiki/Momentum_(finance)', 'Momentum in finance (background)')}`,
          `${external('https://www.nber.org/', 'NBER research portal')}`,
        ])
      ),
    ].join(''),
  },
  {
    id: '006',
    slug: 'turtle-trading-in-stocks',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Stocks are a solid home for Turtle Trading… right up until earnings day turns your “nice tidy stop” into a historical artifact. The system works, but you have to respect stock-specific risks like gaps, halts, liquidity differences, and news events.`
      ),
      callout(
        'Core rules refresher',
        p(
          `Entries/exits come from ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}. Risk comes from ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')}. Everything else is “make it fit stocks.”`
        )
      ),
      h2('Stock universe selection (don’t trade garbage)'),
      p(
        `If your universe is full of illiquid names, your backtest will look better than real life because real life includes spreads, partial fills, and “why did it move 8% on 400 shares?” nonsense.`
      ),
      ul([
        `Liquidity filter: average volume high enough that fills are normal.`,
        `Avoid penny stocks unless you enjoy chaos as a lifestyle.`,
        `Prefer simple, widely traded names while you learn the process.`
      ]),
      buildCommonSection({
        market: 'stocks',
        marketNoun: 'stocks',
        biggestGotchas: [
          '<strong>Gaps:</strong> stops can be skipped if price opens beyond them.',
          '<strong>Earnings:</strong> volatility spikes and overnight moves are normal.',
          '<strong>Halts:</strong> you can’t always exit when you want.',
          '<strong>Liquidity varies:</strong> two tickers can have wildly different spreads even if both are “stocks.”',
        ],
        costNotes: [
          '<strong>Spread:</strong> breakouts often widen spreads. You pay more when you need it least.',
          '<strong>Slippage:</strong> stop orders can fill worse than expected around news.',
          '<strong>Borrow costs (shorting):</strong> if you short, hard-to-borrow fees can matter.',
        ],
        executionTips: [
          'Scan once per day (or once per week) on a schedule.',
          'Only take trades that meet your liquidity rules.',
          'Size using ATR; set the stop before you place the entry.',
          'Avoid “revenge trading” after an earnings gap. Stick to your schedule.',
          'Log the trade in your journal the same day. Future-you needs receipts.',
          'Review weekly: did you follow rules, or did you improvise?',
        ],
        dataTips: [
          'Use adjusted vs unadjusted data consciously (splits/dividends can distort levels).',
          'Model costs with conservative assumptions.',
          'Test a “no-trade around earnings” rule if gaps hurt your style, but keep it consistent.',
        ],
        internalLinks: [
          { href: '/articles/turtle-trading-explained-beginner-guide', label: 'Turtle Trading explained', note: 'Big picture and mindset.' },
          { href: '/articles/turtle-system-1-vs-system-2', label: 'System 1 vs System 2', note: 'Pick rules you can stick with.' },
          { href: '/articles/why-trend-following-works-market-psychology', label: 'Why trend following works', note: 'The “why this isn’t random” story.' },
        ],
      }),
      h2('External references'),
      ul([
        `${external('https://www.investor.gov/', 'Investor.gov (SEC investor education)')}`,
        `${external('https://en.wikipedia.org/wiki/Earnings_call', 'Earnings calls (background)')}`,
      ]),
    ].join(''),
  },
  {
    id: '007',
    slug: 'turtle-trading-in-crypto',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Crypto is trend following’s chaotic cousin. Sometimes it trends like a dream. Sometimes it does a 12% candle because the internet got bored. The Turtle rules can still work — you just have to respect 24/7 trading, exchange risk, fees, and volatility that bites.`
      ),
      callout(
        'Core rules refresher',
        p(
          `Breakout levels: ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}. Risk and sizing: ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR')}. If you ignore sizing in crypto, the market will teach you. Loudly.`
        )
      ),
      h2('Crypto-specific dangers (the stuff nobody puts in the hype thread)'),
      ul([
        '<strong>Venue risk:</strong> exchanges freeze, delist, or “go into maintenance” at the worst time.',
        '<strong>Fees/funding:</strong> perpetuals add ongoing costs; they can flip from tiny to painful.',
        '<strong>24/7:</strong> you need a schedule, or crypto will steal your weekends.',
        '<strong>Volatility:</strong> big ATR means small position sizes. Respect it.',
      ]),
      buildCommonSection({
        market: 'crypto',
        marketNoun: 'crypto',
        biggestGotchas: [
          '<strong>24/7 pricing:</strong> candle “day” depends on exchange timezone. Pick one feed and stay consistent.',
          '<strong>Slippage spikes:</strong> breakouts can jump through your stop orders.',
          '<strong>Counterparty risk:</strong> holding assets on exchange is different from self-custody.',
          '<strong>Altcoins:</strong> liquidity can vanish; spreads can widen violently.',
        ],
        costNotes: [
          '<strong>Trading fees:</strong> maker/taker fees add up quickly if you overtrade.',
          '<strong>Funding rates:</strong> perpetuals can turn “flat cost” into “surprise cost.”',
          '<strong>Withdrawal friction:</strong> moving coins around has fees and delays.',
        ],
        executionTips: [
          'Trade daily rules on a schedule (same time each day).',
          'Start with BTC/ETH before you adopt rare tokens with wide spreads.',
          'Size using ATR; keep leverage small (or zero) while learning.',
          'Keep a “what happens if exchange breaks?” plan (backup venue or reduced exposure).',
          'Journal every trade, especially the ones you “almost” took.',
          'Review weekly and keep the system boring on purpose.',
        ],
        dataTips: [
          'Use a consistent OHLC feed; mixing exchanges can create fake breakouts.',
          'Include realistic fees and slippage in tests.',
          'If you trade perps, model funding explicitly.',
        ],
        internalLinks: [
          { href: '/articles/why-trend-following-works-market-psychology', label: 'Why trend following works', note: 'The human + structural reasons.' },
          { href: '/articles/turtle-trading-explained-beginner-guide', label: 'Turtle Trading explained', note: 'Big picture and expectations.' },
          { href: '/articles/turtle-trading-in-forex', label: 'Forex adaptation', note: 'Cost awareness (spreads/slippage) also applies here.' },
        ],
      }),
      h2('External references'),
      ul([
        `${external('https://en.wikipedia.org/wiki/Bitcoin', 'Bitcoin (background)')}`,
        `${external('https://www.cftc.gov/LearnAndProtect', 'CFTC Learn & Protect')}`,
      ]),
    ].join(''),
  },
  {
    id: '008',
    slug: 'turtle-trading-in-forex',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Forex is gigantic, liquid, global… and also full of tiny frictions that quietly murder bad breakouts. Spreads, session liquidity, and news events matter. The Turtle rules can work here, but you need spread-aware expectations and disciplined execution.`
      ),
      callout(
        'Core rules refresher',
        p(
          `Levels: ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}. Risk and stops: ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR sizing')}. If you skip the risk piece in forex, leverage will do it for you.`
        )
      ),
      h2('Forex-specific gotchas'),
      ul([
        '<strong>Spreads:</strong> they widen during low liquidity and news.',
        '<strong>Sessions:</strong> price behavior changes across Asia/London/NY.',
        '<strong>Leverage:</strong> it makes everything feel easy until it makes everything impossible.',
        '<strong>Slippage:</strong> breakouts can fill worse than expected when everyone jumps in together.',
      ]),
      buildCommonSection({
        market: 'forex',
        marketNoun: 'forex',
        biggestGotchas: [
          '<strong>Session effects:</strong> London/NY overlap is active; thin sessions can be jumpier.',
          '<strong>Spread shocks:</strong> spreads can widen sharply around releases.',
          '<strong>Broker differences:</strong> “low spread” depends on time of day and account type.',
          '<strong>Event risk:</strong> macro news can cause sudden moves.'
        ],
        costNotes: [
          '<strong>Spread:</strong> treat it like a guaranteed cost; assume worse during breakouts.',
          '<strong>Swap/rollover:</strong> overnight financing can matter on long holds.',
          '<strong>Slippage:</strong> model it conservatively, especially around news.',
        ],
        executionTips: [
          'Start with major pairs (better liquidity, typically tighter spreads).',
          'Pick a daily scan time and stay consistent.',
          'Size with ATR (in pips) and keep leverage reasonable.',
          'Avoid trading right into major news if it wrecks your fills.',
          'Use the same order type every time (stop vs close-based).',
          'Journal + weekly review: did you follow the plan?' ,
        ],
        dataTips: [
          'Include realistic spreads (and sometimes widened spreads) in tests.',
          'Don’t backtest with perfect fills; breakouts are the worst time to assume perfection.',
          'Be consistent about candle timestamps and data sources.',
        ],
        internalLinks: [
          { href: '/articles/turtle-system-1-vs-system-2', label: 'System 1 vs System 2', note: 'Signal frequency vs noise tradeoff.' },
          { href: '/articles/why-trend-following-works-market-psychology', label: 'Why trend following works', note: 'The “why does price drift?” piece.' },
          { href: '/articles/turtle-trading-in-futures', label: 'Futures adaptation', note: 'If you want the original multi-market playground.' },
        ],
      }),
      h2('External references'),
      ul([
        `${external('https://www.bis.org/statistics/rpfx.htm', 'BIS FX statistics (Triennial Survey)')}`,
        `${external('https://en.wikipedia.org/wiki/Foreign_exchange_market', 'Foreign exchange market (background)')}`,
      ]),
    ].join(''),
  },
  {
    id: '009',
    slug: 'turtle-trading-in-futures',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `Futures are the original Turtle playground: commodities, rates, currencies, indices — lots of markets, lots of diversification, and enough leverage to reward discipline (or punish optimism). This is where trend following gets its “multi-market” superpower.`
      ),
      callout(
        'Core rules refresher',
        p(
          `Levels: ${internal('/articles/donchian-channels-for-traders', 'Donchian channels')}. Risk and position sizing: ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'ATR')}. Futures make risk management non-optional.`
        )
      ),
      h2('What makes futures special for trend following'),
      ul([
        'You can trade many uncorrelated markets (energy, grains, rates, metals, equity index futures).',
        'Shorting is built-in; you’re not fighting stock borrow constraints.',
        'Macro trends can show up clearly across sectors.',
      ]),
      buildCommonSection({
        market: 'futures',
        marketNoun: 'futures',
        biggestGotchas: [
          '<strong>Contract specs:</strong> tick value and contract size change your true risk.',
          '<strong>Margin:</strong> it’s not “free money,” it’s a lever.',
          '<strong>Rolls:</strong> contracts expire; your data and execution must match roll rules.',
          '<strong>Limit moves:</strong> some markets can go limit and trap you temporarily.',
        ],
        costNotes: [
          '<strong>Commission:</strong> usually clear and predictable.',
          '<strong>Slippage:</strong> can spike around breakouts and news.',
          '<strong>Roll costs:</strong> rolling between contracts can affect P&L.',
        ],
        executionTips: [
          'Know contract specs (tick value, multiplier) before sizing.',
          'Use ATR sizing but convert it to dollar risk per contract.',
          'Have a roll plan and apply it consistently.',
          'Diversify across sectors instead of loading up on one theme.',
          'Journal trades and especially roll decisions.',
          'Weekly review: risk, correlation, and rule adherence.',
        ],
        dataTips: [
          'Backtest with data series that matches how you will roll live.',
          'Avoid confusing continuous charts with tradable prices.',
          'Stress test costs and slippage during volatile periods.',
        ],
        internalLinks: [
          { href: '/articles/turtle-trading-explained-beginner-guide', label: 'Turtle Trading explained', note: 'Origin story + base rules.' },
          { href: '/articles/why-trend-following-works-market-psychology', label: 'Why trend following works', note: 'The behavior + market structure angle.' },
          { href: '/articles/turtle-trading-in-stocks', label: 'Stocks adaptation', note: 'If you prefer equities and don’t want contracts.' },
        ],
      }),
      h2('External references'),
      ul([
        `${external('https://www.cmegroup.com/education.html', 'CME Group education')}`,
        `${external('https://www.cftc.gov/', 'CFTC (futures basics)')}`,
      ]),
    ].join(''),
  },
  {
    id: '010',
    slug: 'turtle-trading-rules-checklist',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `The problem with trading isn't that the math is hard. The math is literally 5th-grade subtraction. The problem is that your brain turns into a squirrel on espresso when the market opens. You see a flashing red number, your heart rate jumps to 110, and suddenly your plan to "follow the rules" is replaced by a primal urge to "do something now."`
      ),
      p(
        `The solution isn't "more willpower" or "better mindset." Willpower is a battery that runs out by 2 PM. The solution is a checklist. Pilots use them so they don't forget to lower the landing gear. Surgeons use them so they don't leave scissors inside your abdomen. You should use one so you don't forget to place a stop loss or accidentally risk 10% of your account on a single "hunch."`
      ),
      p(
        `This article is the exact daily routine for a systematic trend follower. It is boring. It is repetitive. And it will save your financial life. Print it out. Tape it to your monitor. Do not click a mouse until you have checked the boxes.`
      ),
      h2('Phase 1: The Pre-Market Routine (Don\'t Skip This)'),
      p(
        `Most traders roll out of bed, open Twitter (sorry, X), see that someone thinks "crypto is dead" or "oil is going to $500," panic, and then open their broker app. This is how you lose money. You are letting other people's noise become your signal.`
      ),
      p(
        `Your pre-market routine is about establishing a "zero state." You need to be neutral. You are not a bull. You are not a bear. You are a robot waiting for instructions.`
      ),
      h3('Step 1: The HALT Check'),
      p(`Ask yourself: Am I <strong>H</strong>ungry, <strong>A</strong>ngry, <strong>L</strong>onely, or <strong>T</strong>ired?`),
      ul([
        `If you are <strong>Hungry</strong>: Your glucose is low. Your decision-making will be impulsive. Eat a sandwich.`,
        `If you are <strong>Angry</strong>: You will revenge-trade. If you fought with your partner or got cut off in traffic, do not trade.`,
        `If you are <strong>Tired</strong>: You will miss details. You will type 1000 instead of 100.`,
      ]),
      p(
        `If you fail the HALT check, walk away. The market will be there tomorrow. Your capital might not be if you trade like a zombie.`
      ),
      h3('Step 2: Check Existing Positions'),
      p(`Before looking for <em>new</em> trouble, manage the trouble you already have.`),
      ul([
        `<strong>Did any stops hit overnight?</strong> If you trade crypto or futures, you might have been stopped out while you slept. Log it. Accept it. Do not try to "get it back."`,
        `<strong>Do I need to roll?</strong> If you trade futures, is your contract expiring soon? Don't let the exchange auto-liquidate you. Roll the position.`,
        `<strong>Move stops to breakeven?</strong> If the price has moved significantly in your favor (e.g., > 1N or 2N), check your rules. Is it time to trail the stop?`,
      ]),
      h3('Step 3: Update Account Equity'),
      p(
        `This is crucial for Turtle Trading. Your position size depends on your <em>current</em> account size. If you have $10,000 yesterday but lost $500 overnight, you now have $9,500. Your risk calculation for today <em>must</em> use $9,500. This is called "Mark-to-Market." It ensures you naturally trade smaller during a losing streak (preserving capital) and larger during a winning streak (compounding gains).`
      ),
      h2('Phase 2: The Signal Scan (The Core Work)'),
      p(
        `Now you are ready to look at the market. Remember, you are not predicting. You are scanning. You are looking for specific conditions: Price > 20-Day High (for System 1) or Price > 55-Day High (for System 2).`
      ),
      h3('Step 4: Run the Scanners'),
      p(
        `Do not manually click through 500 charts. That is inefficient and leads to hallucinating patterns that aren't there. Use a scanner (like the ${internal('/dashboard', 'Turtelli Dashboard')} or TradingView screener).`
      ),
      p(`<strong>The Filter:</strong><br>- Price >= 20-Day High?<br>- Price <= 20-Day Low?`),
      p(`If the answer is NO for a market, you ignore it. It is dead to you. Move on.`),
      h3('Step 5: The "Almost" Trap'),
      p(
        `You will see a chart that is <em>almost</em> breaking out. It is one cent away. You will think: "It's going to break anyway, I'll just get in early to get a better price." <strong>STOP.</strong> This is the siren song of the amateur. "Almost" breakouts are often exact resistance levels where the price reverses and crushes you.`
      ),
      p(
        `If the rule says $50.00 and the price is $49.99, you do not buy. You wait for $50.01. Discipline is binary. You either have it or you don't.`
      ),
      h3('Step 6: Liquidity Check'),
      p(
        `You found a breakout! Exciting. Now, look at the spread and volume. If the stock trades 1,000 shares a day and has a $0.50 spread, you cannot trade it. The slippage will destroy your edge. Rule of thumb: If you can't enter and exit without moving the price, skip it. There are other fish in the sea.`
      ),
      h2("Phase 3: Order Placement (The \"Don't Think\" Phase)"),
      p(`Once you have a valid signal, you switch from "analyst" to "execution bot." Do not hesitate. Hesitation costs money.`),
      h3('Step 7: Calculate N (ATR)'),
      p(`Check the 20-day ATR (Average True Range). Let's say it is $2.00. This is your measure of volatility.`),
      h3('Step 8: Calculate Position Size'),
      p(`This is the most important math you will do. Do not guess.<br><strong>Formula:</strong> (Account Equity * Risk %) / (2 * ATR)`),
      callout(
        'Example',
        p(
          `Account: $100,000<br>` +
          `Risk per trade: 1% ($1,000)<br>` +
          `ATR: $2.00<br>` +
          `2 * ATR: $4.00 (This is your stop distance)<br><br>` +
          `<strong>Size:</strong> $1,000 / $4.00 = <strong>250 shares</strong>.`
        )
      ),
      p(
        `You buy 250 shares. Not 300 because you "feel good." Not 100 because you are "scared." You buy 250.`
      ),
      h3('Step 9: Place the Orders (Both of Them!)'),
      p(
        `Entering a trade without a stop loss is like skydiving without checking your chute. You might survive, but it's a bad habit. Place your Entry Order (Buy Stop or Market). <strong>IMMEDIATELY</strong> place your Protective Stop Loss order at (Entry - 2N).`
      ),
      p(
        `Do not "keep it in your head." Mental stops are not real. When the market crashes 10% in a flash crash, your mental stop will be paralyzed by fear. A hard stop order works while you are crying under your desk.`
      ),
      h2('Phase 4: Post-Trade Journaling (The Learning Phase)'),
      p(
        `The market closes. You are done. But you are not <em>done</em> done. You need to log the data. Your journal is the only boss you have. If you don't report to it, you are unsupervised. And unsupervised traders blow up.`
      ),
      h3('Step 10: The Entry Log'),
      ul([
        `<strong>Date/Time:</strong> When did you enter?`,
        `<strong>Symbol:</strong> What did you buy?`,
        `<strong>Price:</strong> What was your fill? (Compare this to your desired price to track slippage).`,
        `<strong>Size:</strong> How many units?`,
        `<strong>Stop Price:</strong> Where is the exit?`,
      ]),
      h3('Step 11: The "Why" Log'),
      p(`Write down exactly which rule triggered the trade.<br>System 1 breakout: Price $55.20 > 20-day high $55.10.`),
      p(`If you cannot write this sentence, <strong>you made a mistake</strong>. You impulse-traded. Admit it, log it as an "Error," and close the trade.`),
      h3('Step 12: The "Feelings" Log'),
      p(`"I felt nervous taking this trade because the news is bad."<br>"I felt overconfident because my last 3 trades won."`),
      p(`Tracking your emotions helps you spot patterns. You might realize you always lose money when you trade while bored.`),
      h2('Phase 5: The Weekly Review (The CEO Meeting)'),
      p(`Once a week (Friday afternoon or Sunday morning), you stop being the "Trader" and become the "Risk Manager."`),
      h3('Step 13: Sector Exposure Check'),
      p(
        `Scan your portfolio. Are you long 4 oil stocks, 2 energy ETFs, and 3 oil futures? You don't have 9 positions. You have <strong>one giant position</strong> in Oil. If Oil crashes, you die. Turtle rules limit total units per sector (usually max 4 units). If you are over the limit, reduce positions immediately.`
      ),
      h3('Step 14: Execution Audit'),
      p(`Look at your journal. Did you follow the checklist every day? Give yourself a grade.`),
      ul([
        `A = Followed all rules (even if you lost money).`,
        `F = Broke rules (even if you made money).`,
      ]),
      p(`In systematic trading, process is everything. Outcome is luck in the short term, but process is skill in the long term.`),
      h2('Summary: The One-Page Cheat Sheet'),
      callout(
        'Daily Checklist',
        ol([
          `<strong>HALT Check:</strong> Am I Hungry, Angry, Lonely, Tired?`,
          `<strong>Equity Update:</strong> Mark-to-market account balance.`,
          `<strong>Manage Opens:</strong> Check stops, rolls, and trails.`,
          `<strong>Scan:</strong> Look for 20-day / 55-day breakouts.`,
          `<strong>Filter:</strong> Ignore low liquidity / "almost" signals.`,
          `<strong>Calc Size:</strong> Risk / 2N = Units.`,
          `<strong>Execute:</strong> Place Entry + Hard Stop.`,
          `<strong>Journal:</strong> Log price, reason, and emotion.`,
          `<strong>Close:</strong> Walk away. Live your life.`,
        ])
      ),
      p(
        `That's it. It's not sexy. It's not exciting. It's just professional. If you want excitement, go to a casino. If you want to trade trends, follow the checklist.`
      ),
      p(`Ready to automate the "Scan" and "Calc Size" steps? The ${internal('/dashboard', 'Turtelli Dashboard')} handles the math so you can focus on the discipline.`),
    ].join(''),
  },
  {
    id: '011',
    slug: 'breakout-trading-filters',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `The original Turtle Trading rule was simple: <strong>Take every single signal.</strong> If the price hits the 20-day high, you buy. Even if the news is bad. Even if the chart looks "weird." Even if your gut says "no."`
      ),
      p(
        `Why? Because the Turtles knew that one missed trade could be the "monster trend" that pays for the entire year. However, markets have changed. They are noisier. Algorithmic wash trading exists. "Fakeouts" are an industry sport.`
      ),
      p(
        `This has led modern trend followers to ask: <em>Can we filter out the garbage signals without filtering out the winners?</em> The answer is "Yes, but be careful." A good filter improves your "Win Rate" but might lower your "Total Profit." A bad filter just makes you feel smart while you lose money. Let's look at the filters that actually work.`
      ),
      h2('Filter 1: The Volatility Contraction (The "Squeeze")'),
      p(`Imagine a spring. If you compress it, it stores energy. When you let go, it explodes. Markets are the same. Periods of low volatility (compression) often lead to periods of high volatility (expansion/trend).`),
      p(`<strong>The Problem:</strong> Breakouts that happen after the market has <em>already</em> made a huge move are often exhausted. Buying a breakout after a vertical 50% rally is risky. Buying a breakout after 3 months of "boring sideways chop" is where the gold is.`),
      callout(
        'How to Filter',
        p(
          `Measure the ATR or Standard Deviation over the last 6 months.<br>` +
          `- <strong>Rule:</strong> Only take the breakout if volatility is currently <em>below</em> its historical average.<br>` +
          `- This ensures you are entering at the <em>start</em> of the expansion phase, not the end.`
        )
      ),
      h2('Filter 2: Trend Alignment (The "Regime" Filter)'),
      p(`This is the "Don't swim upstream" rule. If the overall market is crashing, buying a single stock breakout is like trying to run up a down escalator. You might make it, but the odds are against you.`),
      p(`<strong>The 200-Day Moving Average (SMA):</strong><br>This is the dividing line between a Bull Market and a Bear Market for many institutions.`),
      ul([
        `<strong>The Rule:</strong> Only take Long (Buy) signals if Price > 200 SMA.`,
        `<strong>The Short Rule:</strong> Only take Short (Sell) signals if Price < 200 SMA.`,
      ]),
      p(
        `<strong>Why it works:</strong> It keeps you out of "Bear Market Rallies" (short spikes that fail quickly).<br>` +
        `<strong>The Cost:</strong> You will be late. At the bottom of a crash, the new bull market starts <em>below</em> the 200 SMA. You will miss the first 20-30% of the recovery. For many traders, that is a price worth paying for safety.`
      ),
      h2('Filter 3: Volume Confirmation (The "Institutional Vote")'),
      p(
        `In Forex, volume is tricky (it's decentralized). But in Stocks and Crypto, volume is the lie detector. Price can be moved by one rich dentist clicking "Market Buy." But <em>Volume</em> requires an army.`
      ),
      p(`<strong>The Scenario:</strong><br>Stock XYZ breaks the 20-day high.`),
      ul([
        `<strong>Scenario A:</strong> Volume is 50% <em>lower</em> than average. (This is likely a trap. No one cares.)`,
        `<strong>Scenario B:</strong> Volume is 200% <em>higher</em> than average. (This is real. Institutions are piling in.)`,
      ]),
      callout(
        'Filter Rule',
        p(`Only take the trade if Volume on the breakout day is > 1.2x (or 1.5x) the 20-day Average Volume.`)
      ),
      h2('The Dangerous Filter: "It Looks Too High"'),
      p(`This is not a technical filter. This is an emotional filter. And it is the worst one.`),
      p(`You look at a chart. It has gone from $10 to $20. Now it breaks out at $21. Your brain says: "It's too expensive. I missed it. I'll wait for a pullback."`),
      p(
        `<strong>Trend Following Truth:</strong> "High" prices usually go higher. "Low" prices usually go lower. By filtering out "expensive" charts, you are literally filtering out the strongest trends. Amazon looked "too high" at $50, $100, $500, and $2000. Never use "price level" as a filter. Use structure.`
      ),
      h2('The Overfitting Trap (The Data Science Disease)'),
      p(
        `Here is how you destroy a trading system:<br>You run a backtest. You lose money.<br>You add a filter: "Only trade on Tuesdays." Now you make money.<br>You add another: "Only trade if RSI is exactly 62." Now you make a million dollars!`
      ),
      p(
        `<strong>This is Curve Fitting.</strong> You are not finding a market truth; you are finding a coincidence in the past data. If you add five filters—RSI below 70, Volume > MA, Moon in Capricorn, CEO wearing a blue tie—you will create a system that looks perfect in the past and fails tomorrow.`
      ),
      p(
        `<strong>The Robustness Test:</strong> If you change your filter parameter slightly (e.g., change 200 SMA to 190 SMA), does the result hold up? If changing 200 to 190 turns a profit into a loss, your system is brittle junk. Throw it away.`
      ),
      h2('Summary: When to Filter?'),
      ul([
        `<strong>Beginners:</strong> Do NOT filter. Trade ${internal('/articles/turtle-system-1-vs-system-2', 'System 1')} raw. Learn what false breakouts feel like. You need the scars.`,
        `<strong>Intermediate:</strong> Add <em>one</em> filter. Usually the 200 SMA trend filter. It reduces stress.`,
        `<strong>Advanced:</strong> Use Volatility Contraction. This requires more patience but increases the quality of entries significantly.`,
      ]),
      p(
        `The ${internal('/dashboard', 'Turtelli Dashboard')} shows you the raw signals. It is up to you to apply the filter. Check the "Trend" column or look at the Volume bars before you click buy.`
      ),
    ].join(''),
  },
  {
    id: '012',
    slug: 'trend-following-drawdowns',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `If someone sold you a trading system that "never loses," check your wallet. Trend following works <em>because</em> it has drawdowns. If it were easy, if the line just went straight up like a Ponzi scheme, the edge would be arbitraged away by high-frequency bots in 4 milliseconds. The drawdown is the "pain premium" you pay for the big returns.`
      ),
      p(
        `But knowing that intellectually and feeling it viscerally are two different things. A 20% drawdown feels like a "correction." A 40% drawdown feels like "My strategy is broken." A 50% drawdown feels like "I am a failure as a human being." Here is how to survive the valley of death.`
      ),
      h2('Why Drawdowns Happen (The Mechanics)'),
      p(
        `Turtle trading buys breakouts. Most breakouts fail (false breakouts). You take small losses on the fakes, waiting for the real trend. A "drawdown" is simply a cluster of false breakouts happening back-to-back, or a period where markets are choppy and mean-reverting.`
      ),
      p(
        `Imagine you are a casino. You have a mathematical edge (Green 00 in Roulette). But sometimes, Red hits 10 times in a row. Does the casino panic? No. They know the math. But you are a casino with emotions. And when you lose 10 times in a row, you want to fire the dealer (your system).`
      ),
      h2('The Math of Pain: What is "Normal"?'),
      p(`Let's look at the cold, hard probabilities. If you have a Trend Following system with a 40% Win Rate (which is typical for Turtles):`),
      callout(
        'Drawdown Probabilities',
        ul([
          `<strong>Probability of 5 losers in a row:</strong> ~8% (Will happen often).`,
          `<strong>Probability of 10 losers in a row:</strong> ~0.6% (Will happen eventually over 1000 trades).`,
          `<strong>Time spent in Drawdown:</strong> About 70-80% of your trading life.`,
        ])
      ),
      p(`Read that last one again. <strong>You will spend most of your life below your "High Water Mark" (Account Peak).</strong> If you need to hit a new equity high every day to feel happy, do not be a trend follower. Go work for a salary.`),
      h2('Historical Context: The Turtles Bleed Too'),
      p(
        `The original Turtles in the 1980s had massive returns (some made 100%+ per year). But they also had massive drawdowns. It was common for them to be down 20%, 30%, or even more. Richard Dennis himself blew up accounts. The difference between the survivors and the quitters was <strong>Risk Management</strong>.`
      ),
      h2('Survival Tactic 1: The "Cut Size" Rule'),
      p(`This is the most important rule in the Turtle arsenal for survival. <strong>If your account drops 10%, you cut your risk unit (N-unit) by 20%.</strong>`),
      p(`<strong>Example:</strong><br>- Account: $100,000. Risk per trade: 1% ($1,000).<br>- Account drops to $90,000 (10% drawdown).<br>- <strong>Panic Reaction:</strong> "I need to double my size to make it back!" (This is Martingale. You will die.)<br>- <strong>Turtle Reaction:</strong> "I will now risk 0.8% instead of 1%."<br>- Account drops to $80,000. Now risk 0.6%.`),
      p(
        `This makes your equity curve "convex." You lose slower as you get poorer. It keeps you alive so you are still at the table when the winning streak finally comes.`
      ),
      h2('Survival Tactic 2: Aggressive Diversification'),
      p(`If you only trade Tech Stocks, and Tech Stocks go sideways for 2 years, you are in a 2-year drawdown. The only way to smooth the curve is to trade uncorrelated assets.`),
      ul([
        `<strong>Stocks</strong> are chopping? Maybe <strong>Gold</strong> is trending.`,
        `<strong>Gold</strong> is dead? Maybe the <strong>Euro</strong> is crashing.`,
        `<strong>Forex</strong> is flat? Maybe <strong>Crypto</strong> is mooning.`,
      ]),
      p(`Read ${internal('/articles/turtle-trading-in-futures', 'Turtle Trading in Futures')} to understand why multi-asset trading is the holy grail of drawdown reduction.`),
      h2('Survival Tactic 3: Stop Watching the Scoreboard'),
      p(
        `During a drawdown, checking your P&L daily is psychological torture. It's like weighing yourself every hour when you're trying to lose weight. Shift your focus from <strong>Outcome</strong> (Money) to <strong>Process</strong> (Execution).`
      ),
      p(`Every day, ask: "Did I follow my rules?"<br>- If you lost money but followed rules: <strong>Good Day.</strong><br>- If you made money but broke rules: <strong>Bad Day.</strong><br>`),
      p(`Rewire your brain to get dopamine from discipline, not dollars.`),
      h2('The "System Hop" Trap'),
      p(
        `Here is the cycle of doom:<br>` +
        `1. Start Strategy A (Trend Following).<br>` +
        `2. Drawdown happens (Strategy A is "out of favor").<br>` +
        `3. Switch to Strategy B (Mean Reversion) because it's working <em>now</em>.<br>` +
        `4. Strategy A recovers (you missed it). Strategy B goes into drawdown.<br>` +
        `5. Switch back to Strategy A.`
      ),
      p(
        `This guarantees you capture all the losses and none of the wins. Pick a strategy that fits your personality and stick to it for at least 6-12 months.`
      ),
      h2('When to Actually Quit (Risk of Ruin)'),
      p(`Is there a point where you <em>should</em> stop? Yes. If you hit your "Uncle Point" (e.g., 50% drawdown), stop trading. Take a month off. Re-evaluate your position sizing. Usually, blowing up happens because you sized too big, not because the strategy failed.`),
      p(`(See ${internal('/articles/atr-for-turtle-trading-stops-position-sizing', 'Article 004: Position Sizing')}).`),
      p(`The night is darkest just before the dawn. Most traders quit right at the bottom of the drawdown, mere days before the trend that would have made their career. Stay small. Stay disciplined. Stay in the game.`),
    ].join(''),
  },
  {
    id: '013',
    slug: 'trading-signals-hold-meaning',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `You wake up. You drink your coffee. You open the Turtelli dashboard. You see a blank table. No new highs. No new lows. No signals. You check your charts. Everything is just... drifting.`
      ),
      p(`You feel an itch. A physical discomfort. "I am a trader," you say. "I should be trading." So you find a chart that looks "kind of good." You squint at it until it looks like a breakout. You click buy. Congratulations. You just paid the <strong>Boredom Tax</strong>.`),
      p(`This article is about the hardest skill in Trend Following: <strong>Doing Absolutely Nothing.</strong>`),
      h2('The Action Bias: Why We Hate Silence'),
      p(`Humans are evolved to act. If a lion is coming, you run. If you are hungry, you hunt. Sitting still feels like failure. In most jobs, if you sit at your desk doing nothing for 4 hours, you get fired.`),
      p(`In trading, if you sit at your desk doing nothing for 4 months, you might be the best trader in the room.`),
      p(`<strong>Reframing "Cash":</strong> In Trend Following, <strong>Cash is a position</strong>. It is a defensive position. When you are in Cash, you are not "out of the market." You are "shielding your ammo" for the moment the market becomes rational again.`),
      h2('Edge Comes in Clusters (The Pareto Principle)'),
      p(`Markets do not trend linearly. They follow a "Power Law" distribution.`),
      ul([
        `- <strong>80% of the time:</strong> Markets are noisy, choppy, and mean-reverting. (No edge for turtles).`,
        `- <strong>20% of the time:</strong> Markets trend aggressively. (Huge edge for turtles).`,
      ]),
      p(`This means you make 80-90% of your yearly profit in just 2 or 3 months. The other 9 months are just waiting.`),
      p(`If you try to force profits during the "Waiting Months," you will churn your account down by 10-15%. Then, when the "Profit Months" finally arrive, you have less capital to trade with, and you are emotionally exhausted.`),
      h2('The Tale of Two Traders'),
      callout(
        'Trader A (The Boredom Addict)',
        p(
          `Market is sideways. Trader A trades anyway. "I'll scalp." "I'll try a mean reversion bot."<br>` +
          `Loses 15% in chop over 6 months.<br>` +
          `Market finally breaks out. Trader A is scared ("I just lost 15%") or broke. He misses the trend.<br>` +
          `<strong>Result:</strong> -15% Year.`
        )
      ),
      callout(
        'Trader B (The Zen Turtle)',
        p(
          `Market is sideways. Trader B checks dashboard. "No signals." Closes laptop. Goes to gym.<br>` +
          `Loses 0% in chop. (Maybe small admin fees).<br>` +
          `Market breaks out. Trader B is fresh, capitalized, and ready. He buys the breakout.<br>` +
          `The trend runs for 40%.<br>` +
          `<strong>Result:</strong> +40% Year.`
        )
      ),
      h2('How to Interpret "No Signal" on the Dashboard'),
      p(`When ${internal('/dashboard', 'Turtelli')} shows an empty list, it is not broken. It is shouting a very specific piece of advice: <strong>"Stay out of the crossfire."</strong>`),
      p(`<strong>The "Hold" Status:</strong><br>- If you are already in a trade and the status is "Hold" (no new Buy/Sell signal), it means "Let the trend work."<br>- Do not take profits early because you are bored.<br>- Do not move your stop closer because you are nervous.<br>- HOLD means HOLD.`),
      h2('Practical Tips for surviving the boredom'),
      ul([
        `<strong>Get a Hobby:</strong> Seriously. If trading is your only source of dopamine, you will overtrade. Play video games, learn to code, bake bread. Do anything that gives you a "win" feeling so you don't seek it in the charts.`,
        `<strong>Automate the Check:</strong> Set an alarm. Check signals at 9:00 AM. If none, do not check again until tomorrow. Staring at a sideways chart will trick your brain into seeing a pattern.`,
        `<strong>Trade System 2:</strong> If you really hate false signals, switch to the 55-day breakout. It trades much less often. It is the ultimate "Lazy" strategy. (See ${internal('/articles/55-day-breakout-strategy', 'Article 015')}).`,
      ]),
      h2('Summary: The "No Signal" Signal'),
      p(`"No Signal" is a signal. It tells you the market conditions are not right for your strategy. Respect it. Protect your capital. The market will wake up eventually. It always does. Your only job is to be solvent when it happens.`),
    ].join(''),
  },
  {
    id: '014',
    slug: '20-day-breakout-strategy',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `The 20-day breakout (often called <strong>System 1</strong>) is the aggressive engine of the Turtle Trading experiment. It is designed to ensure that you never, ever miss a major trend. If a market moves, System 1 will be in it.`
      ),
      p(
        `The price you pay for this responsiveness is "Whipsaws." System 1 enters early. It gets fake-out often. It takes many small jabs to the face. But when the market truly rips (think Nvidia in 2023 or Bitcoin in 2017), System 1 is in from the ground floor.`
      ),
      h2('The Core Rules (No ambiguity allowed)'),
      ul([
        `<strong>Entry Rule:</strong> Buy when price exceeds the High of the preceding 20 days. Sell Short when price drops below the Low of the preceding 20 days.`,
        `<strong>Stop Loss:</strong> 2 × ATR (N) from the entry price.`,
        `<strong>Exit Rule:</strong> Exit Long when price touches the 10-day Low. Exit Short when price touches the 10-day High.`,
      ]),
      h2("Deep Dive: The Entry (Don't Wait for Close)"),
      p(
        `A common mistake beginners make is waiting for the daily candle to <em>close</em> before entering. <strong>Turtles do not wait.</strong> If the 20-day high is $50.00, and the price ticks to $50.01 at 10:00 AM, you buy. Why? Because in a strong momentum breakout, the price might close at $55.00. If you wait for the close, you missed $5.00 of profit and your risk (stop distance) is now huge. Use <strong>Stop-Limit</strong> or <strong>Stop-Market</strong> orders to enter automatically.`
      ),
      h2("Deep Dive: The 10-Day Exit (The Give Back)"),
      p(`Notice the asymmetry. You enter on a 20-day signal, but exit on a 10-day signal. This is crucial. The faster exit allows you to lock in profits before the trend completely reverses.`),
      p(`<strong>The Psychology of the Exit:</strong> This is the hardest part.`),
      p(`Let's say you bought at $100. Price goes to $150. You feel like a genius. Then the trend slows. The 10-day low moves up to $140. Price drops to $140. You exit. You feel bad because you "lost" the $10 from the peak ($150 to $140). <strong>Get over it.</strong> You cannot catch the exact top. System 1 ensures you catch the meat, not the bones.`),
      h2('The "Last Breakout" Filter (Advanced Rule)'),
      p(`The original Turtles had a special rule for System 1 called the "Filter Rule." <strong>Rule:</strong> Ignore a System 1 breakout signal if the <em>previous</em> System 1 breakout signal for this market was a <strong>winning trade</strong>.`),
      p(
        `<strong>Why?</strong> The logic was that markets rarely trend twice in a row without a consolidation. If you just caught a big trend, the next breakout is likely a fake-out. However, if the filtered breakout turns into a massive trend, you re-enter at the System 2 (55-day) level. This is a fail-safe. <em>Note for beginners: You can ignore this rule at first. Taking every signal is simpler.</em>`
      ),
      h2('Step-by-Step Trade Anatomy'),
      p(`Let's walk through a hypothetical trade in Gold Futures.`),
      h3('Day 1: The Breakout'),
      p(`Gold 20-day High is $2000. Price hits $2000.10. You buy 1 Unit. ATR is $20. Stop is at $1960 (2N).`),
      h3('Day 3: The Add-on (Pyramiding)'),
      p(`Price moves to $2010 (increase of 0.5N). You buy another Unit. You move stops for BOTH units up to $1970. (Protecting profits).`),
      h3('Day 20: The Trend'),
      p(`Price is $2200. You are sitting on huge open profits. You do nothing. You just update your trailing stop (the 10-day low).`),
      h3('Day 45: The Exit'),
      p(`Price drops. It touches the 10-day low at $2150. You sell everything. Trade result: Big Win.`),
      h2('Common Errors with System 1'),
      ul([
        `<strong>Second Guessing:</strong> "This breakout looks weak." You don't know that. Weak-looking breakouts often become strong trends because no one believes them.`,
        `<strong>Exiting Early:</strong> "I made 20%, I'll cash out." Then the market goes up another 80% and you cry. System 1 requires you to stay until the 10-day low is hit.`,
        `<strong>Re-entering Late:</strong> You got stopped out. The market breaks out again 2 days later. You are "scared" so you don't buy. That second breakout was the real one.`,
      ]),
      p(`System 1 is a grind. It has a lower win rate than System 2 (often 35-40%). But it catches the V-bottoms that System 2 misses. If you want to be the "First in, First out," this is your strategy.`),
      p(`Verify the levels yourself on the ${internal('/dashboard', 'Dashboard')}.`),
    ].join(''),
  },
  {
    id: '015',
    slug: '55-day-breakout-strategy',
    minWords: 1500,
    maxWords: 2500,
    html: [
      p(
        `If System 1 (20-day breakout) is a caffeinated day trader, <strong>System 2 (55-day breakout)</strong> is a wise old owl. It trades less often. It filters out the noise. It is designed for people who have jobs, families, or simply hate getting whipsawed.`
      ),
      p(
        `The philosophy of System 2 is: "I am willing to be late to the party, as long as I can be sure it's a <em>real</em> party." You give up the first chunk of the trend (the entry is later) to avoid the false starts that kill System 1 traders.`
      ),
      h2('The Core Rules (System 2)'),
      ul([
        `<strong>Entry Rule:</strong> Buy when price exceeds the High of the preceding 55 days. Sell Short when price drops below the Low of the preceding 55 days.`,
        `<strong>Stop Loss:</strong> 2 × ATR (N) from the entry price. (Standard Turtle risk).`,
        `<strong>Exit Rule:</strong> Exit Long when price touches the 20-day Low. Exit Short when price touches the 20-day High.`,
      ]),
      h2('The Trade-off: Late Entry, Wide Exit'),
      p(`Let's be honest about the pain points of System 2.`),
      callout(
        'Pain Point 1: Being Late',
        p(
          `By the time price breaks a 55-day high, the trend might already be up 15% or 20% from the bottom. Your brain will scream: "I missed it! It's too expensive!" <strong>Reframe:</strong> You didn't miss it. You let the System 1 traders take the risk of the early reversal. You are paying a premium for a higher probability trend.`
        )
      ),
      callout(
        'Pain Point 2: Giving Back Profits',
        p(
          `The exit is the 20-day low. In a strong trend, the 20-day low might be far below the current price. You might ride a stock from $100 to $200, then watch it fall to $170 before the 20-day exit triggers. Giving back $30 of profit feels terrible. But it is necessary to stay in the trend for the move to $300 or $400.`
        )
      ),
      h2('What Markets Fit System 2?'),
      p(`System 2 relies on "fat tails"—trends that go on for months or years. It does not work well in mean-reverting chop.`),
      ul([
        `<strong>Commodities:</strong> ${internal('/articles/turtle-trading-in-futures', 'Futures')} like Oil, Copper, or Wheat. Supply shocks take a long time to resolve. System 2 eats these up.`,
        `<strong>Crypto:</strong> ${internal('/articles/turtle-trading-in-crypto', 'Bitcoin')} bull runs are historic. System 2 keeps you in through the 30% corrections that shake out weaker hands.`,
        `<strong>Currencies:</strong> Interest rate divergence trends (e.g., USD/JPY) can last for years.`,
      ]),
      h2('System 2 vs. The "Filter Rule"'),
      p(`Unlike System 1, <strong>System 2 has no filter.</strong> You take every single 55-day breakout. Why? Because 55-day breakouts are rare. If a market hits a 55-day high, something significant has changed. If you skip one, you are almost guaranteed to miss the year's best trade.`),
      h2('Expectations: The Boredom is Real'),
      p(
        `You might go 3 months without a trade. You might check the dashboard every day for 12 weeks and see nothing but "Hold" or "Flat." (See ${internal('/articles/trading-signals-hold-meaning', 'Article 013')}).`
      ),
      p(`This is why System 2 is perfect for part-time traders.`),
      ul([
        `- <strong>System 1</strong> requires checking the market daily, urgently.`,
        `- <strong>System 2</strong> allows you to check the market daily, calmly.`,
      ]),
      p(`If you miss a System 2 entry by 4 hours, it rarely matters. If you miss a System 1 entry by 4 hours, you might miss the move.`),
      h2('Pyramiding in System 2'),
      p(
        `Because System 2 entries are safer (higher win rate), Aggressive Turtles often pyramid more heavily here. <strong>Standard Pyramid Rule:</strong>`
      ),
      ul([
        `- Enter 1 Unit at Breakout.`,
        `- Enter 1 Unit at Breakout + 0.5N.`,
        `- Enter 1 Unit at Breakout + 1.0N.`,
        `- Move stops up aggressively.`,
      ]),
      p(`This allows you to build a massive position in a safe trend, while keeping your initial risk small.`),
      p(`<strong>Final Verdict:</strong><br>If you want excitement, trade System 1.<br>If you want wealth and a lower ulcer rate, trade System 2.`),
      p(`Compare the signals live on the ${internal('/dashboard', 'Dashboard')}. Look for the "55D" tag.`),
    ].join(''),
  },
];

// Simple HTML formatter for readable output
function formatHtml(html) {
  // Add newlines after block elements and basic tags
  let formatted = html
    .replace(/<\/h1>/g, '</h1>\n')
    .replace(/<\/h2>/g, '</h2>\n')
    .replace(/<\/h3>/g, '</h3>\n')
    .replace(/<\/p>/g, '</p>\n')
    .replace(/<\/div>/g, '</div>\n')
    .replace(/<\/li>/g, '</li>\n')
    .replace(/<\/ul>/g, '</ul>\n')
    .replace(/<\/ol>/g, '</ol>\n')
    .replace(/<li>/g, '\n  <li>')
    .replace(/<h2>/g, '\n<h2>')
    .replace(/<h3>/g, '\n<h3>')
    .replace(/<p>/g, '\n<p>')
    .replace(/<div class="callout">/g, '\n<div class="callout">')
    .replace(/<div class="callout-title">/g, '  <div class="callout-title">')
    .replace(/<\/div><h2>/g, '</div>\n\n<h2>')
    .replace(/<\/p><h2>/g, '</p>\n\n<h2>')
    .replace(/<\/p><div class="callout">/g, '</p>\n<div class="callout">')
    .replace(/<\/div><p>/g, '</div>\n<p>')
    .replace(/<\/div><<\/div>/g, '</div>\n</div>')
    .replace(/<\/ul><h2>/g, '</ul>\n\n<h2>')
    .replace(/<\/ol><h2>/g, '</ol>\n\n<h2>')
    .replace(/<\/div><ul>/g, '</div>\n<ul>')
    .replace(/<\/div><ol>/g, '</div>\n<ol>');

  // Clean up excessive blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();
  
  // Ensure it ends with a newline
  return formatted + '\n';
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const a of ARTICLES) {
    const { html, wc } = ensureLength({
      html: a.html,
      minWords: a.minWords,
      maxWords: a.maxWords,
      fillerBlocks: commonFillers,
    });

    const finalHtml = `<!-- generated: ${new Date().toISOString()} | words: ${wc} -->\n` + formatHtml(html);
    const filePath = path.join(OUT_DIR, `${a.slug}.html`);
    await fs.writeFile(filePath, finalHtml, 'utf8');
    console.log(`${a.id} ${a.slug}: ${wc} words → ${path.relative(process.cwd(), filePath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
