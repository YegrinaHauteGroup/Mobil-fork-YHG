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
- 전 테이블 **RLS(행 수준 보안)** 적용, 모든 PK 는 UUID v4

디자인은 Oracle 계열 전문 DBMS 감성 + GitHub 다크 구조 + 2000년대 초 Gotham
시스템의 투박함을 참고했습니다. 네온/글로우 없이 블랙·다크그레이 위주, 각진
모서리와 모노스페이스 라벨을 사용합니다. 본문 폰트는 Noto Sans(라틴 자소는
`next/font` 로 self-host, 한글은 시스템 폰트 폴백)를 가는~미디엄 굵기로 씁니다.

보안·최적화: 전 라우트에 보안 헤더(CSP · X-Frame-Options · HSTS · nosniff 등)를
적용하고, Tiptap·CodeMirror 에디터는 지연 로딩(`ssr:false` 동적 임포트)으로
초기 번들에서 분리합니다.

## 기능

| 영역 | 내용 |
| --- | --- |
| 인증 | 회원가입 / 로그인 (Supabase Auth), 가입 시 프로필 자동 생성 |
| 관리자 | 코드 등록(`/admin/redeem`)으로 권한 승격, 관리자 콘솔에서 코드 발급 |
| 파일 | 업로드(드래그앤드롭 포함) · 다운로드(서명 URL) · 이름변경 · 삭제 · 공유(view/edit) · 검색 |
| 문서 | 생성 · 조회 · 편집(자동/수동 저장) · 공유(view/edit) · 공개 토글 · 검색 |
| 코드 | 웹 코드 에디터(CodeMirror 6) — 구문 강조 · 다국어 · 자동/수동 저장 · 다운로드 · 공유 · 공개 토글 · 검색 |
| 감사 | 주요 작업을 `audit_logs` 에 기록, 관리자 콘솔에서 조회 |

> **코드 에디터**는 초기 지시서에서 제외 항목이었으나 이후 명시적 요청으로 추가되었습니다.
> GitHub 웹 에디터가 사용하는 **CodeMirror 6** 을 자체 호스팅(CDN·웹워커 불필요)하며,
> JavaScript/TypeScript · Python · HTML/CSS · JSON · SQL · Rust · Go 등 15종 언어의
> 구문 강조를 지원합니다.

공유는 상대방의 **공유 ID(user UUID)** 로 이루어집니다. 제공된 RLS 정책상 일반
사용자는 타인의 프로필을 이메일로 조회할 수 없으므로, 각 사용자는 대시보드에서
자신의 공유 ID 를 복사해 상대에게 전달합니다.

## 프로젝트 구조

```
app/
  (auth)/            로그인 · 회원가입
  (app)/             인증 필요한 앱 셸 (사이드바 + 상단바)
    dashboard/       개요 · 내 공유 ID · 최근 문서
    files/           파일 저장소
    documents/[id]/  Tiptap 문서 에디터
    code/[id]/       CodeMirror 코드 에디터
    admin/           코드 등록 · 관리자 콘솔
components/codemirror/ 코드 에디터 래퍼 · 테마 · 언어 매핑
  auth/              콜백 · 로그아웃 라우트
lib/supabase/        browser · server · middleware 클라이언트
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
