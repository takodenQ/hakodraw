import { useRef, useState } from 'react';
import { Check, Download, Flame, Play, Trash2, Upload } from 'lucide-react';
import { COURSE, completedStepIds, nextStep, planFor, quickPlan, type StepPlan } from './course';
import { backupFileName, calendar, currentStreak, daysThisWeek, FEELING_LABELS, practicedToday, REST_DAYS_ALLOWED, totalMinutes } from './progress';
import { nearest } from './achievements';
import GlassShimmerButton from '@/components/rareui/GlassShimmerButton';
import Medal from './Medal';
import { estimateSeconds, formatDay, formatDuration } from './format';
import type { ProgressApi } from './useProgress';
import type { Mode } from './ModeNav';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
const FREE_MODES: { mode: Exclude<Mode, 'home' | 'achievements'>; title: string; text: string }[] = [
  { mode: 'rotation', title: '回転練習：形を好きな向きに回す', text: '正方形・円・立方体・人体などを、選んだ向きに回して描きます。' },
  { mode: 'connection', title: '接続練習：人体のつなぎ目', text: '頭・胸郭・骨盤などの「つながり方」を観察します。' },
  { mode: 'perspective', title: 'パース練習：回る立方体をなぞる', text: '向きと目線の高さが変わる立方体を、パース線をなぞって描きます。' },
];

