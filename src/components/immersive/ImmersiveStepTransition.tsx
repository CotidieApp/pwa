'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';

type Props = {
  stepKey: string;
  children: ReactNode;
  className?: string;
  onStepVisible?: () => void;
};

// Recovered from the 6.4.19 APK. Keep the animated DOM node mounted: replacing
// the whole reading surface caused blank content in the Android WebView.
const spring = { type: 'spring', stiffness: 300, damping: 25 } as const;
const entrance = { opacity: 0, scale: 0.95 };
const visible = { opacity: 1, scale: 1 };
const exit = { opacity: 0, scale: 1.05 };

export default function ImmersiveStepTransition({ stepKey, children, className, onStepVisible }: Props) {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState({ stepKey, children });
  const pending = useRef({ stepKey, children });
  const first = useRef(true);

  // Refresh edits within the same step; retain the outgoing content until its
  // exit completes, matching the historical AnimatePresence wait mode.
  if (displayed.stepKey === stepKey && displayed.children !== children) {
    setDisplayed({ stepKey, children });
  }

  useLayoutEffect(() => {
    pending.current = { stepKey, children };
  }, [stepKey, children]);

  useLayoutEffect(() => {
    let cancelled = false;
    const initial = first.current;
    first.current = false;

    if (reducedMotion) {
      setDisplayed(pending.current);
      controls.set(visible);
    } else if (initial) {
      void controls.start(visible);
    } else {
      void controls.start(exit).then(() => {
        if (cancelled) return;
        controls.set(entrance);
        setDisplayed(pending.current);
        // The APK mounted a fresh motion value for each entrance. Reset its
        // velocity explicitly when reusing this node, or exit momentum makes
        // the entrance shrink beyond the historical 0.95 scale.
        void controls.start(visible, { ...spring, velocity: 0 });
      });
    }

    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [stepKey, controls, reducedMotion]);

  useLayoutEffect(() => {
    onStepVisible?.();
  }, [displayed.stepKey, onStepVisible]);

  return (
    <motion.div
      data-immersive-step=""
      initial={reducedMotion ? false : entrance}
      animate={controls}
      transition={spring}
      className={className}
    >
      {displayed.children}
    </motion.div>
  );
}
