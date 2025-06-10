import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// 레스토랑 업계 전문 AI 분석 인터페이스
interface CustomerSegment {
  segment: string;
  count: number;
  avgSatisfaction: number;
  revisitIntention: number;
  recommendationScore: number;
}

interface RestaurantInsights {
  nps: number; // Net Promoter Score
  csat: number; // Customer Satisfaction Score
  customerRetentionScore: number;
  loyaltyIndex: number;
  customerSegments: CustomerSegment[];
  visitFrequencyAnalysis: {
    newCustomers: number;
    regularCustomers: number;
    loyalCustomers: number;
    riskSegment: number;
  };
  satisfactionTrend: string;
  growthPotential: string;
  criticalIssues: string[];
  improvementPriorities: string[];
  strategicRecommendations: string[];
  strengthAreas: string[];
  weaknessAreas: string[];
  opportunityAreas: string[];
  weaknessImprovements: string[];
  strengthLeverage: string[];
}

// NPS 계산 (추천 의사 기반)
function calculateNPS(responses: Array<Record<string, unknown>>): number {
  const recommendationResponses = responses.filter(
    (r) => r.required_question_category === "recommendation" && r.rating
  );

  if (recommendationResponses.length === 0) return 0;

  let promoters = 0,
    detractors = 0;

  recommendationResponses.forEach((r) => {
    if (r.rating >= 4) promoters++;
    else if (r.rating !== 3) detractors++;
  });

  const total = recommendationResponses.length;
  return Math.round((promoters / total - detractors / total) * 100);
}

// CSAT 계산 (전반적 만족도 기반)
function calculateCSAT(responses: Array<Record<string, unknown>>): number {
  const satisfactionResponses = responses.filter(
    (r) => r.required_question_category === "overall_satisfaction" && r.rating
  );

  if (satisfactionResponses.length === 0) return 0;

  const avgRating =
    satisfactionResponses.reduce((sum, r) => sum + r.rating, 0) /
    satisfactionResponses.length;
  return Math.round((avgRating / 5) * 100);
}

// 고객 충성도 지수 계산
function calculateLoyaltyIndex(responses: Array<Record<string, unknown>>): number {
  const revisitResponses = responses.filter(
    (r) => r.required_question_category === "revisit_intention" && r.rating
  );
  const recommendResponses = responses.filter(
    (r) => r.required_question_category === "recommendation" && r.rating
  );

  if (revisitResponses.length === 0 || recommendResponses.length === 0)
    return 0;

  const avgRevisit =
    revisitResponses.reduce((sum, r) => sum + r.rating, 0) /
    revisitResponses.length;
  const avgRecommend =
    recommendResponses.reduce((sum, r) => sum + r.rating, 0) /
    recommendResponses.length;

  return Math.round(((avgRevisit + avgRecommend) / 10) * 100);
}

// 방문빈도별 고객 세분화
function analyzeVisitFrequency(responses: Array<Record<string, unknown>>) {
  const visitFreqResponses = responses.filter(
    (r) =>
      r.required_question_category === "visit_frequency" && r.selected_option
  );

  let newCustomers = 0,
    regularCustomers = 0,
    loyalCustomers = 0;

  visitFreqResponses.forEach((r) => {
    const choice = r.selected_option;
    if (choice === "choice_1") newCustomers++; // 이번이 처음
    else if (["choice_2", "choice_3"].includes(choice))
      regularCustomers++; // 1년에 1-2번, 몇 달에 한 번
    else if (["choice_4", "choice_5", "choice_6"].includes(choice))
      loyalCustomers++; // 한 달에 1-2번, 주 1-2회, 거의 매일
  });

  const total = visitFreqResponses.length;
  if (total === 0)
    return {
      newCustomers: 0,
      regularCustomers: 0,
      loyalCustomers: 0,
      riskSegment: 0,
    };

  return {
    newCustomers: Math.round((newCustomers / total) * 100),
    regularCustomers: Math.round((regularCustomers / total) * 100),
    loyalCustomers: Math.round((loyalCustomers / total) * 100),
    riskSegment: Math.round((newCustomers / total) * 100),
  };
}

