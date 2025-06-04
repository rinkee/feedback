import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

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
      const menuItems =
        storeData.menu
          ?.map(
            (item: any) => `${item.name} (${item.price?.toLocaleString()}원)`
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

## 질문 구성 가이드:

**필수질문은 자동 포함되므로 제외하고, 다음 영역에 집중하세요:**
- 실제 메뉴/상품별 맛과 품질에 대한 만족도
- 서비스 속도, 직원 친절도 등 서비스 품질
- 매장 청결도, 분위기, 편의시설 등 환경
- 가격 대비 만족도 (가성비)
- 구체적인 개선 희망 사항

**좋은 질문 예시:**
- "주문한 메뉴의 맛은 어떠셨나요?"
- "직원의 서비스는 친절했나요?"
- "매장 내 청결 상태는 어떠셨나요?"
- "주문부터 음식이 나오기까지의 시간은 적당했나요?"
- "개선되었으면 하는 부분이 있다면 무엇인가요?"

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
        } catch (error: any) {
          console.error(
            `Error with ${model} attempt ${attempt}:`,
            error.message
          );
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
      const survey = JSON.parse(fullText);

      // 기본 유효성 검사
      if (
        !survey.title ||
        !survey.description ||
        !Array.isArray(survey.questions)
      ) {
        throw new Error("유효하지 않은 설문 형식");
      }

      // 질문 유효성 검사 및 정리
      survey.questions = survey.questions.map((q: any) => {
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
  } catch (error: any) {
    console.error("설문 생성 오류:", error);

    if (error.message?.includes("API key")) {
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
