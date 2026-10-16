import { type IconName, iconPaths } from './icons.generated';

export type { IconName };

type Props = { name: IconName; size?: 16 | 20 | 24; label?: string; className?: string };

/** 원본 아이콘의 stroke, 선 굵기, 둥근 끝은 svg 요소 속성으로 옮겨 둔다. */
export function Icon({ name, size = 20, label, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
      // 저장소에 커밋한 디자인 시스템 아이콘만 넣는다. 사용자 입력은 이 경로로 오지 않는다.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 정적 아이콘 마크업
      dangerouslySetInnerHTML={{ __html: iconPaths[name] }}
    />
  );
}