// 고객 세그먼트별 분석
function analyzeCustomerSegments(
  responses: Array<Record<string, unknown>>,
  customers: Array<Record<string, unknown>>
): CustomerSegment[] {
  const segments: { [key: string]: Array<Record<string, unknown>> } = {};

  customers.forEach((customer) => {
    const customerResponses = responses.filter(
      (r) => r.customer_info_id === customer.id
    );
    if (customerResponses.length === 0) return;

    const ageGroup = customer.age_group || "미분류";
    const gender = customer.gender || "미분류";
    const segmentKey = `${ageGroup}_${gender}`;

    if (!segments[segmentKey]) segments[segmentKey] = [];
    segments[segmentKey].push(...customerResponses);
  });

  return Object.entries(segments)
    .map(([segmentKey, segmentResponses]) => {
      const [ageGroup, gender] = segmentKey.split("_");

      const satisfactionResponses = segmentResponses.filter(
        (r) =>
          r.required_question_category === "overall_satisfaction" && r.rating
      );
      const revisitResponses = segmentResponses.filter(
        (r) => r.required_question_category === "revisit_intention" && r.rating
      );
      const recommendResponses = segmentResponses.filter(
        (r) => r.required_question_category === "recommendation" && r.rating
      );

      const avgSatisfaction =
        satisfactionResponses.length > 0
          ? Math.round(
              (satisfactionResponses.reduce((sum, r) => sum + r.rating, 0) /
                satisfactionResponses.length) *
                20
            )
          : 0;

      const revisitIntention =
        revisitResponses.length > 0
          ? Math.round(
              (revisitResponses.reduce((sum, r) => sum + r.rating, 0) /
                revisitResponses.length) *
                20
            )
          : 0;

      const recommendationScore =
        recommendResponses.length > 0
          ? Math.round(
              (recommendResponses.reduce((sum, r) => sum + r.rating, 0) /
                recommendResponses.length) *
                20
            )
          : 0;

      const uniqueCustomers = new Set(
        segmentResponses.map((r) => r.customer_info_id)
      ).size;

      return {
        segment: `${ageGroup} ${gender}`,
        count: uniqueCustomers,
        avgSatisfaction,
        revisitIntention,
        recommendationScore,
      };
    })
    .filter((segment) => segment.count > 0)
    .sort((a, b) => b.count - a.count);
}

// 트렌드 분석
function analyzeTrends(responses: Array<Record<string, unknown>>): {
  satisfactionTrend: string;
  growthPotential: string;
} {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentResponses = responses.filter(
    (r) =>
      new Date(r.created_at) >= oneWeekAgo &&
      r.required_question_category === "overall_satisfaction" &&
      r.rating
  );

  const previousResponses = responses.filter(
    (r) =>
      new Date(r.created_at) >= twoWeeksAgo &&
      new Date(r.created_at) < oneWeekAgo &&
      r.required_question_category === "overall_satisfaction" &&
      r.rating
  );

  let satisfactionTrend = "안정적";
  let growthPotential = "보통";

  if (recentResponses.length > 0 && previousResponses.length > 0) {
    const recentAvg =
      recentResponses.reduce((sum, r) => sum + r.rating, 0) /
      recentResponses.length;
    const previousAvg =
      previousResponses.reduce((sum, r) => sum + r.rating, 0) /
      previousResponses.length;

    const change = recentAvg - previousAvg;

    if (change > 0.3) satisfactionTrend = "상승세";
    else if (change < -0.3) satisfactionTrend = "하락세";

    const nps = calculateNPS(responses);
    const loyaltyIndex = calculateLoyaltyIndex(responses);

    if (nps > 50 && loyaltyIndex > 70) growthPotential = "높음";
    else if (nps > 20 && loyaltyIndex > 50) growthPotential = "보통";
    else growthPotential = "낮음";
  }

  return { satisfactionTrend, growthPotential };
}

