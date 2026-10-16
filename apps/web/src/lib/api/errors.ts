const byStatus: Record<number, string> = {
  401: '로그인이 필요해요.',
  403: '이 작업을 할 권한이 없어요.',
  404: '찾을 수 없어요. 주소를 다시 확인해 주세요.',
  409: '다른 곳에서 먼저 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요.',
  429: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
};

export function problemMessage(error: unknown, status?: number): string {
  if (error instanceof TypeError) return '연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
  if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string' && error.detail) {
    return error.detail;
  }
  return (status && byStatus[status]) || '잠시 문제가 생겼어요. 조금 뒤 다시 시도해 주세요.';
}
