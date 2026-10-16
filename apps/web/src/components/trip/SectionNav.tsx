import { Icon, type IconName } from '@/components/ui';
import type { SectionId } from '@/lib/trip/sections';
import styles from './SectionNav.module.css';

const ITEMS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: 'itinerary', label: '일정', icon: 'nav-itinerary' },
  { id: 'food', label: '맛집', icon: 'nav-food' },
  { id: 'shopping', label: '쇼핑', icon: 'nav-shopping' },
  { id: 'links', label: '링크', icon: 'nav-links' },
  { id: 'preparation', label: '준비', icon: 'nav-prep' },
];

export function SectionNav({ active }: { active: SectionId }) {
  return (
    <nav className={styles.nav} aria-label="여행 노트 섹션">
      <ul className={styles.list}>
        {ITEMS.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={styles.item} aria-current={item.id === active ? 'page' : undefined}>
              <Icon name={item.icon} size={24} />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
