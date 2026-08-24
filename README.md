# Sungho Lee Blog

이성호 선교사의 글과 기록을 위한 개인 아카이브입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3100`입니다. JK 블로그와 브라우저 저장소를 분리하기 위해 전용 포트를 쓰며, 외부 LAN에서는 접근할 수 없도록 `127.0.0.1`에만 바인딩합니다. 도메인이 생기면 `NEXT_PUBLIC_SITE_URL`에 전체 URL을 설정합니다.

## 공통 코드 업데이트

JK 블로그를 공통 코드의 upstream으로 두되, 자동 merge는 하지 않습니다. JK의 글과 정체성 파일이 다시 들어올 수 있기 때문입니다.

```bash
git fetch upstream main
git diff HEAD...upstream/main -- app components lib test package.json package-lock.json next.config.mjs
```

위 diff에서 공통 코드 변경만 검토해 반영합니다. `content/`, `site.config.js`, `.env.example`은 항상 이성호 블로그 값을 유지합니다. `upstream`의 push URL은 `DISABLED`로 설정되어 JK 저장소에 실수로 push할 수 없습니다.

## 안전장치

Studio의 GitHub 발행은 `GITHUB_CONTENT_REPOSITORY`와 `GITHUB_CONTENT_TOKEN`을 명시적으로 설정하기 전에는 동작하지 않습니다. JK 블로그 저장소를 기본값으로 사용하지 않습니다.