interface Props { api: ProgressApi; onStart: (plan: StepPlan, quick: boolean) => void; onFree: (mode: Exclude<Mode, 'home' | 'achievements'>) => void; onAchievements: () => void }
export default function Home({ api, onStart, onFree, onAchievements }: Props) {
  const { progress, warning } = api, { logs } = progress;
  const today = new Date();
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const done = completedStepIds(logs), next = nextStep(logs);
  const week = daysThisWeek(logs, today), streak = currentStreak(logs, today), practiced = practicedToday(logs, today);
  const cells = calendar(logs, today);
  const { items } = api.evaluation, earnedItems = items.filter(item => item.reached);
  const latest = [...earnedItems].sort((a, b) => Date.parse(b.unlockedAt ?? '') - Date.parse(a.unlockedAt ?? '')).slice(0, 4), soon = nearest(items, 1)[0];
  const plan = next && planFor(next, logs);
  const greeting = !logs.length ? 'はじめまして。まずは1分だけ、やってみましょう。' : practiced ? '今日の練習はできています。おつかれさまです。' : 'おかえりなさい。今日も少しだけ、描いてみましょう。';

  const exportBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');link.href = url;link.download = backupFileName(today);link.click();
    URL.revokeObjectURL(url);setMessage('練習記録を書き出しました。');
  };
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try { api.restore(JSON.parse(await file.text()));setMessage('練習記録を読み込みました。'); }
    catch { setMessage('読み込めませんでした。HakoDrawで書き出したファイルを選んでください。'); }
    if (fileInput.current) fileInput.current.value = '';
  };

  return <div className="home">
    <p className="home-greeting">{greeting}</p>

    {!progress.onboarded && !logs.length && <section className="home-card onboarding" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title">はじめての方へ</h2>
      <ol>
        <li><b>紙と鉛筆を用意</b>絵は画面ではなく、いつもの紙や描画ソフトに描きます。</li>
        <li><b>画面の形をよく見る</b>形が回るので、向きごとにどう見えるかを観察します。</li>
        <li><b>時間になったら次の向きへ</b>描き終わらなくても大丈夫。うまく描くより、観察することが練習です。</li>
      </ol>
      <button onClick={api.dismissOnboarding}>わかった</button>
    </section>}

    {plan ? <section className="home-card today" aria-labelledby="today-title">
      <p className="eyebrow">{practiced ? '今日はもう練習済み。もう少しやるなら' : '今日のおすすめ'}</p>
      <h2 id="today-title">{plan.step.title}</h2>
      <p>{plan.step.aim}</p>
      <p className="muted">{plan.count}問 × {plan.seconds}秒 ・ {formatDuration(estimateSeconds(plan.count, plan.seconds))}</p>
      {plan.note && <p className="muted">{plan.note}</p>}
      <div className="today-actions">
        <GlassShimmerButton onClick={() => onStart(plan, false)}><Play size={16} />はじめる</GlassShimmerButton>
        <button onClick={() => onStart(quickPlan(plan.step), true)}>1分だけやってみる</button>
      </div>
      <p className="muted">「1分だけ」も練習した日として記録されます。続けることがいちばん大切です。</p>
    </section> : <section className="home-card today" aria-labelledby="today-title">
      <h2 id="today-title">コースを最後まで終えました</h2>
      <p>おつかれさまでした。下の「自由に練習する」から、好きな形や向きで続けましょう。</p>
    </section>}

    <section className="home-card" aria-labelledby="week-title">
      <div className="home-row"><h2 id="week-title">練習の記録</h2>
        <label className="goal">週の目標<select aria-label="週の目標" value={progress.goal} onChange={e => api.setGoal(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}日</option>)}</select></label></div>
      <p className="week-count"><b>{week}</b> / {progress.goal}日<span>今週練習した日{week >= progress.goal ? '（目標達成！）' : ''}</span></p>
      <div className="goal-bar" role="progressbar" aria-label="今週の練習日数" aria-valuemin={0} aria-valuemax={progress.goal} aria-valuenow={Math.min(week, progress.goal)}>
        <div style={{ width: `${Math.min(1, week / progress.goal) * 100}%` }} /></div>
      <div className="calendar" role="group" aria-label={`直近5週間の練習カレンダー。練習した日は${cells.filter(c => c.practiced).length}日`}>
        {WEEKDAYS.map(day => <span key={day} className="calendar-head" aria-hidden="true">{day}</span>)}
        {cells.map(cell => <span key={cell.key} className="calendar-day" data-practiced={cell.practiced} data-today={cell.today} data-future={cell.future}
          title={`${formatDay(cell.date)}${cell.practiced ? ' 練習した' : ''}`}>{cell.practiced ? <Check size={14} aria-hidden="true" /> : cell.date.getDate()}</span>)}
      </div>
      <p className="streak"><Flame size={16} aria-hidden="true" />{streak >= 1 ? `${streak}日つづいています` : 'まだ連続記録はありません。今日が最初の1日です。'}
        <span>お休みは{REST_DAYS_ALLOWED}日まで、連続記録は途切れません。</span></p>
      <p className="muted">これまで {logs.length}回・合計{totalMinutes(logs)}分練習しました。</p>
    </section>

    <section className="home-card" aria-labelledby="achievement-title">
      <div className="home-row"><h2 id="achievement-title">実績 <small>{earnedItems.length} / {items.length}</small></h2>
        {api.unseen.length > 0 && <span className="new-badge inline" aria-label={`新しい実績が${api.unseen.length}件`}>NEW {api.unseen.length}</span>}</div>
      {latest.length > 0 ? <ul className="latest-medals" aria-label="最近獲得したメダル">{latest.map(item => <li key={item.achievement.id}>
        <Medal metric={item.achievement.metric} tier={item.achievement.tier} earned size={48} label={item.achievement.title} /><span>{item.achievement.title}</span></li>)}</ul>
        : <p className="muted">練習するとメダルがもらえます。まずは「はじめの一歩」を目指しましょう。</p>}
      {soon && <p className="muted">もうすぐ：{soon.achievement.title}（{Math.min(soon.current, soon.achievement.target)} / {soon.achievement.target}）</p>}
      <button className="full" onClick={onAchievements}>実績をすべて見る</button>
    </section>

    <section className="home-card" aria-labelledby="course-title">
      <details open={logs.length < 3}>
        <summary><h2 id="course-title">はじめてのコース <small>{done.size} / {COURSE.length}</small></h2></summary>
        <p className="muted">やさしい形から順に、1ステップ数分で進みます。好きなステップから始めてもかまいません。</p>
        <ol className="course">{COURSE.map((step, i) => <li key={step.id} data-done={done.has(step.id)} data-next={next?.id === step.id}>
          <span className="course-mark" aria-hidden="true">{done.has(step.id) ? <Check size={14} /> : i + 1}</span>
          <div><b>{step.title}</b><small>{step.count}問 × {step.seconds}秒{done.has(step.id) ? ' ・ 完了' : next?.id === step.id ? ' ・ おすすめ' : ''}</small></div>
          <button aria-label={`${step.title}を練習する`} onClick={() => onStart(planFor(step, logs), false)}>練習</button></li>)}</ol>
      </details>
    </section>

    <section className="home-card" aria-labelledby="free-title">
      <h2 id="free-title">自由に練習する</h2>
      <div className="free-modes">{FREE_MODES.map(item => <button key={item.mode} onClick={() => onFree(item.mode)}><b>{item.title}</b><span>{item.text}</span></button>)}</div>
    </section>

    {logs.length > 0 && <section className="home-card" aria-labelledby="history-title">
      <h2 id="history-title">最近の練習</h2>
      <ol className="history">{[...logs].reverse().slice(0, 6).map(log => <li key={log.id}>
        <time dateTime={log.at}>{formatDay(new Date(log.at))}</time><span>{log.label}</span>
        <small>{log.completed ? `${log.count}問` : `${log.done}/${log.count}問で終了`}{log.feeling ? ` ・ ${FEELING_LABELS[log.feeling]}` : ''}</small></li>)}</ol>
    </section>}

    <section className="home-card" aria-labelledby="data-title">
      <details>
        <summary><h2 id="data-title">記録の保存・引き継ぎ</h2></summary>
        <p className="muted">記録はこのブラウザの中にだけ保存され、送信されません。別の端末へ移すときは、書き出したファイルを読み込みます。</p>
        <div className="data-actions">
          <button onClick={exportBackup} disabled={!logs.length}><Download size={16} />書き出す</button>
          <button onClick={() => fileInput.current?.click()}><Upload size={16} />読み込む</button>
          <button onClick={() => { if (confirm('練習記録をすべて消去します。よろしいですか？')) { api.reset();setMessage('練習記録を消去しました。'); } }} disabled={!logs.length}><Trash2 size={16} />消去</button>
        </div>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="バックアップファイル" onChange={e => void importBackup(e.target.files?.[0])} />
      </details>
      {message && <p className="muted" role="status">{message}</p>}
    </section>
    {warning && <p className="storage-warning" role="status">{warning}</p>}
  </div>;
}
