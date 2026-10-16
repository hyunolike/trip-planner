import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TripError from './error';

describe('trip error page', () => {
  it('has a single h1 and no h2', () => {
    render(<TripError error={new Error('x')} reset={() => {}} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });
});
