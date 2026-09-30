import { useId } from 'react';
import { CalendarCheck, Clock, Compass, Flame, Heart, Hourglass, Layers, Lock, Map as MapIcon, MessageCircle, Moon, Mountain, Palette, Pencil, Sparkles, Sunrise, Target, Zap, type LucideIcon } from 'lucide-react';
import type { Metric, Tier } from './achievements';

const ICONS: Record<Metric, LucideIcon> = {
  sessions: Pencil, drawings: Layers, minutes: Clock, days: CalendarCheck, bestStreak: Flame, goalWeeks: Target, perfectWeeks: Sparkles, comebacks: Heart,
  courseSteps: MapIcon, variety: Palette, modes: Compass, bestSession: Zap, longSession: Hourglass, earlyBird: Sunrise, nightOwl: Moon, feelings: MessageCircle, hardFinished: Mountain,
};
/** rim：縁のグラデーション、face：中央の面、ribbon：リボン、ink：アイコンの色。 */
const PALETTE: Record<Exclude<Tier, 'legend'>, { rim: [string, string]; face: [string, string]; ribbon: string; ink: string }> = {
  bronze: { rim: ['#f0b98a', '#8a5528'], face: ['#f6cfa8', '#c98a55'], ribbon: '#b5523b', ink: '#5b3416' },
  silver: { rim: ['#ffffff', '#8b95a1'], face: ['#f4f6f8', '#bcc4cd'], ribbon: '#4f7fb5', ink: '#3d4753' },
  gold: { rim: ['#fff1a8', '#c8911a'], face: ['#ffe79a', '#efb936'], ribbon: '#c2413c', ink: '#7a4d05' },
  platinum: { rim: ['#f2fcff', '#5aa9c9'], face: ['#e3f6ff', '#8fd0ea'], ribbon: '#6a5bb8', ink: '#245a73' },
};
const RAINBOW = ['#ff6b6b', '#ffb84d', '#ffe66b', '#6bd38a', '#5ab8ff', '#b184ff'];

interface Props { metric: Metric; tier: Tier; earned: boolean; size?: number; label?: string }
/** メダルのイラスト。未獲得はグレーの鍵つきで表示する。 */
export default function Medal({ metric, tier, earned, size = 72, label }: Props) {
  const id = useId().replace(/:/g, '');
  const Icon = earned ? ICONS[metric] : Lock;
  const palette = tier === 'legend' ? null : PALETTE[tier];
  const ink = earned ? (palette?.ink ?? '#4a2c6b') : 'var(--muted)';
  return <svg className="medal" data-tier={tier} data-earned={earned} viewBox="0 0 80 96" width={size} height={size * 1.2} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <defs>
      {earned && <>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          {palette ? <><stop offset="0" stopColor={palette.rim[0]} /><stop offset="1" stopColor={palette.rim[1]} /></>
            : RAINBOW.map((color, i) => <stop key={color} offset={i / (RAINBOW.length - 1)} stopColor={color} />)}
        </linearGradient>
        <radialGradient id={`${id}-face`} cx=".35" cy=".3" r=".9">
          {palette ? <><stop offset="0" stopColor={palette.face[0]} /><stop offset="1" stopColor={palette.face[1]} /></>
            : <><stop offset="0" stopColor="#fff8ff" /><stop offset="1" stopColor="#d8c6ff" /></>}
        </radialGradient>
      </>}
    </defs>
    <path d="M22 2 40 38 29 45 10 10Z" fill={earned ? (palette?.ribbon ?? '#7c5cd6') : 'var(--line)'} />
    <path d="M58 2 40 38 51 45 70 10Z" fill={earned ? (palette?.ribbon ?? '#e0568b') : 'var(--line)'} opacity={earned ? .88 : 1} />
    <circle cx="40" cy="58" r="31" fill={earned ? `url(#${id}-rim)` : 'var(--track)'} stroke={earned ? 'rgba(0,0,0,.18)' : 'var(--line-strong, var(--line))'} strokeWidth="1" strokeDasharray={earned ? undefined : '3 3'} />
    <circle cx="40" cy="58" r="24.5" fill={earned ? `url(#${id}-face)` : 'var(--surface, var(--paper))'} stroke={earned ? 'rgba(255,255,255,.55)' : 'var(--line)'} strokeWidth="1.2" />
    {earned && <path d="M22 48a20 20 0 0 1 24-12" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />}
    <Icon x={27} y={45} width={26} height={26} color={ink} strokeWidth={2.2} opacity={earned ? 1 : .6} />
    {earned && tier === 'legend' && <g fill="#fff" stroke="#b184ff" strokeWidth=".6"><path d="M14 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /><path d="M67 70l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" /></g>}
  </svg>;
}
