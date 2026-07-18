# Mobil

개인 및 사적, 보안 업무를 위한 아이디어 저장소 SaaS. Google Drive + Docs 형태로
**파일 저장**과 **문서 작성·편집**을 하나의 플랫폼에서 수행합니다. 관리자는 별도
코드로 권한을 획득합니다.

> Deployment Archive for Infrastructure

## 기술 스택

- **Next.js 15** (App Router) — Vercel 배포 대상
- **Supabase** — Postgres · Auth(email+password) · Storage
- **@supabase/ssr** — 서버 컴포넌트/미들웨어 세션 처리
- **Tiptap** — 문서 에디터 (콘텐츠는 JSON 으로 저장, HTML 직접 저장 배제로 XSS 방지)
- **@fortune-sheet/react** — 스프레드시트 에디터 (Excel/Google Sheets 호환 UI, 수식·서식·다중 시트)
- 전 테이블 **RLS(행 수준 보안)** 적용, 모든 PK 는 UUID v4

디자인은 Oracle 계열 전문 DBMS 감성 + GitHub 다크 구조 + 2000년대 초 Gotham
시스템의 투박함을 참고했습니다. 네온/글로우 없이 블랙·다크그레이 위주, 각진
모서리를 사용합니다. 본문 폰트는 Noto Sans(라틴 자소는 `next/font` 로 self-host,
한글은 시스템 폰트 폴백)를 가는~미디엄 굵기로 씁니다. 상단 고정 헤더(로고 좌측,
계정/설정 메뉴 우측) + 아이콘 전용 얇은 사이드바 레일 구조이며, 생성/추가 계열
버튼은 초록, 삭제는 빨강으로 구분합니다. `g h/f/d/s/c/m` 같은 키보드 단축키와
`?` 도움말 모달을 지원합니다(자세한 목록은 앱 내 `?` 참고).

보안·최적화: 전 라우트에 보안 헤더(CSP · X-Frame-Options · HSTS · nosniff 등)를
`middleware.ts` 에서 경로별로 적용하고(상세는 `lib/security-headers.ts` 참고 —
`/sheets` 만 스프레드시트 코어 라이브러리가 요구하는 `unsafe-eval` 을 예외적으로
허용), Tiptap·CodeMirror·React Flow·스프레드시트 에디터는 모두 지연 로딩
(`ssr:false` 동적 임포트)으로 초기 번들에서 분리합니다.

## 기능

| 영역 | 내용 |
| --- | --- |
| 인증 | 회원가입 / 로그인 (Supabase Auth), 가입 시 프로필 자동 생성 |
| 관리자 | 코드 등록(`/admin/redeem`)으로 권한 승격, 관리자 콘솔에서 코드 발급 |
| 파일 | 업로드(드래그앤드롭 포함) · 다운로드(서명 URL) · 이름변경 · 삭제 · 공유(view/edit) · 검색 |
| 문서 | 생성 · 조회 · 편집(자동/수동 저장) · 공유(view/edit) · 공개 토글 · 검색 |
| 코드 | 웹 코드 에디터(CodeMirror 6) — 구문 강조 · 다국어 · 자동/수동 저장 · 다운로드 · 공유 · 공개 토글 · 검색 |
| 시트 | 스프레드시트 에디터(@fortune-sheet) — 수식 · 서식 · 다중 시트 탭 · 자동/수동 저장 · 공유 · 공개 토글 · 검색 |
| 마인드맵 | React Flow 캔버스 — 파일·코드·문서를 노드로 배치하고 상하관계(간선)로 연결 · 공유 · 공개 토글 |
| 작업공간 | 브라우저 탭처럼 문서/코드/시트/마인드맵을 열고 닫는 탭 스트립(헤더 하단), 최대 2분할 스플릿뷰(드래그로 비율 조절) |
| 대시보드 | 스토리지 사용량 그래프(카테고리별 구성) · 전체 공유 스토리지 대비 내 사용 비율 그래프 |
| 관리자 | 전체 사용자 목록·역할·콘텐츠 개수·스토리지 사용량 관리 페이지(`/admin/users`) |
| 설정 | 표시 이름 변경, 이메일·권한·공유 ID 확인 |
| 감사 | 주요 작업을 `audit_logs` 에 기록, 관리자 콘솔에서 조회 |