// 데이터 기반 요약 생성
function generateDataBasedSummary(
  nps: number,
  csat: number,
  loyaltyIndex: number,
  segments: CustomerSegment[],
  visitAnalysis: Record<string, unknown>,
  trends: Record<string, unknown>,
  totalCustomers: number,
  totalResponses: number,
  responses: Array<Record<string, unknown>>
): string {
  // 실제 응답 데이터의 날짜 범위 계산
  const responseDates = responses.map((r) => new Date(r.created_at)).sort();
  const oldestDate = responseDates[0];
  const newestDate = responseDates[responseDates.length - 1];

  const dateRange =
    oldestDate && newestDate
      ? `${oldestDate.getFullYear()}년 ${
          oldestDate.getMonth() + 1
        }월 - ${newestDate.getFullYear()}년 ${newestDate.getMonth() + 1}월`
      : "최근 기간";

  // 핵심 지표 평가
  const npsLevel = nps > 50 ? "우수" : nps > 0 ? "보통" : "개선필요";
  const csatLevel = csat > 80 ? "우수" : csat > 60 ? "보통" : "개선필요";
  const loyaltyLevel =
    loyaltyIndex > 70 ? "높음" : loyaltyIndex > 50 ? "보통" : "낮음";

  // 주요 고객층 분석
  const mainSegment = segments[0];
  const customerProfile = mainSegment ? mainSegment.segment : "다양한 연령층";

  // 방문 패턴 분석
  const visitPattern =
    visitAnalysis.newCustomers > 60
      ? "신규 고객 중심"
      : visitAnalysis.loyalCustomers > 30
      ? "단골 고객 중심"
      : "균형적 고객층";

  return `【${dateRange} 데이터 분석 결과】

총 ${totalCustomers}명의 고객이 ${totalResponses}건의 응답을 제공했습니다. 

▸ 핵심 지표: NPS ${nps}점(${npsLevel}), CSAT ${csat}%(${csatLevel}), 고객충성도 ${loyaltyIndex}%(${loyaltyLevel})
▸ 주요 고객층: ${customerProfile} 
▸ 방문 패턴: ${visitPattern} (신규 ${visitAnalysis.newCustomers}%, 단골 ${
    visitAnalysis.loyalCustomers
  }%)
▸ 만족도 트렌드: ${trends.satisfactionTrend}
▸ 성장 잠재력: ${trends.growthPotential}

${
  nps > 50
    ? "고객 추천 의향이 높아 브랜드 충성도가 우수합니다."
    : nps > 0
    ? "고객 만족도는 평균 수준이나 추천 의향 개선이 필요합니다."
    : "고객 불만이 높아 즉각적인 서비스 개선이 시급합니다."
}`;
}

// 전문적인 인사이트 및 액션 아이템 생성

