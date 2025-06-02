import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
      responseMimeType: "application/json" as const,
      systemInstruction: [
        {
          text: `사용자의 요구사항을 바탕으로 설문을 생성해주세요.

다음 JSON 형식으로 응답해주세요:

{
  "title": "설문 제목",
  "description": "설문 설명",
  "questions": [
    {
      "question_text": "질문 내용",
      "question_type": "text|rating|single_choice|multiple_choice",
      "choices_text": ["선택지1", "선택지2"]
    }
  ]
}

주의사항:
1. 질문은 5-10개 정도로 적절히 구성해주세요
2. 질문 유형은 다음 중에서 선택하세요:
   - "text": 주관식 (긴 텍스트 답변)
   - "rating": 별점 평가 (1-5점)
   - "single_choice": 객관식 단일 선택
   - "multiple_choice": 객관식 다중 선택
3. 객관식 질문의 경우 choices_text 배열에 선택지를 포함하세요
4. 설문 제목과 설명은 한국어로 작성하세요
5. 실제 비즈니스에서 사용할 수 있는 전문적인 설문으로 구성하세요
6. JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요

예시:
사용자가 "카페 고객 만족도 조사"를 요청했다면, 방문 빈도, 메뉴 만족도, 서비스 품질, 재방문 의향, 추천 의향 등을 포함한 설문을 생성하세요.`,
        },
      ],
    };

    const model = "gemini-2.0-flash";
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

    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

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
