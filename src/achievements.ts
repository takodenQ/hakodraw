// 実績（メダル）。練習記録から計算し、上達や巧拙ではなく「続けたこと・やってみたこと」だけを称える。
import { dayIndex, weekStartIndex, REST_DAYS_ALLOWED, type PracticeLog, type Progress } from './progress';

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
export type Category = 'volume' | 'habit' | 'explore' | 'special';
export type Metric = 'sessions' | 'drawings' | 'minutes' | 'days' | 'bestStreak' | 'goalWeeks' | 'perfectWeeks' | 'comebacks'
  | 'courseSteps' | 'variety' | 'modes' | 'bestSession' | 'longSession' | 'earlyBird' | 'nightOwl' | 'feelings' | 'hardFinished';
export interface Achievement { id: string; category: Category; metric: Metric; target: number; tier: Tier; title: string; text: string }

export const TIER_LABELS: Record<Tier, string> = { bronze: 'ブロンズ', silver: 'シルバー', gold: 'ゴールド', platinum: 'プラチナ', legend: 'レジェンド' };
export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum', 'legend'];
export const CATEGORY_LABELS: Record<Category, string> = { volume: '練習の量', habit: 'つづける', explore: 'ひろげる', special: 'とくべつ' };
export const CATEGORIES: Category[] = ['volume', 'habit', 'explore', 'special'];

type Entry = [target: number, tier: Tier, title: string, text: string];
const ladder = (category: Category, metric: Metric, entries: Entry[]): Achievement[] =>
  entries.map(([target, tier, title, text]) => ({ id: `${metric}-${target}`, category, metric, target, tier, title, text }));

