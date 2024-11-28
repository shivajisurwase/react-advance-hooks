import { useState, useEffect, useCallback, useRef, RefObject, useLayoutEffect } from 'react';

export function useHover<T extends HTMLElement>(): [RefObject<T>, boolean] {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const handleMouseOver = () => setIsHovered(true);
    const handleMouseOut = () => setIsHovered(false);

    node.addEventListener('mouseover', handleMouseOver);
    node.addEventListener('mouseout', handleMouseOut);

    return () => {
      node.removeEventListener('mouseover', handleMouseOver);
      node.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return [ref, isHovered];
}

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

interface IntersectionObserverArgs {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export function useIntersectionObserver<T extends HTMLElement>(
  ref: RefObject<T>,
  { root = null, rootMargin = '0px', threshold = 0 }: IntersectionObserverArgs = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting), {
      root,
      rootMargin,
      threshold,
    });

    const current = ref.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [ref, root, rootMargin, threshold]);

  return isIntersecting;
}

export function useHoverIntent<T extends HTMLElement>(): [RefObject<T>, boolean] {
  const [isHovering, setIsHovering] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let timeout: ReturnType<typeof setTimeout>;

    const handleMouseEnter = () => {
      timeout = setTimeout(() => setIsHovering(true), 100);
    };

    const handleMouseLeave = () => {
      clearTimeout(timeout);
      setIsHovering(false);
    };

    node.addEventListener('mouseenter', handleMouseEnter);
    node.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      node.removeEventListener('mouseenter', handleMouseEnter);
      node.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return [ref, isHovering];
}

export interface DragDropState {
  isDragging: boolean;
  isOver: boolean;
  draggedItemId: string | null;
  overDropId: string | null;
}

export const useDragDrop = (onDrop: (dragId: string, dropId: string) => void) => {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    isOver: false,
    draggedItemId: null,
    overDropId: null,
  });

  const handleDragStart = useCallback((e: React.DragEvent, dragId: string) => {
    e.dataTransfer.setData('text/plain', dragId);
    e.dataTransfer.effectAllowed = 'move';
    setState({ isDragging: true, isOver: false, draggedItemId: dragId, overDropId: null });
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, dropId: string) => {
      e.preventDefault();
      if (state.overDropId !== dropId) {
        setState((s) => ({ ...s, isOver: true, overDropId: dropId }));
      }
    },
    [state.overDropId]
  );

  const handleDragEnter = useCallback((e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    setState((s) => ({ ...s, isOver: true, overDropId: dropId }));
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent, dropId: string) => {
      e.preventDefault();
      if (state.overDropId === dropId) {
        setState((s) => ({ ...s, isOver: false, overDropId: null }));
      }
    },
    [state.overDropId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, dropId: string) => {
      e.preventDefault();
      const dragId = e.dataTransfer.getData('text/plain');
      setState({ isDragging: false, isOver: false, draggedItemId: dragId, overDropId: dropId });
      onDrop(dragId, dropId);
    },
    [onDrop]
  );

  return {
    state,
    bindDrag: (dragId: string) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, dragId),
    }),
    bindDrop: (dropId: string) => ({
      onDragOver: (e: React.DragEvent) => handleDragOver(e, dropId),
      onDragEnter: (e: React.DragEvent) => handleDragEnter(e, dropId),
      onDragLeave: (e: React.DragEvent) => handleDragLeave(e, dropId),
      onDrop: (e: React.DragEvent) => handleDrop(e, dropId),
    }),
  };
};

export function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        const focusableElements = ref.current?.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        focusableElements?.[0]?.focus();
        event.preventDefault();
      }
    };

    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [ref]);
}

export function useFocus<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return [ref, isFocused];
}

interface WindowSize {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [(node: T | null) => void, WindowSize] {
  const [ref, setRef] = useState<T | null>(null);
  const [size, setSize] = useState<WindowSize>({ width: 0, height: 0 });

  const handleSize = useCallback(() => {
    if (ref) {
      setSize({
        width: ref.offsetWidth,
        height: ref.offsetHeight,
      });
    }
  }, [ref]);

  const useEnviromentEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useEnviromentEffect(() => {
    if (!ref) return;

    handleSize();

    const resizeObserver = new ResizeObserver(handleSize);
    resizeObserver.observe(ref);

    return () => resizeObserver.disconnect();
  }, [ref, handleSize]);

  return [setRef, size];
}

export function useLockBodyScroll(lock: boolean = true) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (lock) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (lock) {
        document.body.style.overflow = originalStyle;
      }
    };
  }, [lock]);
}
