# Feedback - AI 기반 설문 관리 시스템

고객 피드백 수집과 분석을 위한 현대적인 설문 관리 플랫폼입니다.

## 주요 기능

- 🚀 **AI 설문 생성**: 자연어로 설명하면 AI가 자동으로 전문적인 설문을 생성
- 📝 **직접 설문 생성**: 질문별 맞춤 설정으로 정밀한 설문 구성
- 👥 **고객 정보 수집**: 응답자의 인구통계학적 정보 자동 수집
- 📊 **실시간 분석**: 응답 통계, 별점 분석, 필터링 기능
- 📱 **모바일 최적화**: 반응형 디자인으로 모든 기기에서 완벽한 사용자 경험
- 🔒 **보안**: Supabase RLS를 통한 데이터 보안

## 설정 방법

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI (AI 설문 생성을 위해 필요)
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey)에 접속
2. 새 API 키 생성
3. 생성된 키를 `GEMINI_API_KEY`에 설정

### 3. 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 사용 방법

### AI 설문 생성

1. 대시보드에서 "새 설문 만들기" 클릭
2. "AI로 생성하기" 선택
3. 원하는 설문 내용을 자연어로 입력
   - 예: "카페 고객들의 메뉴 선호도와 서비스 만족도를 조사하고 싶어요"
4. AI가 생성한 설문을 검토하고 필요시 수정
5. 설문 저장 및 공유

### 직접 설문 생성

1. "직접 만들기" 선택
2. 설문 제목과 설명 입력
3. 질문 추가 (주관식, 별점, 객관식 등)
4. 미리보기로 확인 후 저장

### 응답 수집 및 분석

1. 생성된 설문 링크를 고객에게 공유
2. 대시보드에서 실시간 응답 통계 확인
3. 고객 정보별 필터링 및 분석
4. 상세 응답 내용 검토

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, RLS)
- **AI**: Google Gemini API
- **UI/UX**: Lucide React Icons, 반응형 디자인

## 라이선스

MIT License

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# feedback
