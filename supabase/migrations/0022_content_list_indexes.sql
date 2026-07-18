-- ============================================================================
-- 목록 화면 성능 — 5개 콘텐츠 테이블은 지금까지 PK(id)와 전문검색 GIN 인덱스만
-- 있고, 목록 조회가 실제로 필터/정렬에 쓰는 owner_id, updated_at(files 는
-- created_at)에는 인덱스가 없어 순차 스캔이 발생한다. 사용자 수가 적을 때는
-- 체감되지 않지만 확실한 구조적 결함이라 지금 추가한다.
-- ============================================================================

create index documents_owner_id_idx on public.documents (owner_id);
create index documents_updated_at_idx on public.documents (updated_at desc);

create index code_files_owner_id_idx on public.code_files (owner_id);
create index code_files_updated_at_idx on public.code_files (updated_at desc);

create index sheets_owner_id_idx on public.sheets (owner_id);
create index sheets_updated_at_idx on public.sheets (updated_at desc);

create index mind_maps_owner_id_idx on public.mind_maps (owner_id);
create index mind_maps_updated_at_idx on public.mind_maps (updated_at desc);

create index files_owner_id_idx on public.files (owner_id);
create index files_created_at_idx on public.files (created_at desc);
