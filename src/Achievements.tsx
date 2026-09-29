import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, CATEGORY_LABELS, TIERS, TIER_LABELS, nearest, type AchievementState, type Metric } from './achievements';
import Medal from './Medal';
import LiquidTooltip from '@/components/rareui/LiquidTooltip';
import type { ProgressApi } from './useProgress';

/** マウスなどホバーできる端末だけ、メダルの名前をふわっと表示する（タッチ端末は下の詳細パネルを使う）。 */
const canHover = () => typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches;

const UNITS: Record<Metric, string> = {
  sessions: '回', drawings: 'こ', minutes: '分', days: '日', bestStreak: '日', goalWeeks: '週', perfectWeeks: '週', comebacks: '回', courseSteps: 'ステップ',
  variety: '種類', modes: 'モード', bestSession: '問', longSession: '分', earlyBird: '回', nightOwl: '回', feelings: '回', hardFinished: '回',
};
const formatDate = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}時間${minutes % 60}分` : `${minutes}分`;

function Progress({ item }: { item: AchievementState }) {
  const { current, achievement: { target, metric } } = item;
  return <div className="medal-progress"><div className="goal-bar" role="progressbar" aria-label="達成までの進み具合" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(current, target)}>
    <div style={{ width: `${Math.min(1, current / target) * 100}%` }} /></div><span>{Math.min(current, target)} / {target}{UNITS[metric]}</span></div>;
}

export default function Achievements({ api, onHome }: { api: ProgressApi; onHome: () => void }) {
  const { evaluation, unseen, see } = api;
  const [fresh] = useState(() => new Set(unseen));
  const [hover] = useState(canHover);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { see([...fresh]); }, [see, fresh]);
  const { items, stats } = evaluation;
  const earned = items.filter(item => item.reached), selected = items.find(item => item.achievement.id === selectedId);
  const soon = nearest(items, 3);
  const tiles: [string, string][] = [['練習した回数', `${stats.sessions}回`], ['描いたこ数', `${stats.drawings}こ`], ['練習時間', formatMinutes(stats.minutes)], ['練習した日', `${stats.days}日`], ['最長の連続', `${stats.bestStreak}日`]];

  return <div className="achievements">
    <div className="home-row"><h2 className="page-title">実績</h2><button onClick={onHome}>ホームへ</button></div>
    <section className="home-card" aria-labelledby="ach-summary">
      <h3 id="ach-summary" className="visually-hidden">実績のまとめ</h3>
      <p className="ach-total"><b>{earned.length}</b> / {items.length}<span>メダルを獲得（{Math.round(earned.length / items.length * 100)}%）</span></p>
      <div className="goal-bar" role="progressbar" aria-label="獲得した実績" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={earned.length}><div style={{ width: `${earned.length / items.length * 100}%` }} /></div>
      <ul className="tier-counts" aria-label="ランクごとの獲得数">{TIERS.map(tier => {
        const all = items.filter(item => item.achievement.tier === tier);
        return <li key={tier}><Medal metric="sessions" tier={tier} earned size={26} /><span>{TIER_LABELS[tier]}<b>{all.filter(item => item.reached).length}/{all.length}</b></span></li>;
      })}</ul>
      <dl className="stat-tiles">{tiles.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <p className="muted">1問＝1こと数えます。記録はこのブラウザにだけ保存されます。</p>
    </section>

    {soon.length > 0 && <section className="home-card" aria-labelledby="ach-soon">
      <h3 id="ach-soon">もうすぐ達成</h3>
      <ul className="soon">{soon.map(item => <li key={item.achievement.id}>
        <button onClick={() => setSelectedId(item.achievement.id)} aria-label={`${item.achievement.title}の詳しい説明`}><Medal metric={item.achievement.metric} tier={item.achievement.tier} earned={false} size={40} />
          <span><b>{item.achievement.title}</b><Progress item={item} /></span></button></li>)}</ul>
    </section>}

    {CATEGORIES.map(category => {
      const list = items.filter(item => item.achievement.category === category);
      return <section className="home-card" key={category} aria-labelledby={`ach-${category}`}>
        <h3 id={`ach-${category}`}>{CATEGORY_LABELS[category]} <small>{list.filter(item => item.reached).length} / {list.length}</small></h3>
        <div className="medal-grid">{list.map(item => {
          const { id, title, metric, tier } = item.achievement;
          const tile = <button key={id} className="medal-tile" data-earned={item.reached} data-tier={tier} data-new={fresh.has(id)} aria-pressed={selectedId === id}
            aria-label={`${title}、${TIER_LABELS[tier]}、${item.reached ? '獲得済み' : '未獲得'}${fresh.has(id) ? '、新しい実績' : ''}`} onClick={() => setSelectedId(selectedId === id ? null : id)}>
            <Medal metric={metric} tier={tier} earned={item.reached} size={60} />
            <span className="medal-name">{title}</span>
            {fresh.has(id) && <span className="new-badge" aria-hidden="true">NEW</span>}
          </button>;
          return hover ? <LiquidTooltip key={id} text={`${title}・${TIER_LABELS[tier]}`} className="block">{tile}</LiquidTooltip> : tile;
        })}</div>
      </section>;
    })}
    <p className="muted">実績は、続けたことややってみたことを称えるものです。上達の度合いを測るものではありません。</p>

    {selected && <section className="detail-sheet" aria-label="実績の詳細">
      <Medal metric={selected.achievement.metric} tier={selected.achievement.tier} earned={selected.reached} size={64} />
      <div>
        <p className="eyebrow">{TIER_LABELS[selected.achievement.tier]}・{CATEGORY_LABELS[selected.achievement.category]}</p>
        <h3>{selected.achievement.title}</h3>
        <p>{selected.achievement.text}</p>
        {selected.reached ? <p className="muted">獲得しました{selected.unlockedAt ? `（${formatDate(selected.unlockedAt)}）` : ''}</p> : <Progress item={selected} />}
      </div>
      <button className="icon-button" aria-label="詳細をとじる" onClick={() => setSelectedId(null)}><X size={18} /></button>
    </section>}
  </div>;
}
