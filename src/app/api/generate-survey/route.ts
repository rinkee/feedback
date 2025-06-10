import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface MenuItem {
  name: string;
  price?: number;
}

interface StoreData {
  menu?: MenuItem[];
  features?: string[];
  store_name?: string;
  store_type_broad?: string;
  location?: string;
  target_audience?: string;
  price_range?: string;
  description?: string;
}

interface SurveyQuestion {
  question_text: string;
  question_type: "text" | "rating" | "single_choice" | "multiple_choice";
  choices_text?: string[];
  rating_min_label?: string;
  rating_max_label?: string;
}

interface GeneratedSurvey {
  title: string;
  description: string;
  questions: SurveyQuestion[];
}

export async function POST(request: Request) {
  try {
    // FIX 1: request.json()의 반환 타입을 명시적으로 지정하고 올바른 구조 분해 할당을 사용합니다.
    // 이렇게 하면 'description'이 string 타입임을 TypeScript가 알게 되어 오류가 해결됩니다.
    const { description } = (await request.json()) as { description: string };

    // FIX 3: 'description' 변수가 위에서 올바르게 선언되었으므로, 이제 여기서 정상적으로 사용할 수 있습니다.
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "설문 설명이 필요합니다." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 사용자 토큰으로 새로운 Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 토큰으로 사용자 정보 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.log("=== 인증된 사용자 정보 ===");
    console.log("사용자 ID:", user.id);
    console.log("사용자 이메일:", user.email);

    // 사용자의 가게 정보 조회
    console.log("=== 가게 정보 조회 시작 ===");
    console.log("사용자 ID:", user.id);

    let { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user.id)
      .single();

    storeData = storeData as StoreData | null;

    // RLS 문제로 조회 실패시 서비스 키로 재시도
    if (storeError && storeError.code === "PGRST116") {
      console.log("=== RLS 문제로 서비스 키로 재시도 ===");
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const result = await serviceSupabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .single();

      storeData = result.data;
      storeError = result.error;
    }

    console.log("가게 정보 조회 결과:");
    console.log("- 가게 데이터:", storeData);
    console.log("- 가게 오류:", storeError);

    let storeContext = "";
    if (storeData && !storeError) {
      // FIX 2: map 함수의 콜백 매개변수 'item'에 명시적으로 'MenuItem' 타입을 지정합니다.
      const menuItems =
        storeData.menu
          ?.map(
            (item: MenuItem) =>
              `${item.name} (${item.price?.toLocaleString()}원)`
          )
          .join(", ") || "메뉴 정보 없음";

      const features = storeData.features?.join(", ") || "특징 정보 없음";

      storeContext = `
가게 정보:
- 가게명: ${storeData.store_name || "정보 없음"}
- 업종: ${storeData.store_type_broad || "정보 없음"}
- 위치: ${storeData.location || "정보 없음"}
- 주 타겟층: ${storeData.target_audience || "정보 없음"}
- 가격대: ${storeData.price_range || "정보 없음"}
- 주요 메뉴: ${menuItems}
- 가게 특징: ${features}
- 가게 소개: ${storeData.description || "정보 없음"}

위 가게 정보를 참고하여 해당 업종과 타겟층에 맞는 전문적이고 구체적인 설문을 생성해주세요.
`;
      console.log("=== 생성된 가게 컨텍스트 ===");
      console.log(storeContext);
    } else {
      console.log("=== 가게 정보가 없음 ===");
      storeContext = `
가게 정보가 등록되지 않았습니다. 

일반적인 비즈니스 설문을 생성하되, 다음 사항을 포함해주세요:
- 전반적인 서비스 만족도
- 직원 친절도
- 시설 및 환경
- 가격 만족도
- 재방문 의향
- 추천 의향
- 개선 사항 문의

설문을 생성한 후, 사용자에게 가게 정보를 먼저 등록하면 더 맞춤형 설문을 받을 수 있다는 안내를 포함해주세요.
`;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // ... (이하 코드는 동일)
    const config = {
      responseMimeType: "application/json" as const,
      systemInstruction: [
        {
          text: `당신은 가게 운영 개선을 위한 실용적인 **고객 만족도 설문 조사**를 생성하는 전문가입니다.

${storeContext}

⚠️ **중요: 필수질문 시스템 안내**
이 서비스는 재방문의사, 추천의사, 전반적 만족도 등의 필수질문이 자동으로 모든 설문에 포함됩니다.
따라서 다음과 같은 일반적인 필수질문들은 생성하지 마세요:
- "다시 방문하실 의향이 있나요?"
- "친구나 가족에게 추천하고 싶나요?"  
- "전반적인 만족도는 어떠신가요?"

⚠️ **핵심 원칙: 고객 관점 질문만 생성**
- ✅ 올바른 예: "서비스 속도는 어떠셨나요?", "메뉴 맛은 만족스러우셨나요?"
- ❌ 잘못된 예: "마케팅 아이디어가 있나요?", "경영 전략에 대한 의견은?", "홍보 방안 제안해주세요"

**절대로 생성하지 말아야 할 질문 유형:**
- 마케팅 전략이나 홍보 아이디어를 묻는 질문
- 비즈니스 운영 방안을 묻는 질문  
- 타겟층 분석이나 시장 조사 관련 질문
- 경쟁업체 분석이나 포지셔닝 관련 질문
- 사업 확장이나 투자 관련 질문

**반드시 생성해야 할 질문 유형:**
- 고객이 직접 경험한 서비스에 대한 평가
- 실제로 이용한 메뉴/상품에 대한 만족도
- 시설, 환경, 청결도 등 체험한 부분에 대한 의견
- 직원 서비스와 응대에 대한 평가
- 개선이 필요하다고 느낀 구체적인 부분

다음 JSON 형식으로 응답해주세요:

{
  "title": "설문 제목",
  "description": "설문 설명",
  "questions": [
    {
      "question_text": "질문 내용",
      "question_type": "text|rating|single_choice|multiple_choice",
      "choices_text": ["선택지1", "선택지2"],
      "rating_min_label": "1점 기준 (rating 타입인 경우만)",
      "rating_max_label": "5점 기준 (rating 타입인 경우만)"
    }
  ]
}

## 중요한 원칙:

1. **한국어만 사용**: 일본어나 다른 외국어 단어는 절대 사용하지 마세요.

2. **고객 경험 중심**: 모든 질문은 고객이 실제로 경험하고 느낀 것에 대해서만 물어보세요.
   - 고객이 직접 이용한 서비스/메뉴에 대한 질문
   - 고객이 체험한 환경과 시설에 대한 질문
   - 고객이 받은 서비스의 품질에 대한 질문

3. **가게 정보 기반**: 위에 제공된 가게 정보에 실제로 있는 내용만 활용하세요.
   - 실제 메뉴명과 가격만 언급
   - 실제 가게 특징과 서비스만 언급
   - 추측하거나 없는 정보는 사용하지 마세요
   - 만약 메뉴 정보가 '메뉴 정보 없음'으로 표시된 경우, **메뉴 기반 객관식 질문 대신** 주관식 **텍스트(text)** 질문으로 생성하세요.

4. **운영 개선 목적**: 모든 질문은 가게 사장님과 직원들이 실제로 활용할 수 있는 피드백을 수집하기 위한 것이어야 합니다.

5. **구체적이고 특화된 질문**: 다음과 같은 관점에서 질문을 구성하세요:
   - 실제 메뉴/서비스에 대한 구체적 평가
   - 운영 시간, 대기시간 등 고객이 느낀 불편함
   - 시설 및 환경에 대한 고객 경험
   - 가격에 대한 고객의 체감 만족도
   - 서비스 개선이 필요한 부분에 대한 고객 의견

6. **별점 질문 작성법**: rating 타입 질문에는 반드시 명확한 척도 기준을 제공하세요:
   - rating_min_label: 1점에 해당하는 기준 (예: "매우 불만족", "매우 느림", "전혀 그렇지 않다")
   - rating_max_label: 5점에 해당하는 기준 (예: "매우 만족", "매우 빠름", "매우 그렇다")
   - 질문 내용에 따라 적절한 척도를 선택하세요

7. **🔥 객관식 질문 작성법 (중요!)**: single_choice, multiple_choice 타입 질문에서는 평점 질문과 차별화된 구체적이고 실용적인 선택지를 제공하세요:

   **❌ 피해야 할 일반적인 선택지 (평점 질문과 유사):**
   - "매우 만족", "만족", "보통", "불만족", "매우 불만족"
   - "매우 좋음", "좋음", "보통", "나쁨", "매우 나쁨"
   - "전혀 그렇지 않다", "그렇지 않다", "보통", "그렇다", "매우 그렇다"

   **✅ 권장하는 구체적이고 실용적인 선택지 예시:**

   **가격 관련:**
   - "매우 비쌈 (예산을 크게 초과함)", "조금 비쌈 (예산보다 높음)", "적당함 (예산에 맞음)", "합리적임 (예산보다 저렴함)", "매우 저렴함 (예상보다 훨씬 저렴함)"

   **시간/속도 관련:**
   - "너무 오래 걸림 (20분 이상)", "조금 오래 걸림 (15-20분)", "적당함 (10-15분)", "빠름 (5-10분)", "매우 빠름 (5분 이내)"

   **음식량/크기 관련:**
   - "너무 적음 (배가 안 참)", "조금 적음 (아쉬움)", "적당함 (배부름)", "많음 (충분함)", "너무 많음 (남김)"

   **개선 우선순위 관련:**
   - "서비스 속도 개선", "메뉴 다양성 확대", "가격 인하", "매장 환경 개선", "주차 편의성 향상"

   **결제 방법 선호도:**
   - "현금만 사용", "카드 결제 선호", "모바일 페이 선호", "상품권/쿠폰 활용", "어떤 방법이든 상관없음"

   이처럼 각 질문의 주제에 맞는 구체적이고 측정 가능한 선택지를 제공하여 사장님이 실질적으로 활용할 수 있는 데이터를 수집하도록 하세요.

## 질문 구성 가이드:

**필수질문은 자동 포함되므로 제외하고, 다음 영역에 집중하세요:**
- 실제 메뉴/상품별 맛과 품질에 대한 만족도
- 서비스 속도, 직원 친절도 등 서비스 품질
- 매장 청결도, 분위기, 편의시설 등 환경
- 가격 대비 만족도 (가성비)
- 구체적인 개선 희망 사항

**좋은 질문 예시:**

**별점(rating) 질문:**
- "주문한 메뉴의 맛은 어떠셨나요?" (1점: 매우 실망스러움 ~ 5점: 매우 맛있음)
- "직원의 서비스는 친절했나요?" (1점: 매우 불친절 ~ 5점: 매우 친절)
- "매장 내 청결 상태는 어떠셨나요?" (1점: 매우 더러움 ~ 5점: 매우 깨끗함)

**객관식(single_choice) 질문 - 구체적 선택지:**
- "주문부터 음식이 나오기까지 대기시간은 어떠셨나요?"
  선택지: ["너무 오래 걸림 (20분 이상)", "조금 오래 걸림 (15-20분)", "적당함 (10-15분)", "빠름 (5-10분)", "매우 빠름 (5분 이내)"]

- "가격 대비 음식의 양은 어떠셨나요?"
  선택지: ["너무 적음 (배가 안 참)", "조금 적음 (아쉬움)", "적당함 (배부름)", "많음 (충분함)", "너무 많음 (남김)"]

- "이 가게를 얼마나 자주 이용하시나요?"
  선택지: ["이번이 처음", "1년에 1-2번", "몇 달에 한 번", "한 달에 1-2번", "자주 방문 (주 1회 이상)"]

**주관식(text) 질문:**
- "개선되었으면 하는 부분이 있다면 구체적으로 무엇인가요?"
- "다음에도 주문하고 싶은 메뉴나 새로 추가되었으면 하는 메뉴가 있나요?"

**절대 하지 말아야 할 질문 예시:**
- "마케팅 아이디어가 있으시다면 제안해주세요"
- "20대 여성 타겟 전략에 대한 의견은?"
- "경쟁업체와 비교했을 때 어떤 차별화가 필요할까요?"
- "사업 확장에 대한 조언을 해주세요"
`,
        },
      ],
    };

    // 여러 모델을 시도할 수 있도록 모델 목록 정의
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    const contents = [
      {
        role: "user" as const,
        parts: [
          {
            text: `다음 설문을 생성해주세요: ${description}`,
          },
        ],
      },
    ];

    let response = null;
    let lastError = null;

    // 모델별로 시도하고, 각 모델당 최대 3번 재시도
    for (const model of models) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Attempting ${model}, try ${attempt}/3`);

          response = await ai.models.generateContent({
            model,
            config,
            contents,
          });

          // 성공하면 반복문 종료
          if (response) {
            console.log(`Success with ${model} on attempt ${attempt}`);
            break;
          }
        } catch (err: unknown) {
          const error = err as Error;
          const message = error.message || String(err);
          console.error(`Error with ${model} attempt ${attempt}:`, message);
          lastError = error;

          // 503 또는 429 에러인 경우 잠시 대기 후 재시도
          if (
            error.message?.includes("503") ||
            error.message?.includes("429") ||
            error.message?.includes("overloaded")
          ) {
            const waitTime = attempt * 2000; // 2초, 4초, 6초 대기
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          } else {
            // 다른 종류의 에러면 다음 모델로 넘어감
            break;
          }
        }
      }

      // 성공했으면 모델 반복문도 종료
      if (response) break;
    }

    // 모든 시도가 실패한 경우
    if (!response) {
      console.error("All models and retries failed:", lastError);
      throw new Error(
        `AI 서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요. (${
          lastError?.message || "알 수 없는 오류"
        })`
      );
    }

    // 응답에서 텍스트 추출
    const candidate = response.candidates?.[0];
    const fullText = candidate?.content?.parts?.[0]?.text || "";

    if (!fullText) {
      throw new Error("AI 응답을 받지 못했습니다.");
    }

    try {
      // JSON 파싱
      const survey = JSON.parse(fullText) as GeneratedSurvey;

      // 기본 유효성 검사
      if (
        !survey.title ||
        !survey.description ||
        !Array.isArray(survey.questions)
      ) {
        throw new Error("유효하지 않은 설문 형식");
      }

      // 질문 유효성 검사 및 정리
      survey.questions = survey.questions.map((q: SurveyQuestion) => {
        if (!q.question_text || !q.question_type) {
          throw new Error("질문 형식이 올바르지 않습니다");
        }

        // 질문 유형 정규화
        const validTypes = [
          "text",
          "rating",
          "single_choice",
          "multiple_choice",
        ];
        if (!validTypes.includes(q.question_type)) {
          q.question_type = "text"; // 기본값으로 설정
        }

        // 객관식이 아닌 경우 choices_text 제거
        if (q.question_type === "text" || q.question_type === "rating") {
          delete q.choices_text;
        } else if (!q.choices_text || !Array.isArray(q.choices_text)) {
          // 객관식인데 선택지가 없는 경우 기본 선택지 생성
          q.choices_text = ["선택지 1", "선택지 2"];
        }

        // rating 타입이 아닌 경우 rating 라벨 제거
        if (q.question_type !== "rating") {
          delete q.rating_min_label;
          delete q.rating_max_label;
        } else {
          // rating 타입인데 라벨이 없는 경우 기본값 설정
          if (!q.rating_min_label) {
            q.rating_min_label = "매우 불만족";
          }
          if (!q.rating_max_label) {
            q.rating_max_label = "매우 만족";
          }
        }

        return q;
      });

      return NextResponse.json({ survey });
    } catch (parseError) {
      console.error("JSON 파싱 오류:", parseError);
      console.error("원본 응답:", fullText);

      return NextResponse.json(
        { error: "AI 응답을 파싱하는 데 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("설문 생성 오류:", error);

    const message = error.message || String(err);
    if (message.includes("API key")) {
      return NextResponse.json(
        { error: "AI 서비스 연결에 실패했습니다. API 키를 확인해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "설문 생성 중 오류가 발생했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
