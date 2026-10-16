import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/lib/trip/content';
import { GuideBlocks } from './GuideBlocks';

const blocks: Block[] = [
  { type: 'paragraph', text: '공원 안에서는 아래 지도 번호를 따라가요.' },
  { type: 'steps', title: '가는 길', items: ['히가시우메다역으로 걸어가요.', '다니마치선을 타요.'] },
  { type: 'facts', items: [{ label: '출발', value: '우메다 점심 후' }] },
  { type: 'tips', items: ['물을 챙겨요.'] },
  { type: 'links', items: [{ label: '오사카성 · 교통', url: 'https://www.osakacastle.net/access/' }] },
  {
    type: 'image',
    photo: {
      src: '/images/places/osaka-castle.webp',
      alt: '오사카성 천수각',
      credit: 'DXR',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    },
  },
  {
    type: 'html',
    title: '면세품 수령',
    html: '<h3>출국 전 면세품 수령</h3><p><b>여권 원본</b>을 준비해요.</p><script>alert(1)</script>',
  },
];

describe('GuideBlocks', () => {
  it('renders each block type with its own semantics', () => {
    const { container } = render(<GuideBlocks blocks={blocks} />);

    expect(screen.getByText('공원 안에서는 아래 지도 번호를 따라가요.').tagName).toBe('P');
    const steps = screen.getByRole('heading', { name: '가는 길' }).nextElementSibling as HTMLElement;
    expect(within(steps).getAllByRole('listitem')).toHaveLength(2);
    expect(steps.tagName).toBe('OL');
    expect(container.querySelector('dt')?.textContent).toBe('출발');
    expect(container.querySelector('dd')?.textContent).toBe('우메다 점심 후');
    expect(screen.getByText('물을 챙겨요.').closest('ul')).not.toBeNull();
  });

  it('opens outside links in a new tab and says so to screen readers', () => {
    render(<GuideBlocks blocks={blocks} />);
    const link = screen.getByRole('link', { name: /오사카성 · 교통/ });

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('(새 창)');
  });

  it('credits photos and sanitizes legacy html', () => {
    const { container } = render(<GuideBlocks blocks={blocks} />);

    expect(screen.getByRole('img', { name: '오사카성 천수각' })).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText(/사진: DXR/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /CC BY-SA 4.0/ })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0',
    );
    expect(screen.getByRole('heading', { name: '출국 전 면세품 수령' })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('<script');
  });
});
