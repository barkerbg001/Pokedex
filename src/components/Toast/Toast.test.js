import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from './Toast';

describe('Toast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows nothing without a toast', () => {
    render(<Toast toast={null} onDismiss={() => {}} />);
    expect(screen.queryByText(/./)).not.toBeInTheDocument();
  });

  it('auto-dismisses after the default duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <Toast toast={{ id: 1, message: 'Added bulbasaur to Favorites' }} onDismiss={onDismiss} />
    );

    expect(screen.getByText('Added bulbasaur to Favorites')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('honors a custom duration for a message that should stay up longer', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{ id: 1, message: 'A new version is available', duration: 20000 }}
        onDismiss={onDismiss}
      />
    );

    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(15000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('runs the action and dismisses when its button is clicked', async () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    render(
      <Toast
        toast={{
          id: 1,
          message: 'A new version is available',
          action: { label: 'Reload', onClick },
        }}
        onDismiss={onDismiss}
      />
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