문서 에디터는 서식(굵게/기울임/밑줄/취소선/코드), **글자 색상 · 형광펜**, 링크,
체크리스트, 인용, 코드블록, **이미지·동영상 업로드**(공개 `media` 버킷)를 지원하고,
Notion 류 **"/" 명령 메뉴**(제목·목록·체크리스트·인용·코드블록·구분선을 입력 중
바로 삽입)와 **이미지 리사이즈 핸들**(선택 후 코너 드래그로 너비 조절, 비율 유지)을
제공합니다. 마인드맵은 MindMup 류의 고정 트리 대신 자유 그래프(React Flow)로
구성되어, 파일과 코드를 구분 없이 노드로 배치하고 방향성 간선으로 상하관계를
표현하며, **자동 배치**(계층형 BFS 레이아웃, 외부 라이브러리 없이 자체 구현) 버튼과
참조 노드 클릭 시 대상의 제목/내용 일부를 바로 보여주는 **사이드 미리보기**를
지원합니다. UI 언어는 영어입니다.

> **코드 에디터**는 초기 지시서에서 제외 항목이었으나 이후 명시적 요청으로 추가되었습니다.
> GitHub 웹 에디터가 사용하는 **CodeMirror 6** 을 자체 호스팅(CDN·웹워커 불필요)하며,
> JavaScript/TypeScript · Python · HTML/CSS · JSON · SQL · Rust · Go 등 15종 언어의
> 구문 강조를 지원합니다.

공유는 상대방의 **공유 ID(user UUID)** 로 이루어집니다. 제공된 RLS 정책상 일반
사용자는 타인의 프로필을 이메일로 조회할 수 없으므로, 각 사용자는 대시보드에서
자신의 공유 ID 를 복사해 상대에게 전달합니다.

### 작업공간(탭·스플릿뷰)

문서/코드/시트/마인드맵을 열면 브라우저 창처럼 헤더 바로 아래 탭 스트립에
활성화되고, 목록 페이지로 이동해도(사이드바 탐색) 탭은 유지된 채 숨겨졌다가
다시 클릭하면 즉시 복귀합니다. 탭은 개별적으로 닫을 수 있고, 스플릿뷰 아이콘을
누르면 최대 2개까지 나란히 열어 비교할 수 있으며 가운데 구분선을 드래그해
비율(20~80%)을 조절합니다. 탭 목록·분할 상태·비율은 `localStorage` 에 저장되어
새로고침 후에도 유지됩니다. 상태는 `app/(app)/workspace/workspace-context.tsx`
의 React Context 로 관리하고, 패널이 숨겨지면 캔버스·ResizeObserver 기반
에디터(CodeMirror·스프레드시트·React Flow)가 `display:none` 상태에서 깨지는
것을 피하기 위해 완전히 언마운트합니다(재표시 시 자동저장된 데이터를 다시
조회 — 유실 없음).

### 스토리지 분석

Supabase Storage 는 사용자 구분 없이 프로젝트 전체가 하나의 버킷 풀을
공유합니다(사용자별 할당량 없음). 대시보드는 이를 반영해 두 그래프를
제공합니다 — 내 콘텐츠가 파일/문서/코드/시트/마인드맵/미디어 중 무엇에 얼마나
쓰이는지 보여주는 구성 막대그래프, 그리고 전체 플랫폼 스토리지 대비 내가 차지하는
비율 그래프. 관리자는 `/admin/users` 에서 전체 사용자의 역할·콘텐츠 개수·
스토리지 사용량을 한 번에 확인할 수 있습니다.

