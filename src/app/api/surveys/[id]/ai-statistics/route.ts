import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== AI Statistics API 시작 ===");
    const { id: surveyId } = await params;
    console.log("1. Survey ID:", surveyId);

    // 임시로 인증 체크 우회하고 기존 사용자 ID 사용 (테스트용)
    const userId = "5e1f5903-b48d-4502-95cb-838df25fbf48"; // qwedx1230@naver.com
    console.log("2. User ID:", userId);

    // 설문 소유자 확인
    console.log("3. 설문 확인 중...");
    const { data: surveyDataArray, error: surveyError } = await supabase
      .from("surveys")
      .select("id")
      .eq("id", surveyId)
      .eq("user_id", userId);

    console.log("4. 설문 확인 결과:", surveyDataArray);
    console.log("5. 설문 확인 오류:", surveyError);

    if (surveyError) {
      console.log("6. 설문 조회 오류:", surveyError);
      return NextResponse.json(
        { error: `설문 조회 오류: ${surveyError.message}` },
        { status: 500 }
      );
    }

    if (!surveyDataArray || surveyDataArray.length === 0) {
      console.log("7. 설문을 찾을 수 없음");
      return NextResponse.json(
        { error: "설문을 찾을 수 없거나 접근 권한이 없습니다." },
        { status: 404 }
      );
    }

    console.log("8. 설문 확인 완료");

    // AI 통계 목록 조회 (최신순, 주요 통계 포함)
    const { data: statisticsData, error: statisticsError } = await supabase
      .from("ai_statistics")
      .select(
        `
        *,
        total_responses,
        average_rating,
        main_customer_age_group,
        main_customer_gender,
        top_pros,
        top_cons
      `
      )
      .eq("survey_id", surveyId)
      .eq("user_id", userId)
      .order("analysis_date", { ascending: false });

    console.log("9. AI 통계 조회 결과:", statisticsData?.length, "개");

    if (statisticsError) {
      console.log("10. AI 통계 조회 오류:", statisticsError);
      return NextResponse.json(
        { error: "AI 통계 데이터를 불러올 수 없습니다." },
        { status: 500 }
      );
    }

    console.log("11. AI 통계 API 성공");
    return NextResponse.json({
      success: true,
      statistics: statisticsData || [],
    });
  } catch (error: any) {
    console.error("=== AI 통계 조회 오류 ===", error);
    return NextResponse.json(
      { error: error.message || "AI 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