function generateProfessionalInsights(
  responses: Array<Record<string, unknown>>,
  customers: Array<Record<string, unknown>>,
  nps: number,
  csat: number,
  loyaltyIndex: number,
  segments: CustomerSegment[],
  visitAnalysis: Record<string, unknown>
) {
  const criticalIssues: string[] = [];
  const improvementPriorities: string[] = [];
  const strategicRecommendations: string[] = [];
  const strengthAreas: string[] = [];
  const weaknessAreas: string[] = [];
  const opportunityAreas: string[] = [];

  // 핵심 지표 기반 분석
  if (nps < 0) {
    criticalIssues.push("NPS 점수가 매우 낮아 고객 이탈 위험이 높습니다");
    improvementPriorities.push("고객 불만 사항 즉시 파악 및 개선");
  } else if (nps > 50) {
    strengthAreas.push("높은 고객 추천 점수로 브랜드 충성도가 우수합니다");
  }

  if (csat < 60) {
    criticalIssues.push("고객 만족도가 평균 이하로 서비스 개선이 시급합니다");
    improvementPriorities.push("핵심 서비스 품질 향상");
  } else if (csat > 80) {
    strengthAreas.push("높은 고객 만족도로 서비스 품질이 우수합니다");
  }

  if (loyaltyIndex < 50) {
    weaknessAreas.push("고객 충성도가 낮아 리텐션 전략이 필요합니다");
    improvementPriorities.push("고객 관계 관리 및 로열티 프로그램 강화");
  }

  // 추가 단점 분석
  if (nps < 30 && nps >= 0) {
    weaknessAreas.push("추천 의향이 낮아 입소문 마케팅 효과가 제한적입니다");
  }

  if (csat < 75 && csat >= 60) {
    weaknessAreas.push("만족도가 보통 수준으로 경쟁 우위 확보가 어렵습니다");
  }

  // 방문빈도 기반 단점 분석
  if (visitAnalysis.newCustomers > 70) {
    weaknessAreas.push(
      "신규 고객 비율이 과도하게 높아 고객 유지에 어려움이 있습니다"
    );
  }

  if (visitAnalysis.loyalCustomers < 20) {
    weaknessAreas.push(
      "단골 고객 비율이 낮아 안정적 매출 확보에 한계가 있습니다"
    );
  }

  // 방문빈도 분석 기반
  if (visitAnalysis.newCustomers > 60) {
    opportunityAreas.push("신규 고객 비율이 높아 성장 잠재력이 있습니다");
    strategicRecommendations.push(
      "신규 고객을 단골로 전환하는 리텐션 프로그램 개발"
    );
  }

  if (visitAnalysis.loyalCustomers > 30) {
    strengthAreas.push(
      "충성 고객 비율이 높아 안정적인 매출 기반을 보유하고 있습니다"
    );
  }

  // 세그먼트 분석 기반
  const mainSegment = segments[0];
  if (mainSegment) {
    if (mainSegment.segment.includes("20대")) {
      strategicRecommendations.push("20대 고객층 특화 메뉴 및 서비스 개발");
      opportunityAreas.push("젊은 고객층의 SNS 마케팅 활용 가능성");
    }

    if (mainSegment.avgSatisfaction < 70) {
      improvementPriorities.push(
        `주요 고객층(${mainSegment.segment})의 만족도 개선 집중`
      );
    }
  }

  // 슭돈 특화 분석 (돼지고기 전문점)
  strategicRecommendations.push(
    "초신선 무항생제 돼지고기의 차별화 포인트 적극 홍보"
  );
  strategicRecommendations.push("이대역 접근성을 활용한 대학가 마케팅 강화");

  if (csat > 75) {
    strengthAreas.push("밑반찬과 고기 품질에 대한 높은 만족도");
  }

  // 개선 우선순위 설정
  if (criticalIssues.length === 0) {
    if (nps < 30) {
      improvementPriorities.push("고객 추천 의향 향상을 위한 서비스 차별화");
    }
    improvementPriorities.push("고객 경험 개선을 통한 만족도 향상");
    improvementPriorities.push("메뉴 다양성 및 가격 경쟁력 강화");
  }

  // 개선 방안을 체계화
  const weaknessImprovements: string[] = [];
  const strengthLeverage: string[] = [];

  // 단점 개선 방안
  if (weaknessAreas.length > 0) {
    weaknessImprovements.push("고객 리텐션 강화를 위한 로열티 프로그램 도입");
    weaknessImprovements.push("고객 피드백 시스템 구축 및 정기적 만족도 조사");
  }

  if (csat < 80) {
    weaknessImprovements.push("서비스 표준화 교육 및 품질 관리 시스템 강화");
    weaknessImprovements.push("고객 불만 처리 프로세스 개선");
  }

  if (nps < 50) {
    weaknessImprovements.push("고객 경험 여정 분석 및 터치포인트 개선");
  }

  // 고기 텍스쳐 관련 개선
  weaknessImprovements.push(
    "고기 텍스쳐 다양성을 위한 쎈불 마이야르 조리법 도입"
  );
  weaknessImprovements.push(
    "테이블 간격 및 좌석 배치 개선으로 쾌적한 식사 환경 조성"
  );

  // 장점 활용 방안
  if (strengthAreas.length > 0) {
    strengthLeverage.push("우수한 서비스 품질을 활용한 프리미엄 포지셔닝 강화");
    strengthLeverage.push("만족한 고객들의 후기 및 추천 마케팅 활용");
  }

  if (visitAnalysis.loyalCustomers > 30) {
    strengthLeverage.push("충성 고객 대상 VIP 서비스 및 특별 혜택 제공");
    strengthLeverage.push("충성 고객을 통한 신규 고객 유치 프로그램");
  }

  if (nps > 50) {
    strengthLeverage.push("높은 추천 의향을 활용한 입소문 마케팅 전략");
  }

  strengthLeverage.push("초신선 무항생제 돼지고기 브랜딩 강화");
  strengthLeverage.push("이대역 입지를 활용한 대학생 타겟 마케팅");
  strengthLeverage.push(
    "친절한 직원 서비스와 좋은 분위기를 SNS 홍보 포인트로 활용"
  );

  return {
    criticalIssues,
    improvementPriorities: improvementPriorities.slice(0, 5),
    strategicRecommendations: strategicRecommendations.slice(0, 5),
    strengthAreas: strengthAreas.slice(0, 4),
    weaknessAreas: weaknessAreas.slice(0, 3),
    opportunityAreas: opportunityAreas.slice(0, 4),
    weaknessImprovements: weaknessImprovements.slice(0, 4),
    strengthLeverage: strengthLeverage.slice(0, 4),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== 전문 AI 통계 분석 시작 ===");
    const { id: surveyId } = await params;

    const userId = "5e1f5903-b48d-4502-95cb-838df25fbf48";

    // 설문 확인
    const { data: surveyDataArray, error: surveyError } = await supabase
      .from("surveys")
      .select("id, title")
      .eq("id", surveyId)
      .eq("user_id", userId);

    if (surveyError || !surveyDataArray || surveyDataArray.length === 0) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 최근 3개월 응답 데이터 조회
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(
        `
        *,
        customer_info:customer_info_id (
          id,
          age_group,
          gender,
          created_at
        )
      `
      )
      .eq("survey_id", surveyId)
      .gte("created_at", threeMonthsAgo.toISOString())
      .limit(10000);

    if (responsesError) {
      return NextResponse.json(
        { error: "응답 데이터를 불러올 수 없습니다." },
        { status: 500 }
      );
    }

    // 고객 정보 조회
    const { data: customers, error: customersError } = await supabase
      .from("customer_info")
      .select("*")
      .eq("survey_id", surveyId);

    if (customersError) {
      return NextResponse.json(
        { error: "고객 데이터를 불러올 수 없습니다." },
        { status: 500 }
      );
    }

    console.log(
      `📊 데이터 로드 완료: 응답 ${responses?.length}개, 고객 ${customers?.length}명`
    );

    if (!responses || responses.length === 0) {
      return NextResponse.json({
        success: true,
        statistics: [],
        message: "분석할 데이터가 충분하지 않습니다.",
      });
    }

    // 전문적인 AI 분석 수행
    const nps = calculateNPS(responses);
    const csat = calculateCSAT(responses);
    const loyaltyIndex = calculateLoyaltyIndex(responses);
    const customerSegments = analyzeCustomerSegments(
      responses,
      customers || []
    );
    const visitFrequencyAnalysis = analyzeVisitFrequency(responses);
    const trends = analyzeTrends(responses);

    const insights = generateProfessionalInsights(
      responses,
      customers || [],
      nps,
      csat,
      loyaltyIndex,
      customerSegments,
      visitFrequencyAnalysis
    );

    // AI 통계 데이터 생성
    const aiStatistics: RestaurantInsights = {
      nps,
      csat,
      customerRetentionScore: loyaltyIndex,
      loyaltyIndex,
      customerSegments,
      visitFrequencyAnalysis,
      satisfactionTrend: trends.satisfactionTrend,
      growthPotential: trends.growthPotential,
      ...insights,
    };

    // 데이터베이스에 저장
    const { data: savedStats, error: saveError } = await supabase
      .from("ai_statistics")
      .insert({
        survey_id: surveyId,
        user_id: userId,
        summary: generateDataBasedSummary(
          nps,
          csat,
          loyaltyIndex,
          customerSegments,
          visitFrequencyAnalysis,
          trends,
          new Set(responses.map((r) => r.customer_info_id)).size,
          responses.length,
          responses
        ),
        total_responses: new Set(responses.map((r) => r.customer_info_id)).size,
        average_rating: csat / 20, // 5점 척도로 변환
        main_customer_age_group:
          customerSegments[0]?.segment.split(" ")[0] || "미분류",
        main_customer_gender:
          customerSegments[0]?.segment.split(" ")[1] || "미분류",
        top_pros: insights.strengthAreas,
        top_cons: insights.weaknessAreas,
        analysis_date: new Date().toISOString(),
        statistics: aiStatistics,
        recommendations: `주요 개선사항: ${insights.improvementPriorities.join(
          ", "
        )}. 전략적 권장사항: ${insights.strategicRecommendations.join(", ")}`,
      })
      .select()
      .single();

    if (saveError) {
      console.error("AI 통계 저장 오류:", saveError);
    }

    console.log("✅ 전문 AI 분석 완료");

    return NextResponse.json({
      success: true,
      statistics: savedStats ? [savedStats] : [],
      live_analysis: aiStatistics,
      insights: {
        key_metrics: {
          nps: `${nps} (${nps > 50 ? "우수" : nps > 0 ? "보통" : "개선필요"})`,
          csat: `${csat}% (${
            csat > 80 ? "우수" : csat > 60 ? "보통" : "개선필요"
          })`,
          loyalty: `${loyaltyIndex}% (${
            loyaltyIndex > 70 ? "높음" : loyaltyIndex > 50 ? "보통" : "낮음"
          })`,
        },
        action_summary: {
          critical: insights.criticalIssues.length,
          priorities: insights.improvementPriorities.length,
          opportunities: insights.opportunityAreas.length,
        },
      },
    });
  } catch (error: unknown) {
    console.error("=== AI 통계 분석 오류 ===", error);
    const message = error instanceof Error ? error.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// AI 통계 재생성을 위한 POST 엔드포인트
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params });
}
