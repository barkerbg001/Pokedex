import { useState, useRef, useCallback } from 'react';

// Roving-tabindex keyboard navigation for a CSS grid of items.
//
// Each direct child of the container is a cell; the element to focus in a
// cell is the cell itself or its descendant marked `data-grid-focus`. Only the
// active cell is in the Tab order, and the arrow keys, Home and End move
// between cells. The column count is read from the rendered layout, so this
// works with `repeat(auto-fill, ...)` grids at any width.
function useGridNavigation(itemCount) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const current = Math.min(activeIndex, Math.max(itemCount - 1, 0));

  const getTabIndex = useCallback((index) => (index === current ? 0 : -1), [current]);

  const focusTarget = (cell) =>
    cell.hasAttribute('data-grid-focus') ? cell : cell.querySelector('[data-grid-focus]');

  const onFocus = useCallback((e) => {
    const cells = Array.from(containerRef.current?.children || []);
    const index = cells.findIndex((cell) => cell.contains(e.target));
    if (index !== -1) setActiveIndex(index);
  }, []);

  const onKeyDown = useCallback((e) => {
    const cells = Array.from(containerRef.current?.children || []);
    const index = cells.findIndex((cell) => cell.contains(e.target));
    if (index === -1) return;

    const firstRowTop = cells[0].offsetTop;
    const columns = Math.max(1, cells.filter((cell) => cell.offsetTop === firstRowTop).length);
    const last = cells.length - 1;
    const row = Math.floor(index / columns);
    const lastRow = Math.floor(last / columns);

    let next;
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
    focusTarget(cells[next])?.focus();
  }, []);

  return { containerRef, getTabIndex, onFocus, onKeyDown };
}

export default useGridNavigation;
