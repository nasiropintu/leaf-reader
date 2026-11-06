import { useEffect, useRef, type RefObject } from "react";

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: () => void;
  onPinchZoom?: (scaleDelta: number) => void;
  enabled?: boolean;
}

export function useTouchGestures<T extends HTMLElement>(
  targetRef: RefObject<T | null>,
  options: TouchGestureOptions
) {
  const { onSwipeLeft, onSwipeRight, onDoubleTap, onPinchZoom, enabled = true } = options;

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const lastTapTime = useRef(0);
  const initialPinchDistance = useRef<number | null>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (!element || !enabled) return;

    const getPinchDistance = (touches: TouchList) => {
      if (touches.length < 2) return null;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        startTime.current = Date.now();
        initialPinchDistance.current = null;
      } else if (e.touches.length === 2 && onPinchZoom) {
        initialPinchDistance.current = getPinchDistance(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && onPinchZoom && initialPinchDistance.current !== null) {
        const currentDistance = getPinchDistance(e.touches);
        if (currentDistance !== null && initialPinchDistance.current > 0) {
          const delta = (currentDistance - initialPinchDistance.current) / 200;
          if (Math.abs(delta) > 0.05) {
            onPinchZoom(delta);
            initialPinchDistance.current = currentDistance;
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - startX.current;
        const deltaY = e.changedTouches[0].clientY - startY.current;
        const duration = Date.now() - startTime.current;

        // Check for double-tap (within 300ms of last tap, minimal movement)
        if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && duration < 250) {
          const now = Date.now();
          if (now - lastTapTime.current < 300) {
            onDoubleTap?.();
            lastTapTime.current = 0;
            return;
          }
          lastTapTime.current = now;
        }

        // Horizontal swipe: threshold 50px, predominantly horizontal, under 500ms
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && duration < 500) {
          if (deltaX < 0) {
            onSwipeLeft?.();
          } else {
            onSwipeRight?.();
          }
        }
      }

      initialPinchDistance.current = null;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [targetRef, enabled, onSwipeLeft, onSwipeRight, onDoubleTap, onPinchZoom]);
}