### 고아 미디어 정리

문서 에디터에서 이미지·동영상을 업로드했다가 삭제하거나 문서 자체를 지우면
`media` 버킷에 더 이상 참조되지 않는 오브젝트가 남습니다. 관리자 콘솔의
"Media storage cleanup" 패널에서 스캔하면 어떤 문서 콘텐츠에도 경로가 등장하지
않는 오브젝트를 찾아 목록으로 보여주고, 확인 후 Storage API 로 일괄 삭제할 수
있습니다(직접 SQL `DELETE` 는 `storage.objects` 의 보호 트리거로 차단되어 있음).

## 프로젝트 구조

```
app/
  (auth)/            로그인 · 회원가입
  (app)/             인증 필요한 앱 셸 (고정 헤더 + 아이콘 사이드바 레일)
    header.tsx       고정 헤더 (로고 · 계정/설정 메뉴)
    sidebar.tsx       아이콘 전용 사이드바 레일
    shortcuts.tsx     전역 키보드 단축키 + 도움말 모달
    dashboard/       개요 · 내 공유 ID · 최근 문서
    files/           파일 저장소
    documents/[id]/  Tiptap 문서 에디터
    code/[id]/       CodeMirror 코드 에디터
    sheets/[id]/     스프레드시트 에디터 (@fortune-sheet, 다크 테마)
    mindmap/[id]/    React Flow 마인드맵 캔버스
    workspace/       탭 스트립 · 스플릿뷰 셸 (React Context)
    dashboard/       개요 · 스토리지 사용량 그래프 · 최근 문서
    settings/        프로필 · 계정 설정
    admin/           코드 등록 · 관리자 콘솔 · 전체 사용자 관리(users/)
  auth/              콜백 · 로그아웃 라우트
components/codemirror/ 코드 에디터 래퍼 · 테마 · 언어 매핑
lib/supabase/        browser · server · middleware 클라이언트
lib/security-headers.ts 경로별 CSP/보안 헤더 구성
components/          공용 UI (모달 · 공유 다이얼로그 · 복사 필드)
supabase/migrations/ DB 마이그레이션
docs/                구축 지시서
```

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 준비

