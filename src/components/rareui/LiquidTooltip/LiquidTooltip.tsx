// Rare UI (MIT) の LiquidTooltip をベースに、このアプリ用に調整したもの。
// 変更点：framer-motion→motion/react、配色をアプリのCSS変数へ、等幅フォントをやめ、ポインター操作のときだけ表示。
import React, { useState } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface LiquidTooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  popupClassName?: string;
  placement?: Placement;
}

export const LiquidTooltip = ({
  text,
  children,
  className,
  popupClassName,
  placement = 'top',
}: LiquidTooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Spring physics for the "liquid" feel
  const springConfig = { stiffness: 100, damping: 15, mass: 0.1 };

  // Mouse position tracking for subtle parallax
  const value = useMotionValue(0);

  // Rotate based on movement value
  const rotate = useSpring(useTransform(value, [-100, 100], [-45, 45]), springConfig);

  // Springy movement value
  const springValue = useSpring(value, springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (placement === 'top' || placement === 'bottom') {
      const halfWidth = event.currentTarget.offsetWidth / 2;
      value.set(event.nativeEvent.offsetX - halfWidth);
    } else {
      const halfHeight = event.currentTarget.offsetHeight / 2;
      value.set(event.nativeEvent.offsetY - halfHeight);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    value.set(0);
  };

  // Determine styles and animations based on placement
  const isVertical = placement === 'top' || placement === 'bottom';

  const getPositionClasses = () => {
    switch (placement) {
      case 'top':
        return 'left-1/2 -top-12 -translate-x-1/2';
      case 'bottom':
        return 'left-1/2 -bottom-12 -translate-x-1/2';
      case 'left':
        return 'top-1/2 -left-2 -translate-y-1/2 -translate-x-full';
      case 'right':
        return 'top-1/2 -right-2 -translate-y-1/2 translate-x-full';
      default:
        return 'left-1/2 -top-12 -translate-x-1/2';
    }
  };

  const getArrowClasses = () => {
    switch (placement) {
      case 'top':
        return '-bottom-1 left-1/2 -translate-x-1/2';
      case 'bottom':
        return '-top-1 left-1/2 -translate-x-1/2';
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2';
      case 'right':
        return '-left-1 top-1/2 -translate-y-1/2';
      default:
        return '-bottom-1 left-1/2 -translate-x-1/2';
    }
  };

  const getAnimation = () => {
    const distance = 10;
    switch (placement) {
      case 'top':
        return {
          initial: { opacity: 0, scale: 0.6, y: distance },
          animate: { opacity: 1, scale: 1, y: -distance },
          exit: { opacity: 0, scale: 0.6, y: distance },
        };
      case 'bottom':
        return {
          initial: { opacity: 0, scale: 0.6, y: -distance },
          animate: { opacity: 1, scale: 1, y: distance },
          exit: { opacity: 0, scale: 0.6, y: -distance },
        };
      case 'left':
        return {
          initial: { opacity: 0, scale: 0.6, x: distance },
          animate: { opacity: 1, scale: 1, x: -distance },
          exit: { opacity: 0, scale: 0.6, x: distance },
        };
      case 'right':
        return {
          initial: { opacity: 0, scale: 0.6, x: -distance },
          animate: { opacity: 1, scale: 1, x: distance },
          exit: { opacity: 0, scale: 0.6, x: -distance },
        };
      default:
        // same as top
        return {
          initial: { opacity: 0, scale: 0.6, y: distance },
          animate: { opacity: 1, scale: 1, y: -distance },
          exit: { opacity: 0, scale: 0.6, y: distance },
        };
    }
  };

  const animationProps = getAnimation();

  // For vertical placement, x movement = parallax
  // For horizontal placement, y movement = parallax
  const motionStyle = isVertical
    ? ({ x: springValue, rotate: rotate, whiteSpace: 'nowrap' } as any)
    : ({ y: springValue, rotate: rotate, whiteSpace: 'nowrap' } as any);

  return (
    <span
      className={cn('relative inline', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={animationProps.initial}
            animate={{
              ...animationProps.animate,
              transition: {
                type: 'spring',
                stiffness: 260,
                damping: 20,
              },
            }}
            exit={animationProps.exit}
            style={motionStyle}
            className={cn(
              'pointer-events-none absolute z-50 flex flex-col items-center justify-center rounded-xl bg-[color:var(--tip-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--tip-ink)] shadow-xl',
              getPositionClasses(),
              popupClassName
            )}
          >
            {/* The Text */}
            <span className="relative z-10 tracking-tight">{text}</span>

            {/* Liquid drips / decoration */}
            <div
              className={cn(
                'absolute h-2 w-2 rotate-45 transform bg-[color:var(--tip-bg)]',
                getArrowClasses()
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="relative z-10">{children}</span>
    </span>
  );
};
