import { useState, useRef, useCallback, type FocusEvent, type KeyboardEvent } from 'react';

// Roving-tabindex keyboard navigation for a CSS grid of items.
//
// Each direct child of the container is a cell; the element to focus in a
// cell is the cell itself or its descendant marked `data-grid-focus`. Only the
// active cell is in the Tab order, and the arrow keys, Home and End move
// between cells. The column count is read from the rendered layout, so this
// works with `repeat(auto-fill, ...)` grids at any width.
function useGridNavigation(itemCount: number) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const current = Math.min(activeIndex, Math.max(itemCount - 1, 0));

  const getTabIndex = useCallback((index: number) => (index === current ? 0 : -1), [current]);

  const focusTarget = (cell: Element): HTMLElement | null => {
    const el = cell.hasAttribute('data-grid-focus') ? cell : cell.querySelector('[data-grid-focus]');
    return el instanceof HTMLElement ? el : null;
  };

  const onFocus = useCallback((e: FocusEvent) => {
    const cells = Array.from(containerRef.current?.children ?? []) as HTMLElement[];
    const index = cells.findIndex((cell) => cell.contains(e.target as Node));
    if (index !== -1) setActiveIndex(index);
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const cells = Array.from(containerRef.current?.children ?? []) as HTMLElement[];
    const index = cells.findIndex((cell) => cell.contains(e.target as Node));
    if (index === -1) return;

    const first = cells[0];
    if (!first) return;
    const firstRowTop = first.offsetTop;
    const columns = Math.max(1, cells.filter((cell) => cell.offsetTop === firstRowTop).length);
    const last = cells.length - 1;
    const row = Math.floor(index / columns);
    const lastRow = Math.floor(last / columns);

    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = Math.min(index + 1, last);
        break;
      case 'ArrowLeft':
        next = Math.max(index - 1, 0);
        break;
      case 'ArrowDown':
        // Into a shorter last row, land on its final item
        next = row < lastRow ? Math.min(index + columns, last) : index;
        break;
      case 'ArrowUp':
        next = row > 0 ? index - columns : index;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    e.preventDefault();
    setActiveIndex(next);
    const nextCell = cells[next];
    if (nextCell) focusTarget(nextCell)?.focus();
  }, []);

  return { containerRef, getTabIndex, onFocus, onKeyDown };
}

export default useGridNavigation;
