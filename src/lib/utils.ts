import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwindのクラスを条件付きで結合し、競合するものは後勝ちにまとめる（Rare UIの部品が使う）。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
