import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Pokédex heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/pokédex/i);
  expect(headingElement).toBeInTheDocument();
});
