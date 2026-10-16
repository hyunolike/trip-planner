'use client';

import { Button, EmptyState } from '@/components/ui';

export default function TripError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="page">
      <EmptyState
        illustration="offline"
        title="일정을 불러오지 못했어요"
        text="잠시 문제가 생겼어요. 조금 뒤 다시 시도해 주세요."
        action={
          <Button variant="primary" onClick={reset}>
            다시 불러오기
          </Button>
        }
      />
    </main>
  );
}
