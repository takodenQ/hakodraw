import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import ModeNav, { type Mode } from './ModeNav';

interface Props { mode: Mode; className: string; dark: boolean; locked: boolean; onTheme: () => void; onNavigate: (mode: Mode) => void; children: ReactNode }
/** 全画面で共通のヘッダーとタブ。画面が変わっても再生成されないので、タブの選択ピルが滑らかに移動する。 */
export default function Shell({ mode, className, dark, locked, onTheme, onNavigate, children }: Props) {
  return <main className={`app ${className}`}>
    <header><h1>HakoDraw</h1><button className="icon-button theme-toggle" aria-label={dark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
      title={dark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'} onClick={onTheme}>{dark ? <Moon /> : <Sun />}</button></header>
    <ModeNav mode={mode} locked={locked} onChange={onNavigate} />
    {children}
  </main>;
}
