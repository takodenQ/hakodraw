// Rare UI (MIT) の AnimatedTab をベースに、このアプリ用に調整したもの。
// 変更点：framer-motion→motion/react、配色をアプリのCSS変数へ、nav・aria-current・disabled に対応、均等幅の4列。
import { useId, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  /** trueの間は切り替えられない（練習中など）。 */
  disabled?: boolean;
  label: string;
  className?: string;
}

export function AnimatedTabs({ tabs, activeTab, onChange, disabled = false, label, className }: AnimatedTabsProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const pill = useId();

  return (
    <nav
      aria-label={label}
      className={cn(
        // 背景・枠・影は配色ごとに変わるので rich.css の .rare-tabs に任せる
        'rare-tabs grid items-center gap-0.5 rounded-full p-1 backdrop-blur-xl',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTab === tab.id && !disabled;

        return (
          <motion.button
            key={tab.id}
            type="button"
            disabled={disabled}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            whileTap={disabled ? undefined : { scale: 0.96 }}
            className={cn(
              'relative z-10 min-h-11 min-w-0 cursor-pointer rounded-full border-0 bg-transparent px-1 py-2 text-[0.78rem] font-semibold whitespace-nowrap shadow-none outline-none sm:text-sm',
              'transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]',
              'disabled:cursor-default disabled:opacity-60',
              isActive ? 'text-[color:var(--tab-active-ink)]' : 'text-[color:var(--muted)] hover:text-[color:var(--ink)]'
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isActive && (
              <motion.span
                layoutId={`${pill}-active`}
                aria-hidden="true"
                className="rare-tab-pill absolute inset-0 z-[-1] rounded-full"
                transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              />
            )}

            {isHovered && !isActive && (
              <motion.span
                layoutId={`${pill}-hover`}
                aria-hidden="true"
                className="absolute inset-0 z-[-1] rounded-full bg-[color:var(--tab-hover-bg)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            )}

            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}

export default AnimatedTabs;
