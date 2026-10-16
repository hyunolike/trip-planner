'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import type { StopDocument } from '@/lib/trip/content';
import styles from './Edit.module.css';

export function StopList({
  stops,
  dayNumber,
  disabled,
  onEdit,
  onDelete,
  onOrder,
}: {
  stops: StopDocument[];
  dayNumber: number;
  disabled: boolean;
  onEdit: (stop: StopDocument) => void;
  onDelete: (stop: StopDocument) => void;
  onOrder: (ids: string[]) => void;
}) {
  const drag = useRef<{ id: string; over: string; timer: number; active: boolean } | null>(null);
  const [dragging, setDragging] = useState<string>();
  function move(fromId: string, toIndex: number) {
    const fromIndex = stops.findIndex((stop) => stop.id === fromId);
    if (fromIndex < 0 || toIndex < 0 || toIndex >= stops.length || fromIndex === toIndex) return;
    const ids = stops.map((stop) => stop.id);
    const [id] = ids.splice(fromIndex, 1);
    if (!id) return;
    ids.splice(toIndex, 0, id);
    onOrder(ids);
  }
  function finish(cancel = false) {
    const current = drag.current;
    if (!current) return;
    window.clearTimeout(current.timer);
    if (!cancel && current.active)
      move(
        current.id,
        stops.findIndex((stop) => stop.id === current.over),
      );
    drag.current = null;
    setDragging(undefined);
  }
  return (
    <ol className={styles.list} aria-label={`${dayNumber}일차 일정`}>
      {stops.map((stop, index) => {
        const pending = stop.id.startsWith('pending-');
        return (
          <li key={stop.id} className={styles.stop} data-stop-id={stop.id} data-dragging={stop.id === dragging}>
            <div className={styles.actions}>
              <Button
                className={styles.drag}
                disabled={disabled || pending || stops.some((item) => item.id.startsWith('pending-'))}
                aria-label={`순서 이동 손잡이: ${stop.title}`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  const active = event.pointerType !== 'touch';
                  drag.current = {
                    id: stop.id,
                    over: stop.id,
                    active,
                    timer: window.setTimeout(() => {
                      if (drag.current) {
                        drag.current.active = true;
                        setDragging(stop.id);
                      }
                    }, 350),
                  };
                  if (active) setDragging(stop.id);
                }}
                onPointerMove={(event) => {
                  if (!drag.current?.active) return;
                  const target = document
                    .elementFromPoint?.(event.clientX, event.clientY)
                    ?.closest<HTMLElement>('[data-stop-id]');
                  if (target?.dataset.stopId) drag.current.over = target.dataset.stopId;
                }}
                onPointerUp={() => finish()}
                onPointerCancel={() => finish(true)}
              >
                ↕
              </Button>
              <span>
                {stop.time.slice(0, 5)}
                {stop.duration ? ` · ${stop.duration}` : ''}
              </span>
              {pending ? <span className={styles.muted}>전송 대기</span> : null}
            </div>
            <h3>{stop.title}</h3>
            {stop.details ? <p className={styles.muted}>{stop.details}</p> : null}
            <div className={styles.actions}>
              <Button disabled={disabled || pending} aria-label={`수정: ${stop.title}`} onClick={() => onEdit(stop)}>
                수정
              </Button>
              <Button
                disabled={disabled || pending || index === 0 || stops.some((item) => item.id.startsWith('pending-'))}
                aria-label={`위로 이동: ${stop.title}`}
                onClick={() => move(stop.id, index - 1)}
              >
                ↑
              </Button>
              <Button
                disabled={
                  disabled ||
                  pending ||
                  index === stops.length - 1 ||
                  stops.some((item) => item.id.startsWith('pending-'))
                }
                aria-label={`아래로 이동: ${stop.title}`}
                onClick={() => move(stop.id, index + 1)}
              >
                ↓
              </Button>
              <Button
                variant="danger"
                disabled={disabled || pending}
                aria-label={`삭제: ${stop.title}`}
                onClick={() => onDelete(stop)}
              >
                삭제
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
