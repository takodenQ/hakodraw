// Rare UI (MIT) の GlassShimmerButton をベースに、このアプリ用に調整したもの。
// 変更点：Next.js専用の <style jsx> をCSS（tailwind.css の glass-shimmer）へ、配色をアプリのCSS変数へ、
// 無効状態と「動きを減らす」設定に対応。
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function GlassShimmerButton({ children, className, type = 'button', ...props }: GlassShimmerButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        // 背景・影は配色ごとに変わるので rich.css の .rare-cta に任せる
        'rare-cta group relative isolate inline-flex min-h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full',
        'px-8 py-3 text-base font-semibold text-[color:var(--button-ink)] transition-[transform,box-shadow,filter] duration-300',
        'hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:scale-[0.98]',
        'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--focus)]',
        'disabled:pointer-events-none disabled:opacity-45',
        className
      )}
      {...props}
    >
      {/* きらめき：数秒に一度、ボタンの上を光が横切る */}
      <span aria-hidden="true" className="glass-shimmer-sweep pointer-events-none absolute inset-y-0 -z-10 w-1/2" />
      {/* 上下のガラスのハイライト */}
      <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
      <span aria-hidden="true" className="absolute inset-x-6 bottom-0 h-px bg-linear-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />
      <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide">{children}</span>
    </button>
  );
}

export default GlassShimmerButton;
