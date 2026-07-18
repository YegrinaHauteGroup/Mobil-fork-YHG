/**
 * Next.js 는 redirect()/notFound() 호출이나 정적 렌더링 중 동적 API 사용을
 * 예외를 던져서 상위 렌더러에 알리는 방식으로 구현한다(digest 로 식별).
 * 이런 제어 흐름 신호는 실제 오류가 아니므로 삼키지 말고 그대로 다시
 * 던져야 Next 의 라우팅/렌더링 동작이 정상적으로 유지된다.
 */
export function isNextControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest === "DYNAMIC_SERVER_USAGE" ||
      digest.startsWith("NEXT_REDIRECT") ||
      digest === "NEXT_NOT_FOUND")
  );
}