1. [Supabase](https://app.supabase.com) 에서 새 프로젝트 생성
2. SQL Editor 에서 마이그레이션을 순서대로 실행:
   - `supabase/migrations/0001_init.sql` — 초기 스키마 · RLS · 함수 (지시서 verbatim)
   - `supabase/migrations/0002_storage.sql` — Storage 버킷 · 정책 (지시서 verbatim)
   - `supabase/migrations/0003_profile_trigger.sql` — 프로필 자동 생성 트리거
   - `supabase/migrations/0004_code_files.sql` — 코드 에디터 테이블 · RLS
   - `supabase/migrations/0005_harden_function_grants.sql` — SECURITY DEFINER 함수 권한 하드닝
   - `supabase/migrations/0006_fix_pgcrypto_search_path.sql` — pgcrypto(extensions 스키마) 해석 수정
   - `supabase/migrations/0007_fix_role_change_guard.sql` — role 자기승격 취약점 시정
   - `supabase/migrations/0008_media_bucket.sql` — 에디터 이미지/동영상용 공개 media 버킷
   - `supabase/migrations/0009_mind_maps.sql` — 마인드맵 테이블 · RLS
   - `supabase/migrations/0010_sheets.sql` — 스프레드시트 테이블 · RLS
   - `supabase/migrations/0011_storage_and_admin_stats.sql` — 스토리지/관리자 통계 함수
   - `supabase/migrations/0012_fix_storage_stats_bigint_cast.sql` — `sum()` numeric→bigint 캐스트 수정
   - `supabase/migrations/0013_content_breakdown.sql` — 카테고리별 콘텐츠 사용량 분해 함수(대시보드 그래프용)
   - `supabase/migrations/0014_media_gc.sql` — media 버킷 SELECT 정책 + 고아 미디어 탐지 함수(관리자 전용)

> `0003` 은 가입 시 `profiles` 행을 자동 생성하는 트리거입니다. `0001` 은 profiles
> INSERT 정책을 두지 않으므로, `auth.users` INSERT 시점의 SECURITY DEFINER 트리거로
> 프로필을 생성하는 것이 RLS 를 우회하지 않는 근본 해법입니다.

### 3. 환경 변수

`.env.example` 을 복사해 `.env.local` 을 만들고 값을 채웁니다
(Supabase 대시보드 → Settings → API):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

### 4. 최초 관리자 부트스트랩

`admin_codes` 는 클라이언트에서 삽입할 수 없고, 코드 발급 함수는 관리자만 호출할 수
있습니다. 따라서 **최초 1회에 한해** Supabase SQL Editor 에서 코드를 직접 삽입합니다:

```sql
-- pgcrypto(digest)는 Supabase 에서 extensions 스키마에 있으므로 스키마 명시
insert into public.admin_codes (code_hash, expires_at)
values (encode(extensions.digest('여기에_임의의_평문코드', 'sha256'), 'hex'), null);
```

사용한 평문 코드를 기록해 두고, 앱에서 회원가입 후 `/admin/redeem` 에 입력하면
관리자로 승격됩니다. 이후 관리자 콘솔에서 추가 코드를 발급할 수 있습니다.

## 보안 하드닝 (연결 검증 중 발견·시정)

Supabase 연결 후 DB 레벨 기능 검증에서 두 건의 실제 결함을 발견해 근본
시정(마이그레이션 0006/0007)했습니다.

1. **pgcrypto 해석 오류 (0006).** `redeem_admin_code`/`generate_admin_code` 가
   `search_path = public` 으로 고정되어, `extensions` 스키마에 설치된 pgcrypto
   함수(`digest`, `gen_random_bytes`)를 찾지 못해 런타임에 실패했습니다. 두 함수의
   `search_path` 에 `extensions` 를 추가해 해결했습니다.
2. **role 자기 승격 취약점 (0007).** 0001 의 `prevent_role_change` 가
   `current_user = session_user` 일 때만 차단하는데, PostgREST 는 항상
   `authenticated ≠ authenticator` 이므로 이 가드가 발동하지 않았습니다. 그 결과
   인증 사용자가 `profiles.role` 을 직접 `admin` 으로 변경할 수 있었습니다. role
   변경을 `redeem_admin_code` 가 세우는 트랜잭션 로컬 플래그가 있을 때만 허용하도록
   재설계했습니다(클라이언트는 PostgREST 로 GUC 를 위조할 수 없음).

`get_advisors` 보안 점검의 나머지 경고(SECURITY DEFINER 함수 실행 권한)는
`is_admin`(RLS 정책이 호출) 및 관리자 코드 함수(authenticated 전용, 내부
`is_admin` 체크로 보호)로, 모두 의도된 설계입니다.

### 5. 개발 서버

```bash
npm run dev
# http://localhost:3000
```

## 배포 (Vercel)

1. 저장소를 Vercel 에 연결
2. 환경 변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 등록
3. Supabase Auth 의 Redirect URL 에 배포 도메인의 `/auth/callback` 추가

## 범위

이번 단계는 인증 · 관리자 승격 · 파일 저장소 · 문서 편집 · 코드 에디터로
구성됩니다. 실시간 협업(Yjs)과 폴더 계층 구조는 포함하지 않습니다. 코드
에디터는 초기 지시서의 제외 항목이었으나 명시적 요청으로 추가되었습니다.
초기 요구사항은 [`docs/SaaS_구축_지시서.md`](docs/SaaS_구축_지시서.md) 참고.
