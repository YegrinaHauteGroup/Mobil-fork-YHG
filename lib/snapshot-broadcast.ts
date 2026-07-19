"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * 시트/마인드맵처럼 공식 Yjs 바인딩이 없는 콘텐츠를 위한 "전체 스냅샷"
 * 실시간 협업. 문서/코드의 Yjs CRDT 방식과 달리 진짜 충돌 없는 병합은
 * 아니다 — 저장할 때마다 전체 데이터를 통째로 브로드캐스트하고, 받는
 * 쪽은 자기 로컬에 저장 안 된 편집이 없을 때만 그대로 반영한다(동시에
 * 같은 곳을 고치면 마지막으로 저장된 쪽이 이긴다). 그 대신 구현이 훨씬
 * 단순하고 라이브러리 내부 동작에 기대는 부분이 적다.
 *
 * private:true 로 열어 realtime.messages 의 RLS(0029/0031 마이그레이션)가
 * 문서/코드와 동일하게 view/edit 권한을 강제하게 한다.
 */
export function connectSnapshotBroadcast<T>(
  topic: string,
  onRemoteSnapshot: (data: T) => void
): { send: (data: T) => void; disconnect: () => void } {
  const supabase = createClient();
  const channel = supabase.channel(topic, {
    config: { broadcast: { self: false, ack: false }, private: true },
  });

  channel
    .on("broadcast", { event: "snapshot" }, ({ payload }) => {
      const data = (payload as { data?: T } | null)?.data;
      if (data !== undefined) onRemoteSnapshot(data);
    })
    .subscribe();

  return {
    send: (data: T) => {
      channel.send({ type: "broadcast", event: "snapshot", payload: { data } });
    },
    disconnect: () => {
      supabase.removeChannel(channel);
    },
  };
}
