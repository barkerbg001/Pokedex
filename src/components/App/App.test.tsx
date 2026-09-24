import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Pokédex heading', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { level: 1, name: 'Pokédex' });
  expect(headingElement).toBeInTheDocument();
});
