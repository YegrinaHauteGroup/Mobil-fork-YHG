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
모서리와 모노스페이스 라벨을 사용합니다.

## 기능

| 영역 | 내용 |
| --- | --- |
| 인증 | 회원가입 / 로그인 (Supabase Auth), 가입 시 프로필 자동 생성 |
| 관리자 | 코드 등록(`/admin/redeem`)으로 권한 승격, 관리자 콘솔에서 코드 발급 |
| 파일 | 업로드 · 다운로드(서명 URL) · 삭제 · 공유(view/edit) |
| 문서 | 생성 · 조회 · 편집(자동/수동 저장) · 공유(view/edit) · 공개 토글 |
| 감사 | 주요 작업을 `audit_logs` 에 기록, 관리자 콘솔에서 조회 |

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
    admin/           코드 등록 · 관리자 콘솔
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
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_storage.sql`
   - `supabase/migrations/0003_profile_trigger.sql`

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
insert into public.admin_codes (code_hash, expires_at)
values (encode(digest('여기에_임의의_평문코드', 'sha256'), 'hex'), null);
```

사용한 평문 코드를 기록해 두고, 앱에서 회원가입 후 `/admin/redeem` 에 입력하면
관리자로 승격됩니다. 이후 관리자 콘솔에서 추가 코드를 발급할 수 있습니다.

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

이번 단계는 인증 · 관리자 승격 · 파일 저장소 · 문서 편집으로 한정됩니다. 실시간
협업(Yjs), 온라인 코드 에디터(Monaco), 폴더 계층 구조는 포함하지 않습니다.
자세한 요구사항은 [`docs/SaaS_구축_지시서.md`](docs/SaaS_구축_지시서.md) 참고.