export const ACHIEVEMENTS: Achievement[] = [
  ...ladder('volume', 'sessions', [
    [1, 'bronze', 'はじめの一歩', '初めて練習した'], [10, 'bronze', '10回練習', '練習を合計10回した'], [50, 'silver', '50回練習', '練習を合計50回した'],
    [100, 'gold', '100回練習', '練習を合計100回した'], [300, 'platinum', '300回練習', '練習を合計300回した'], [1000, 'legend', '千本ノック', '練習を合計1000回した'],
  ]),
  ...ladder('volume', 'drawings', [
    [10, 'bronze', '10こ描いた', '問題を合計10問こなした（1問＝1こ）'], [100, 'silver', '100こ描いた', '問題を合計100問こなした'], [500, 'gold', '500こ描いた', '問題を合計500問こなした'],
    [1000, 'platinum', '1000こ描いた', '問題を合計1000問こなした'], [3000, 'platinum', '3000こ描いた', '問題を合計3000問こなした'], [10000, 'legend', '一万こ描いた', '問題を合計10000問こなした'],
  ]),
  ...ladder('volume', 'minutes', [
    [30, 'bronze', '合計30分', '練習時間が合計30分になった'], [60, 'silver', '合計1時間', '練習時間が合計1時間になった'], [300, 'gold', '合計5時間', '練習時間が合計5時間になった'],
    [1000, 'platinum', '合計1000分', '練習時間が合計1000分になった'], [3000, 'legend', '合計50時間', '練習時間が合計50時間になった'],
  ]),
  ...ladder('habit', 'days', [
    [3, 'bronze', '3日練習', '練習した日が合計3日'], [7, 'bronze', '7日練習', '練習した日が合計7日'], [14, 'silver', '14日練習', '練習した日が合計14日'],
    [30, 'gold', '30日練習', '練習した日が合計30日'], [100, 'platinum', '100日練習', '練習した日が合計100日'], [365, 'legend', '365日練習', '練習した日が合計365日'],
  ]),
  ...ladder('habit', 'bestStreak', [
    [3, 'bronze', '3日つづけた', '3日連続で練習した（お休み1日までOK）'], [7, 'silver', '1週間つづけた', '7日連続で練習した（お休み1日までOK）'], [14, 'gold', '2週間つづけた', '14日連続で練習した（お休み1日までOK）'],
    [30, 'platinum', '1か月つづけた', '30日連続で練習した（お休み1日までOK）'], [100, 'legend', '100日つづけた', '100日連続で練習した（お休み1日までOK）'],
  ]),
  ...ladder('habit', 'goalWeeks', [
    [1, 'bronze', '週3日を達成', '1週間（月〜日）に3日以上練習した'], [4, 'silver', '週3日を4週', '週3日以上の週が合計4週'], [12, 'gold', '週3日を12週', '週3日以上の週が合計12週'],
    [26, 'platinum', '週3日を半年', '週3日以上の週が合計26週'], [52, 'legend', '週3日を1年', '週3日以上の週が合計52週'],
  ]),
  ...ladder('habit', 'perfectWeeks', [[1, 'gold', 'まる1週間', '1週間（月〜日）、毎日練習した'], [4, 'legend', 'まる1週間×4', '毎日練習した週が合計4週']]),
  ...ladder('habit', 'comebacks', [
    [1, 'bronze', 'おかえりなさい', '1週間以上あいたあと、また練習した'], [3, 'silver', 'なんどでも、おかえり', '1週間以上あいたあとの再開が合計3回'],
  ]),
  ...ladder('explore', 'courseSteps', [
    [1, 'bronze', 'コース、はじめました', 'はじめてのコースを1ステップ終えた'], [6, 'silver', 'コース半分', 'はじめてのコースを6ステップ終えた'], [12, 'gold', 'コース完走', 'はじめてのコースを最後まで終えた'],
  ]),
  ...ladder('explore', 'variety', [
    [3, 'bronze', 'いろいろ3種', '3種類の練習をやってみた'], [6, 'silver', 'いろいろ6種', '6種類の練習をやってみた'], [10, 'gold', 'いろいろ10種', '10種類の練習をやってみた'],
    [13, 'platinum', 'いろいろ13種', '13種類の練習をやってみた'],
    [17, 'legend', 'ぜんぶ試した', '回転・接続・パースの全17種類をやってみた'],
  ]),
  ...ladder('explore', 'modes', [[3, 'silver', 'どのモードも', '回転練習・接続練習・パース練習をすべてやってみた']]),
  ...ladder('explore', 'bestSession', [
    [12, 'bronze', '1回で12問', '1回の練習で12問こなした'], [30, 'silver', '1回で30問', '1回の練習で30問こなした'], [60, 'gold', '1回で60問', '1回の練習で60問こなした'],
  ]),
  ...ladder('explore', 'longSession', [[20, 'silver', '20分の集中', '1回の練習で20分すごした'], [60, 'gold', '1時間ぶっとおし', '1回の練習で1時間すごした']]),
  ...ladder('special', 'earlyBird', [[1, 'bronze', '朝のアトリエ', '朝4時〜7時に練習した'], [10, 'silver', 'あさ活', '朝4時〜7時の練習が合計10回']]),
  ...ladder('special', 'nightOwl', [[1, 'bronze', '夜のアトリエ', '夜10時〜朝4時に練習した'], [10, 'silver', '夜ふかしの相棒', '夜10時〜朝4時の練習が合計10回']]),
  ...ladder('special', 'feelings', [[5, 'bronze', 'ふりかえり上手', '練習後の感想を5回えらんだ'], [30, 'silver', 'ふりかえりの達人', '練習後の感想を30回えらんだ']]),
  ...ladder('special', 'hardFinished', [
    [1, 'silver', '手ごわい相手', '「むずかしかった」と感じても、最後までやりきった'], [10, 'gold', '手ごわさに慣れてきた', '「むずかしかった」練習をやりきった回数が合計10回'],
  ]),
];
export const achievementById = (id: string) => ACHIEVEMENTS.find(item => item.id === id);

export type Stats = Record<Metric, number>;
export const emptyStats = (): Stats => ({ sessions: 0, drawings: 0, minutes: 0, days: 0, bestStreak: 0, goalWeeks: 0, perfectWeeks: 0, comebacks: 0, courseSteps: 0, variety: 0, modes: 0, bestSession: 0, longSession: 0, earlyBird: 0, nightOwl: 0, feelings: 0, hardFinished: 0 });

