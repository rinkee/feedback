import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { GoogleGenAI } from "@google/genai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== AI Analysis API 시작 ===");
    const { id: surveyId } = await params;
    console.log("1. Survey ID:", surveyId);

    // 임시로 인증 체크 우회하고 기존 사용자 ID 사용 (테스트용)
    const userId = "5e1f5903-b48d-4502-95cb-838df25fbf48"; // qwedx1230@naver.com
    console.log("2. User ID:", userId);

    // 설문 기본 정보 조회
    console.log("3. 설문 기본 정보 조회...");
    const { data: surveyDataArray, error: surveyError } = await supabase
      .from("surveys")
      .select("id, title, description, user_id")
      .eq("id", surveyId);

    if (surveyError) {
      console.log("4. 설문 조회 오류:", surveyError);
      return NextResponse.json(
        { error: `설문 조회 오류: ${surveyError.message}` },
        { status: 500 }
      );
    }

    if (!surveyDataArray || surveyDataArray.length === 0) {
      console.log("5. 설문 데이터 없음");
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const surveyData = surveyDataArray[0];
    console.log("6. 설문 데이터:", surveyData);

    // 사용자 권한 확인
    if (surveyData.user_id !== userId) {
      console.log("7. 권한 없음");
      return NextResponse.json(
        { error: "설문에 대한 접근 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 설문 질문들 조회
    console.log("8. 설문 질문들 조회...");
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("order_num");

    if (questionsError) {
      console.log("9. 질문 조회 오류:", questionsError);
      return NextResponse.json(
        { error: `질문 조회 오류: ${questionsError.message}` },
        { status: 500 }
      );
    }

    console.log("10. 질문 수:", questions?.length || 0);

    // 가게 정보 조회
    console.log("10.5. 가게 정보 조회...");
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId)
      .single();

    let storeInfo = null;
    if (storeData && !storeError) {
      storeInfo = {
        store_name: storeData.store_name,
        store_type_broad: storeData.store_type_broad,
        location: storeData.location,
        target_audience: storeData.target_audience,
        menu: storeData.menu,
        features: storeData.features,
        price_range: storeData.price_range,
        description: storeData.description,
      };
      console.log("10.6. 가게 정보 로드됨:", storeInfo.store_name);
    } else {
      console.log("10.7. 가게 정보 없음");
    }

    // 설문 응답들 조회 (고객 정보 포함)
    console.log("11. 설문 응답들 조회...");
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(
        `
        *,
        customer_info:customer_info_id (
          name,
          age_group,
          gender,
          phone,
          email
        ),
        questions (
          question_text,
          question_type,
          options
        )
      `
      )
      .eq("survey_id", surveyId);

    if (responsesError) {
      console.log("12. 응답 조회 오류:", responsesError);
      return NextResponse.json(
        { error: `응답 조회 오류: ${responsesError.message}` },
        { status: 500 }
      );
    }

    console.log("13. 총 응답 수:", responses?.length || 0);

    // 응답 데이터가 없는 경우
    if (!responses || responses.length === 0) {
      console.log("14. 응답 데이터 없음");
      return NextResponse.json(
        {
          error:
            "분석할 응답 데이터가 없습니다. 고객들이 설문에 응답한 후 분석이 가능합니다.",
          surveyData: surveyData,
          totalResponses: 0,
        },
        { status: 200 }
      );
    }

    // 고객별로 응답 그룹화
    console.log("15. 응답 데이터 그룹화...");
    const customerResponses = new Map();

    responses.forEach((response) => {
      const customerId = response.customer_info_id;
      if (!customerResponses.has(customerId)) {
        customerResponses.set(customerId, {
          customerInfo: response.customer_info,
          answers: [],
        });
      }

      customerResponses.get(customerId).answers.push({
        question: response.questions,
        response_text: response.response_text,
        selected_option: response.selected_option,
        selected_options: response.selected_options,
        rating: response.rating,
        created_at: response.created_at,
      });
    });

    console.log("16. 고유 고객 수:", customerResponses.size);

    // AI 분석 수행
    console.log("17. AI 분석 수행...");
    const analysisData = {
      survey: surveyData,
      questions: questions,
      responses: Array.from(customerResponses.values()),
      storeInfo: storeInfo,
    };

    const analysis = await generateAIAnalysis(analysisData);
    console.log("18. AI 분석 완료");

    // AI 분석 결과를 데이터베이스에 저장
    console.log("19. 분석 결과 저장...");
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("ai_statistics")
      .insert({
        survey_id: surveyId,
        user_id: userId,
        summary: analysis.summary,
        statistics: analysis.statistics,
        recommendations: analysis.recommendations,
        total_responses: customerResponses.size,
        main_customer_gender: analysis.keyStats.mainCustomerGender,
        main_customer_age_group: analysis.keyStats.mainCustomerAgeGroup,
        average_rating: analysis.keyStats.averageRating,
        top_pros: analysis.topPros,
        top_cons: analysis.topCons,
        analysis_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.log("20. 저장 오류:", saveError);
      // 저장 오류가 있어도 분석 결과는 반환
    } else {
      console.log("21. 분석 결과 저장 완료");
    }

    return NextResponse.json({
      success: true,
      message: "AI 분석이 완료되었습니다!",
      analysis: analysis,
      keyStats: analysis.keyStats,
      totalResponses: customerResponses.size,
      surveyData: surveyData,
    });
  } catch (error: any) {
    console.error("=== AI 분석 오류 ===", error);
    return NextResponse.json(
      { error: error.message || "AI 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function generateAIAnalysis(data: any) {
  console.log("AI 분석 함수 시작...");

  const { survey, questions, responses, storeInfo } = data;
  const totalResponses = responses.length;

  // 기본 통계 계산
  const ageGroups: Record<string, number> = {};
  const genders: Record<string, number> = {};
  const ratings: number[] = [];
  const textResponses: string[] = [];

  console.log("통계 계산 중...");

  responses.forEach((response: any) => {
    if (response.customerInfo) {
      const { age_group, gender } = response.customerInfo;
      if (age_group) ageGroups[age_group] = (ageGroups[age_group] || 0) + 1;
      if (gender) genders[gender] = (genders[gender] || 0) + 1;
    }

    response.answers.forEach((answer: any) => {
      if (answer.rating !== null && answer.rating !== undefined) {
        ratings.push(answer.rating);
      }
      if (answer.response_text) {
        textResponses.push(answer.response_text);
      }
    });
  });

  const avgRating =
    ratings.length > 0
      ? Number(
          (
            ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          ).toFixed(1)
        )
      : 0;

  // 주요 통계 추출
  const mainAgeGroup = Object.entries(ageGroups).sort(
    ([, a], [, b]) => b - a
  )[0];
  const mainGender = Object.entries(genders).sort(([, a], [, b]) => b - a)[0];

  const keyStats = {
    totalResponses: totalResponses,
    averageRating: avgRating,
    mainCustomerAgeGroup: mainAgeGroup?.[0] || null,
    mainCustomerGender: mainGender?.[0] || null,
  };

  console.log("주요 통계:", keyStats);

  // 실제 Gemini AI 분석 수행
  console.log("Gemini AI 분석 중...");
  const aiAnalysisResult = await performGeminiAnalysis({
    survey,
    questions,
    responses,
    keyStats,
    ageGroups,
    genders,
    ratings,
    textResponses,
    storeInfo,
  });

  console.log("AI 분석 완료");

  return {
    summary: aiAnalysisResult.summary,
    statistics: {
      총응답수: totalResponses,
      연령대별분포: ageGroups,
      성별분포: genders,
      평균평점: avgRating,
      평점분포: ratings.reduce((acc, rating) => {
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      긍정응답비율:
        ratings.length > 0
          ? Math.round(
              (ratings.filter((r) => r >= 4).length / ratings.length) * 100
            )
          : 0,
      개선필요응답비율:
        ratings.length > 0
          ? Math.round(
              (ratings.filter((r) => r <= 2).length / ratings.length) * 100
            )
          : 0,
      텍스트응답수: textResponses.length,
    },
    recommendations: aiAnalysisResult.recommendations,
    keyStats,
    topPros: aiAnalysisResult.topPros,
    topCons: aiAnalysisResult.topCons,
  };
}

async function performGeminiAnalysis(data: any) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const { survey, questions, responses, keyStats, textResponses, storeInfo } =
    data;

  // AI에게 보낼 분석 데이터 구성
  const analysisPrompt = `
설문 조사 데이터를 분석하여 다음 JSON 형식으로 응답해주세요:

{
  "summary": "분석 요약 (2-3문장)",
  "topPros": ["주요 장점 1", "주요 장점 2", "주요 장점 3"],
  "topCons": ["주요 단점 1", "주요 단점 2", "주요 단점 3"],
  "recommendations": "구체적인 개선 방안 (여러 줄로 작성)"
}

## 분석할 데이터:

${
  storeInfo
    ? `### 가게 정보:
- 가게명: ${storeInfo.store_name}
- 업종: ${storeInfo.store_type_broad}
- 위치: ${storeInfo.location}
- 주 타겟층: ${storeInfo.target_audience || "정보 없음"}
- 가격대: ${storeInfo.price_range || "정보 없음"}
- 주요 메뉴: ${
        storeInfo.menu
          ?.map(
            (item: any) => `${item.name} (${item.price?.toLocaleString()}원)`
          )
          .join(", ") || "정보 없음"
      }
- 가게 특징: ${storeInfo.features?.join(", ") || "정보 없음"}
- 가게 소개: ${storeInfo.description || "정보 없음"}

`
    : ""
}### 설문 정보:
- 제목: ${survey.title}
- 설명: ${survey.description}

### 설문 질문들:
${questions
  .map(
    (q: any, i: number) =>
      `${i + 1}. ${q.question_text} (유형: ${q.question_type})`
  )
  .join("\n")}

### 응답 통계:
- 총 응답 수: ${keyStats.totalResponses}명
- 평균 평점: ${keyStats.averageRating}점
- 주요 연령대: ${keyStats.mainCustomerAgeGroup}
- 주요 성별: ${keyStats.mainCustomerGender}

### 고객 텍스트 응답 (일부):
${textResponses
  .slice(0, 50)
  .map((text: string, i: number) => `${i + 1}. ${text}`)
  .join("\n")}

### 고객 응답 상세 (처음 10명):
${responses
  .slice(0, 10)
  .map((res: any, i: number) => {
    return `응답자 ${i + 1} (${res.customerInfo?.age_group} ${
      res.customerInfo?.gender
    }):
${res.answers
  .map(
    (ans: any) =>
      `- ${ans.question?.question_text}: ${
        ans.response_text || ans.rating || ans.selected_option || "응답없음"
      }`
  )
  .join("\n")}`;
  })
  .join("\n\n")}

## 분석 요구사항:
${
  storeInfo
    ? `이 분석은 ${storeInfo.store_type_broad} 업종의 "${storeInfo.store_name}"에 대한 고객 피드백 분석입니다.
가게의 업종, 타겟층, 가격대, 메뉴, 특징을 고려하여 업종별 특성에 맞는 구체적이고 실용적인 분석을 제공해주세요.

`
    : ""
}1. **summary**: 전체 응답을 종합한 핵심 인사이트 (평점, 주요 고객층, 전반적 만족도${
    storeInfo ? ", 업종별 특성" : ""
  } 포함)
2. **topPros**: 고객들이 가장 많이 언급하거나 만족하는 장점 3가지 (구체적이고 실행 가능한 표현)
3. **topCons**: 고객들이 가장 많이 불만족하거나 개선을 원하는 단점 3가지 (구체적이고 실행 가능한 표현)
4. **recommendations**: 단점을 개선하고 장점을 강화하기 위한 구체적이고 실행 가능한 방안들 (각 방안을 줄바꿈으로 구분)
5. **주의사항**: 질문과 응답에서 명시적으로 언급되지 않은 서비스나 상황(예: 특정 메뉴, 'AI 초벌 서비스' 등)은 추측하여 통계나 분석에 포함하지 마세요.


${
  storeInfo
    ? `
특히 다음 사항들을 고려하여 분석해주세요:
- ${storeInfo.store_type_broad} 업종의 일반적인 고객 기대사항
- ${storeInfo.target_audience || "주요 고객층"}의 특성과 니즈
- ${storeInfo.price_range || "가격대"} 수준에 맞는 서비스 품질 기준
- 해당 지역(${storeInfo.location})의 시장 특성
- 실제 메뉴와 가게 특징을 반영한 개선 방안
`
    : ""
}
응답은 반드시 유효한 JSON 형식이어야 하며, 한국어로 작성해주세요.
비즈니스 관점에서 실용적이고 구체적인 분석을 제공해주세요.
`;

  const config = {
    responseMimeType: "application/json" as const,
  };

  const model = "gemini-2.0-flash";
  const contents = [
    {
      role: "user" as const,
      parts: [{ text: analysisPrompt }],
    },
  ];

  try {
    console.log("Gemini API 호출 중...");
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    const candidate = response.candidates?.[0];
    const fullText = candidate?.content?.parts?.[0]?.text || "";

    if (!fullText) {
      throw new Error("AI 응답을 받지 못했습니다.");
    }

    console.log("Gemini 원본 응답:", fullText);

    const aiResult = JSON.parse(fullText);

    // 결과 검증
    if (
      !aiResult.summary ||
      !Array.isArray(aiResult.topPros) ||
      !Array.isArray(aiResult.topCons) ||
      !aiResult.recommendations
    ) {
      throw new Error("AI 응답 형식이 올바르지 않습니다.");
    }

    return {
      summary: aiResult.summary,
      topPros: aiResult.topPros.slice(0, 3), // 최대 3개
      topCons: aiResult.topCons.slice(0, 3), // 최대 3개
      recommendations: aiResult.recommendations,
    };
  } catch (parseError) {
    console.error("Gemini 응답 파싱 오류:", parseError);

    // Fallback: 기본 분석 제공
    return {
      summary: `총 ${keyStats.totalResponses}명의 고객이 "${survey.title}" 설문에 응답했습니다. 평균 평점은 ${keyStats.averageRating}점이며, 주요 응답자층은 ${keyStats.mainCustomerAgeGroup} ${keyStats.mainCustomerGender}입니다.`,
      topPros: [
        "긍정적인 고객 피드백 확인됨",
        "서비스 이용 고객 존재",
        "개선 방향 파악 가능",
      ],
      topCons: [
        "고객 만족도 개선 필요",
        "서비스 품질 향상 요구",
        "지속적인 모니터링 필요",
      ],
      recommendations:
        "AI 분석에 일시적 문제가 발생했습니다. 고객 응답을 바탕으로 서비스 개선을 진행해주세요.",
    };
  }
}
