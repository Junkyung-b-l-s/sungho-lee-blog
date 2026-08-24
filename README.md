# Sungho Lee Blog

이성호 선교사의 글과 기록을 위한 개인 아카이브입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. 도메인이 생기면 `NEXT_PUBLIC_SITE_URL`에 전체 URL을 설정합니다.

## 공통 코드 업데이트

JK 블로그를 공통 코드의 upstream으로 둡니다.

```bash
git fetch upstream main
```

사이트 정체성은 `site.config.js`, 글은 `content/`에 분리되어 있습니다. upstream 변경을 반영할 때 두 경로는 이성호 블로그 값을 유지합니다.

## 안전장치

Studio의 GitHub 발행은 `GITHUB_CONTENT_REPOSITORY`와 `GITHUB_CONTENT_TOKEN`을 명시적으로 설정하기 전에는 동작하지 않습니다. JK 블로그 저장소를 기본값으로 사용하지 않습니다.
