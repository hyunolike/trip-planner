import { sanitizeLegacyHtml } from '@/lib/html/sanitize';
import type { Block } from '@/lib/trip/content';
import { ExternalLink } from './ExternalLink';
import styles from './GuideBlocks.module.css';
import { PhotoFigure } from './PhotoFigure';

type Props = { blocks: Block[]; headingLevel?: 3 | 4 };

export function GuideBlocks({ blocks, headingLevel = 4 }: Props) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4';
  return (
    <div className={styles.blocks}>
      {blocks.map((block, index) => (
        // 블록에는 id가 없다. 같은 가이드 안에서 순서가 바뀌지 않으므로 위치를 키로 쓴다.
        // biome-ignore lint/suspicious/noArrayIndexKey: 블록 순서는 고정이다
        <section key={index}>
          {block.title && block.type !== 'html' ? <Heading className={styles.heading}>{block.title}</Heading> : null}
          <BlockBody block={block} />
        </section>
      ))}
    </div>
  );
}

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'steps':
      return (
        <ol className={styles.steps}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case 'tips':
      return (
        <ul className={styles.tips}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'facts':
      return (
        <dl className={styles.facts}>
          {block.items.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'links':
      return (
        <ul className={styles.links}>
          {block.items.map((link) => (
            <li key={link.url}>
              <ExternalLink href={link.url}>{link.label}</ExternalLink>
            </li>
          ))}
        </ul>
      );
    case 'image':
      return <PhotoFigure photo={block.photo} />;
    case 'html':
      return (
        <div
          className={styles.legacy}
          // 이관 데이터의 HTML은 허용 목록으로 정리한 뒤에만 넣는다.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitizeLegacyHtml을 거친 값
          dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(block.html) }}
        />
      );
  }
}
