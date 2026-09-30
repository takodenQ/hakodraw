import { useEffect, useRef } from 'react';
import { currentStreak, daysThisWeek, FEELING_LABELS, type Feeling, type Progress } from './progress';
import type { CourseStep } from './course';
import { TIER_LABELS } from './achievements';
import Medal from './Medal';
import GlassShimmerButton from '@/components/rareui/GlassShimmerButton';
import type { ProgressApi } from './useProgress';

const FEELINGS: Feeling[] = ['hard', 'ok', 'easy'];
interface Props {
  title?: string; summary: string; logId: string | null; progress: Progress; api: ProgressApi;
  next?: CourseStep; onRate: (id: string, feeling: Feeling) => void;
  onNext: () => void; onAgain: () => void; onSetup: () => void; onHome: () => void; onAchievements: () => void; busy?: boolean;
}
/** 練習後の振り返りと次の一歩。上達は判定せず、練習できたことと次のおすすめだけを伝える。 */
export default function CompletionCard({ title = '練習完了', summary, logId, progress, api, next, onRate, onNext, onAgain, onSetup, onHome, onAchievements, busy }: Props) {
  const today = new Date(), week = daysThisWeek(progress.logs, today), streak = currentStreak(progress.logs, today);
  const chosen = progress.logs.find(log => log.id === logId)?.feeling;
  const fresh = api.evaluation.items.filter(item => api.unseen.includes(item.achievement.id));
  // 知らせた実績は、この画面を離れるときに既読にする（実績画面へ進むときは、そちらで「NEW」を見せるため残す）。
  const leaving = useRef(false), unseen = useRef(api.unseen);unseen.current = api.unseen;
  useEffect(() => () => { if (!leaving.current) api.see(unseen.current); }, [api.see]);
  return <section className="done" aria-label="練習完了">
    <h2>{title}</h2>
    <p className="muted">{summary}</p>
    <p className="week-note">今週 {week}日目 / 目標{progress.goal}日{week >= progress.goal ? '（達成！）' : ''}{streak >= 2 ? ` ・ ${streak}日つづいています` : ''}</p>
    {fresh.length > 0 && <div className="new-achievements" role="status" aria-label="新しい実績">
      <p className="eyebrow">実績を獲得しました！</p>
      <ul>{fresh.slice(0, 3).map(item => <li key={item.achievement.id}>
        <Medal metric={item.achievement.metric} tier={item.achievement.tier} earned size={44} />
        <span><b>{item.achievement.title}</b><small>{TIER_LABELS[item.achievement.tier]}・{item.achievement.text}</small></span></li>)}</ul>
      {fresh.length > 3 && <p className="muted">ほか{fresh.length - 3}件</p>}
      <button className="quiet" onClick={() => { leaving.current = true;onAchievements(); }}>実績を見る</button>
    </div>}
    {logId && <fieldset className="feeling"><legend>今回はどうでしたか？</legend>
      <div>{FEELINGS.map(feeling => <button key={feeling} aria-pressed={chosen === feeling} onClick={() => onRate(logId, feeling)}>{FEELING_LABELS[feeling]}</button>)}</div>
      <p className="muted">{chosen ? '次のおすすめの量を、この感想に合わせて調整します。' : '答えると、次の練習の量を調整します（任意）。'}</p></fieldset>}
    {next && <GlassShimmerButton className="mt-3 w-full" onClick={onNext} disabled={busy}>次のおすすめ：{next.title}</GlassShimmerButton>}
    <button className={`full ${next ? '' : 'primary'}`} onClick={onAgain} disabled={busy}>同じ設定でもう一度</button>
    <button className="full" onClick={onSetup}>設定に戻る</button>
    <button className="quiet exit" onClick={onHome}>ホームへ</button>
  </section>;
}