/** 記録を古い順に1件ずつ足しながら、各指標を更新する。獲得日時の特定にも使う。 */
export function createTracker() {
  const stats = emptyStats();
  const days = new Set<number>(), labels = new Set<string>(), modes = new Set<string>(), steps = new Set<string>();
  const weeks = new Map<number, Set<number>>();
  let seconds = 0, lastDay: number | null = null, run = 0;
  return {
    stats,
    add(log: PracticeLog): Stats {
      const at = new Date(log.at), day = dayIndex(at), spent = log.seconds * log.done;
      stats.sessions++;stats.drawings += log.done;seconds += spent;stats.minutes = Math.floor(seconds / 60);
      stats.longSession = Math.max(stats.longSession, Math.floor(spent / 60));
      stats.bestSession = Math.max(stats.bestSession, log.done);
      if (lastDay !== null && day - lastDay >= 8) stats.comebacks++;
      if (!days.has(day)) {
        run = lastDay !== null && day - lastDay <= REST_DAYS_ALLOWED + 1 ? run + 1 : 1;
        days.add(day);stats.days = days.size;stats.bestStreak = Math.max(stats.bestStreak, run);
        const week = weeks.get(weekStartIndex(at)) ?? new Set<number>();
        week.add(day);weeks.set(weekStartIndex(at), week);
        if (week.size === 3) stats.goalWeeks++;
        if (week.size === 7) stats.perfectWeeks++;
      }
      lastDay = Math.max(lastDay ?? day, day);
      modes.add(log.mode);stats.modes = modes.size;
      labels.add(log.label);stats.variety = labels.size;
      if (log.completed && log.stepId) { steps.add(log.stepId);stats.courseSteps = steps.size; }
      if (log.feeling) stats.feelings++;
      if (log.completed && log.feeling === 'hard') stats.hardFinished++;
      const hour = at.getHours();
      if (hour >= 4 && hour < 7) stats.earlyBird++;
      else if (hour >= 22 || hour < 4) stats.nightOwl++;
      return stats;
    },
  };
}

export interface AchievementState { achievement: Achievement; current: number; reached: boolean; unlockedAt?: string }
export interface Evaluation { stats: Stats; items: AchievementState[] }
/** 記録だけから、各実績の到達状況と獲得日時（到達した記録の日時）を求める。 */
export function evaluate(logs: PracticeLog[]): Evaluation {
  const tracker = createTracker(), unlocked = new Map<string, string>();
  for (const log of [...logs].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const stats = tracker.add(log);
    for (const item of ACHIEVEMENTS) if (!unlocked.has(item.id) && stats[item.metric] >= item.target) unlocked.set(item.id, log.at);
  }
  return { stats: { ...tracker.stats }, items: ACHIEVEMENTS.map(achievement => ({ achievement, current: tracker.stats[achievement.metric], reached: unlocked.has(achievement.id), unlockedAt: unlocked.get(achievement.id) })) };
}
/** 保存済みの獲得記録を加味する。一度獲得した実績は、古い記録が整理されても消えない。 */
export function resolve(progress: Progress): Evaluation {
  const evaluation = evaluate(progress.logs);
  return { ...evaluation, items: evaluation.items.map(item => progress.earned[item.achievement.id]
    ? { ...item, reached: true, unlockedAt: progress.earned[item.achievement.id] } : item) };
}
/** 新しく到達した実績を獲得済みに加える。変化がなければ同じオブジェクトを返す。 */
export function mergeEarned(progress: Progress): Progress {
  const fresh = evaluate(progress.logs).items.filter(item => item.reached && !progress.earned[item.achievement.id]);
  if (!fresh.length) return progress;
  const earned = { ...progress.earned };
  for (const item of fresh) earned[item.achievement.id] = item.unlockedAt ?? new Date().toISOString();
  return { ...progress, earned };
}
/** まだ知らせていない獲得済みの実績。 */
export const unseenIds = (progress: Progress) => Object.keys(progress.earned).filter(id => achievementById(id) && !progress.seen.includes(id));
export const markSeen = (progress: Progress, ids: string[]): Progress =>
  ids.every(id => progress.seen.includes(id)) ? progress : { ...progress, seen: [...new Set([...progress.seen, ...ids])] };
/** 「もうすぐ達成」：未獲得のうち、達成率が高い順。 */
export function nearest(items: AchievementState[], count: number): AchievementState[] {
  return items.filter(item => !item.reached)
    .sort((a, b) => b.current / b.achievement.target - a.current / a.achievement.target || a.achievement.target - b.achievement.target).slice(0, count);
}
