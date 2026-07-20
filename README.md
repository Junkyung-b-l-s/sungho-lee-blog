# junkyung.kim

김준경의 개인 블로그입니다.

## 기준

- 제품 및 편집 경험의 앵커: Ghost
- 공개 화면의 앵커: Ghost Source
- 최초 원문은 `content/originals/`, 발행본은 `content/published/`에 분리 보존
- 공개 화면은 글을 방해하는 구독·추천·프로모션 요소를 두지 않음
- SEO 메타데이터, sitemap, RSS, 구조화 데이터는 자동 생성

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 <http://localhost:3000>을 엽니다.

프로덕션 빌드 검증:

```bash
npm run build
```

## 현재 범위

- 홈
- 연도별 기록 아카이브
- 주제별 탐색
- 글 상세
- 소개
- RSS
- sitemap 및 robots
- Article/Person 구조화 데이터

공개 화면은 방문자를 위한 홍보 페이지보다 작성자가 자주 돌아오고 싶은 개인 아카이브를 우선합니다.

다음 단계는 Ghost Admin의 흐름을 참고한 개인용 편집기입니다. 초안 작성, 원문 고정, 수정 제안 검토, 문장별 승인, 미리보기, 발행을 하나의 흐름으로 연결합니다.
