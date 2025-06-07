"use client";

import Link from "next/link";
import {
  BarChart,
  ThumbsUp,
  Eye,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Star,
  Bot,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { User as AuthUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { useState, useEffect } from "react";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
}

interface AIStatistic {
  id: string;
  summary: string;
  total_responses: number;
  average_rating?: number;
  main_customer_age_group?: string;
  main_customer_gender?: string;
  top_pros?: string[];
  top_cons?: string[];
  analysis_date: string;
}

interface RecentResponse {
  id: string;
  customer_info_id: string;
  customer_info: {
    name: string;
    age_group: string;
    gender: string;
  };
  response_text?: string;
  rating?: number;
  selected_option?: string;
  created_at: string;
  is_read: boolean;
  questions?: {
    question_text: string;
    question_type: string;
  };
}

interface ResponseModalData {
  customer_info: {
    name: string;
    age_group: string;
    gender: string;
  };
  responses: Array<{
    question_text: string;
    question_type: string;
    response_text?: string;
    rating?: number;
    selected_option?: string;
  }>;
  created_at: string;
}

// 차트 데이터 인터페이스
interface RevisitTrendData {
  date: string;
  percentage: number;
  count: number;
}

interface ResponseTrendData {
  date: string;
  count: number;
}

interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

// 필수 질문 인터페이스 추가
interface RequiredQuestion {
  id: string;
  category: string;
  question_text: string;
  question_type: "rating" | "single_choice" | "text";
  is_active: boolean;
  options?: { [key: string]: any };
}

// 카테고리별 통계 인터페이스 추가
interface CategoryStats {
  category: string;
  average?: number;
  distribution?: { [key: string]: number };
  trend?: Array<{ date: string; value: number; count: number }>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalCustomers: 0,
    recentCustomerCount: 0,
    avgResponseTime: 0,
    unreadCount: 0,
    avgRating: 0,
  });
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [latestAIStats, setLatestAIStats] = useState<AIStatistic | null>(null);
  const [selectedResponseData, setSelectedResponseData] =
    useState<ResponseModalData | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  // 필수 질문 상태 추가
  const [requiredQuestions, setRequiredQuestions] = useState<
    RequiredQuestion[]
  >([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  // 차트 데이터 상태 (디폴트 7일 0값 데이터로 차트 영역 표시)
  const [revisitTrendData, setRevisitTrendData] = useState<RevisitTrendData[]>(
    () => {
      const init: RevisitTrendData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        init.push({
          date: date.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          }),
          percentage: 0,
          count: 0,
        });
      }
      return init;
    }
  );
  const [responseTrendData, setResponseTrendData] = useState<
    ResponseTrendData[]
  >(() => {
    const init: ResponseTrendData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      init.push({
        date: date.toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        }),
        count: 0,
      });
    }
    return init;
  });
  const [ratingDistribution, setRatingDistribution] = useState<
    RatingDistribution[]
  >([]);

  const router = useRouter();

  // 필수 질문 상태 가져오기 함수 - 사용자가 활성화한 질문들만 조회
  const fetchRequiredQuestions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_required_questions")
        .select(
          `
          *,
          required_questions!inner(*)
        `
        )
        .eq("user_id", userId)
        .eq("is_enabled", true)
        .eq("required_questions.is_active", true);

      if (error) {
        console.error("Error fetching required questions:", error);
        return [];
      }

      // 필수 질문 데이터만 추출하고 is_active 속성 추가
      const requiredQuestionsData = (data || []).map((userQuestion) => ({
        ...userQuestion.required_questions,
        is_active: userQuestion.is_enabled, // user_required_questions의 is_enabled를 is_active로 매핑
      }));

      setRequiredQuestions(requiredQuestionsData);
      return requiredQuestionsData;
    } catch (error) {
      console.error("Error in fetchRequiredQuestions:", error);
      return [];
    }
  };

  // 🚀 모든 데이터를 한 번에 가져오는 최적화된 함수
  const fetchAllDashboardData = async (
    surveyId: string,
    questions: RequiredQuestion[]
  ) => {
    try {
      console.log("🚀 Starting optimized data fetch for survey:", surveyId);

      // 활성화된 질문들만 필터링
      const enabledQuestions = questions.filter((q) => q.is_active);
      const enabledCategories = enabledQuestions.map((q) => q.category);

      // 모든 필요한 데이터를 5개의 쿼리로 가져오기
      const [
        { data: allResponses, error: responsesError },
        { data: allCustomers, error: customersError },
        { data: aiStatsData, error: aiError },
        { data: questionsData, error: questionsError },
        { data: requiredQuestionsData, error: requiredQuestionsError },
      ] = await Promise.all([
        // 1. 모든 응답 데이터 (필요한 조인만, 제한 없이)
        supabase
          .from("responses")
          .select(
            `
            *,
            customer_info:customer_info_id (
              name,
              age_group,
              gender,
              created_at
            )
          `
          )
          .eq("survey_id", surveyId)
          .limit(10000), // 모든 데이터 로드

        // 2. 모든 고객 정보
        supabase
          .from("customer_info")
          .select("id, created_at")
          .eq("survey_id", surveyId),

        // 3. AI 통계
        supabase
          .from("ai_statistics")
          .select("*")
          .eq("survey_id", surveyId)
          .order("analysis_date", { ascending: false })
          .limit(1),

        // 4. 설문 질문 정보 (선택지 텍스트 매핑용)
        supabase
          .from("questions")
          .select(
            "id, question_text, question_type, options, required_question_id"
          )
          .eq("survey_id", surveyId),

        // 5. 필수 질문 정보 (선택지 텍스트 포함)
        supabase
          .from("required_questions")
          .select("id, category, question_text, question_type, options"),
      ]);

      if (responsesError) throw responsesError;
      if (customersError) throw customersError;
      if (questionsError) throw questionsError;
      if (requiredQuestionsError) throw requiredQuestionsError;

      console.log("📊 Data fetched:", {
        responsesCount: allResponses?.length || 0,
        customersCount: allCustomers?.length || 0,
        aiStats: !!aiStatsData?.[0],
        enabledQuestions: enabledQuestions.length,
        sampleResponse: allResponses?.[0],
      });

      // 🔍 응답 카테고리별 상세 분석
      if (allResponses) {
        const categoryCounts = allResponses.reduce((acc, r) => {
          const category = r.required_question_category || "null";
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
        console.log("🔍 Response category breakdown:", categoryCounts);

        // 샘플 응답 데이터 상세 분석
        console.log(
          "🔍 Sample response data:",
          allResponses.slice(0, 3).map((r) => ({
            id: r.id,
            required_question_category: r.required_question_category,
            rating: r.rating,
            response_text: r.response_text?.substring(0, 50),
            selected_option: r.selected_option,
            survey_id: r.survey_id,
            question_id: r.question_id,
            created_at: r.created_at,
          }))
        );

        const overallSatisfactionResponses = allResponses.filter(
          (r) => r.required_question_category === "overall_satisfaction"
        );
        console.log("🔍 Overall satisfaction responses loaded:", {
          count: overallSatisfactionResponses.length,
          withRating: overallSatisfactionResponses.filter((r) => r.rating)
            .length,
          sampleData: overallSatisfactionResponses.slice(0, 3).map((r) => ({
            id: r.id,
            rating: r.rating,
            category: r.required_question_category,
          })),
        });
      }

      // AI 통계 설정
      if (aiStatsData?.[0]) {
        setLatestAIStats(aiStatsData[0]);
      }

      // 🔄 클라이언트에서 모든 계산 수행
      processAllData(
        allResponses || [],
        allCustomers || [],
        enabledQuestions,
        questionsData || [],
        requiredQuestionsData || []
      );
    } catch (error) {
      console.error("❌ Error in optimized data fetch:", error);
    }
  };

  // 🔄 모든 데이터 처리를 한 번에 수행하는 함수
  const processAllData = (
    responses: any[],
    customers: any[],
    enabledQuestions: RequiredQuestion[],
    questionsData: any[],
    requiredQuestionsData: any[]
  ) => {
    console.log("🔄 Processing all data...");

    // 날짜 계산 헬퍼
    const getDayRange = (daysAgo: number) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dayStart = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      return {
        dayStart,
        dayEnd,
        label: dayStart.toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        }),
      };
    };

    // 기본 통계 계산
    const totalCustomers = customers.length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCustomerCount = customers.filter(
      (c) => new Date(c.created_at) >= sevenDaysAgo
    ).length;

    // 읽지 않은 응답 수
    const unreadCustomerSet = new Set(
      responses.filter((r) => !r.is_read).map((r) => r.customer_info_id)
    );
    const unreadCount = unreadCustomerSet.size;

    // 평균 평점 (전반적 만족도)
    const overallRatings = responses.filter(
      (r) => r.required_question_category === "overall_satisfaction" && r.rating
    );
    console.log(
      "📊 Overall ratings:",
      overallRatings.length,
      "responses found"
    );
    const avgRating =
      overallRatings.length > 0
        ? overallRatings.reduce((sum, r) => sum + r.rating, 0) /
          overallRatings.length
        : 0;

    // 기본 통계 설정
    setDashboardStats({
      totalCustomers,
      recentCustomerCount,
      avgResponseTime: 0, // 계산 복잡하므로 일단 0으로 설정
      unreadCount,
      avgRating,
    });

    // 카테고리별 통계 계산
    const categoryStats: CategoryStats[] = [];
    console.log(
      "🔍 Processing categories for enabled questions:",
      enabledQuestions.map((q) => q.category)
    );

    // 질문 ID별 매핑 생성 (선택지 텍스트 변환용)
    const questionMap = new Map();
    questionsData.forEach((q) => {
      questionMap.set(q.id, q);
    });

    // 필수 질문 카테고리별 매핑 생성 (선택지 텍스트용)
    const requiredQuestionMap = new Map();
    requiredQuestionsData.forEach((rq) => {
      requiredQuestionMap.set(rq.category, rq);
    });

    enabledQuestions.forEach((question) => {
      const categoryResponses = responses.filter(
        (r) => r.required_question_category === question.category
      );
      console.log(
        `📊 Category ${question.category}:`,
        categoryResponses.length,
        "responses found",
        categoryResponses.length > 0 ? "✅" : "❌"
      );

      // 샘플 응답 데이터 출력
      if (categoryResponses.length > 0) {
        console.log(
          `   Sample data for ${question.category}:`,
          categoryResponses.slice(0, 2).map((r) => ({
            rating: r.rating,
            selected_option: r.selected_option,
            response_text: r.response_text?.substring(0, 50),
          }))
        );
      }

      if (question.question_type === "rating") {
        const ratingResponses = categoryResponses.filter((r) => r.rating);
        if (ratingResponses.length > 0) {
          const average =
            ratingResponses.reduce((sum, r) => sum + r.rating, 0) /
            ratingResponses.length;

          // 7일 트렌드 계산
          const trend = [];
          for (let i = 6; i >= 0; i--) {
            const { dayStart, dayEnd, label } = getDayRange(i);
            const dayResponses = ratingResponses.filter((r) => {
              const responseDate = new Date(r.created_at);
              return responseDate >= dayStart && responseDate < dayEnd;
            });

            const dayAverage =
              dayResponses.length > 0
                ? dayResponses.reduce((sum, r) => sum + r.rating, 0) /
                  dayResponses.length
                : 0;

            trend.push({
              date: label,
              value: Math.round((dayAverage / 5) * 100),
              count: dayResponses.length,
            });
          }

          categoryStats.push({ category: question.category, average, trend });
        }
      } else if (question.question_type === "single_choice") {
        // 필수 질문에서 선택지 정보 가져오기
        const requiredQuestion = requiredQuestionsData.find(
          (rq) => rq.category === question.category
        );

        // 모든 선택지를 0으로 초기화
        const distribution: { [key: string]: number } = {};

        if (requiredQuestion?.options?.choices_text) {
          requiredQuestion.options.choices_text.forEach((choice: string) => {
            distribution[choice] = 0;
          });
        }

        // 실제 응답으로 카운트 업데이트
        const choiceResponses = categoryResponses.filter(
          (r) => r.selected_option
        );

        choiceResponses.forEach((r) => {
          // 선택지 ID를 실제 텍스트로 변환
          let displayText = r.selected_option;

          if (requiredQuestion?.options?.choices_text) {
            const choiceIndex =
              parseInt(r.selected_option.replace("choice_", "")) - 1;
            if (
              choiceIndex >= 0 &&
              choiceIndex < requiredQuestion.options.choices_text.length
            ) {
              displayText = requiredQuestion.options.choices_text[choiceIndex];
            }
          }

          if (distribution.hasOwnProperty(displayText)) {
            distribution[displayText] = (distribution[displayText] || 0) + 1;
          }
        });

        categoryStats.push({ category: question.category, distribution });
      }
    });

    setCategoryStats(categoryStats);

    console.log(
      "📊 Setting category stats:",
      categoryStats.length,
      "categories"
    );

    // 차트 데이터 계산
    console.log("📈 Processing chart data...");
    console.log(
      "🔄 About to process chart data with",
      responses.length,
      "responses and",
      enabledQuestions.length,
      "enabled questions"
    );
    processChartData(responses, enabledQuestions);

    // 최근 응답 계산
    console.log("👥 Processing recent responses...");
    processRecentResponses(responses);
  };

  // 차트 데이터 처리
  const processChartData = (
    responses: any[],
    enabledQuestions: RequiredQuestion[]
  ) => {
    console.log("🚀 Starting processChartData with:", {
      totalResponses: responses.length,
      enabledQuestions: enabledQuestions.map((q) => q.category),
      sampleResponses: responses.slice(0, 3).map((r) => ({
        category: r.required_question_category,
        rating: r.rating,
        created_at: r.created_at,
      })),
    });

    // 재방문 의사 트렌드
    const revisitQuestion = enabledQuestions.find(
      (q) => q.category === "revisit_intention"
    );
    if (revisitQuestion) {
      const revisitResponses = responses.filter(
        (r) => r.required_question_category === "revisit_intention" && r.rating
      );

      const trendData: RevisitTrendData[] = [];
      for (let i = 6; i >= 0; i--) {
        const { dayStart, dayEnd, label } = getDayRange(i);
        const dayResponses = revisitResponses.filter((r) => {
          const responseDate = new Date(r.created_at);
          return responseDate >= dayStart && responseDate < dayEnd;
        });

        const averageScore =
          dayResponses.length > 0
            ? Math.round(
                (dayResponses.reduce((sum, r) => sum + r.rating, 0) /
                  dayResponses.length /
                  5) *
                  100
              )
            : 0;

        trendData.push({
          date: label,
          percentage: averageScore,
          count: dayResponses.length,
        });
      }
      console.log("📈 Revisit trend data set:", trendData.length, "days");
      setRevisitTrendData(trendData);
    }

    // 응답 트렌드
    const responseTrendData: ResponseTrendData[] = [];
    for (let i = 6; i >= 0; i--) {
      const { dayStart, dayEnd, label } = getDayRange(i);
      const dayResponses = responses.filter((r) => {
        const responseDate = new Date(r.created_at);
        return responseDate >= dayStart && responseDate < dayEnd;
      });

      const uniqueCustomers = new Set(
        dayResponses.map((r) => r.customer_info_id)
      );
      responseTrendData.push({
        date: label,
        count: uniqueCustomers.size,
      });
    }
    console.log(
      "📈 Response trend data set:",
      responseTrendData.length,
      "days"
    );
    setResponseTrendData(responseTrendData);

    // 별점 분포
    const overallRatings = responses.filter(
      (r) => r.required_question_category === "overall_satisfaction" && r.rating
    );

    console.log("⭐ Debug - Overall satisfaction ratings:", {
      totalResponses: responses.length,
      overallRatingsFound: overallRatings.length,
      sampleRatings: overallRatings.slice(0, 3).map((r) => ({
        category: r.required_question_category,
        rating: r.rating,
      })),
    });

    // 별점 분포는 응답이 있을 때만 처리하지만, 1-5점 모든 별점을 표시
    const distribution: RatingDistribution[] = [];
    for (let rating = 1; rating <= 5; rating++) {
      const count = overallRatings.filter((r) => r.rating === rating).length;
      const percentage =
        overallRatings.length > 0
          ? Math.round((count / overallRatings.length) * 100)
          : 0;
      distribution.push({ rating, count, percentage });
    }
    console.log("⭐ Rating distribution set:", distribution);
    setRatingDistribution(distribution);
  };

  // 최근 응답 처리
  const processRecentResponses = (responses: any[]) => {
    const validResponses = responses.filter(
      (r) => (r.response_text || r.rating) && r.customer_info
    );

    const customerResponseMap = new Map();
    validResponses.forEach((response) => {
      const customerId = response.customer_info_id;
      if (!customerResponseMap.has(customerId)) {
        customerResponseMap.set(customerId, response);
      } else {
        const existingResponse = customerResponseMap.get(customerId);
        if (
          new Date(response.created_at) > new Date(existingResponse.created_at)
        ) {
          customerResponseMap.set(customerId, response);
        }
      }
    });

    const recentResponsesData = Array.from(customerResponseMap.values())
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);

    setRecentResponses(recentResponsesData);
  };

  // 날짜 계산 헬퍼 함수
  const getDayRange = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dayStart = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return {
      dayStart,
      dayEnd,
      label: dayStart.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      }),
    };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error or no session:", sessionError?.message);
        router.push("/login");
        setLoading(false);
        return;
      }
      setUser(session.user);

      try {
        // 필수 질문 상태 가져오기
        console.log("🔑 Current user ID:", session.user.id);
        const questions = await fetchRequiredQuestions(session.user.id);
        console.log(
          "📋 Fetched required questions:",
          questions.length,
          "questions"
        );
        if (questions) {
          console.log(
            "Questions with is_active status:",
            questions.map((q) => ({
              category: q.category,
              is_active: q.is_active,
              type: typeof q.is_active,
            }))
          );
        }

        // 1. 활성 설문 조회
        const { data: activeSurveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("id, title, description, created_at, is_active")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .single();

        if (surveyError) {
          console.error("❌ Error fetching active survey:", surveyError);
        } else if (!activeSurveyData) {
          console.log("⚠️  No active survey found for user:", session.user.id);
        } else {
          console.log(
            "✅ Active survey found:",
            activeSurveyData.id,
            activeSurveyData.title
          );
          setActiveSurvey(activeSurveyData);

          if (activeSurveyData && questions) {
            console.log("Active survey found:", activeSurveyData.id);
            console.log(
              "Enabled questions:",
              questions.filter((q) => q.is_active)
            );

            // 활성화된 필수 질문들에 대한 통계 가져오기
            await fetchAllDashboardData(activeSurveyData.id, questions);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "SIGNED_OUT" || !newSession) {
          setUser(null);
          router.push("/login");
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setUser(newSession?.user ?? null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Compute latest non-zero revisit trend entry for caption
  const latestRevisitEntry =
    [...revisitTrendData].reverse().find((entry) => entry.count > 0) ||
    revisitTrendData[revisitTrendData.length - 1];
  // Compute latest non-zero response trend entry for caption
  const latestResponseEntry =
    [...responseTrendData].reverse().find((entry) => entry.count > 0) ||
    responseTrendData[responseTrendData.length - 1];

  // 카테고리 이름 매핑
  const getCategoryDisplayName = (category: string) => {
    const nameMap: { [key: string]: string } = {
      revisit_intention: "재방문의사",
      recommendation: "추천의사",
      overall_satisfaction: "전반적 만족도",
      visit_frequency: "방문빈도",
      service_quality: "서비스 품질",
      value_for_money: "가성비",
      customer_service: "고객 서비스",
      cleanliness: "청결도",
      accessibility: "접근성",
      waiting_time: "대기시간",
      food_quality: "음식 품질",
      food_portion: "음식 양",
      atmosphere: "분위기",
      menu_variety: "메뉴 다양성",
      payment_convenience: "결제 편의성",
    };
    return nameMap[category] || category;
  };

  // 활성화된 필수 질문들
  const enabledQuestions = requiredQuestions.filter((q) => q.is_active);

  // 실제 데이터만 사용
  const displayStats = categoryStats;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon={Activity}
          title="대시보드를 불러오는 중..."
          description="잠시만 기다려 주세요."
          variant="default"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-1">
              실시간 피드백 분석 및 설문 현황
            </p>
          </div>
        </div>

        {/* 활성 설문 정보 */}
        {activeSurvey ? (
          <div className="bg-blue-50 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-400 rounded-2xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      {activeSurvey.title}
                    </h2>
                    <span className="px-3 py-1 bg-green-400 text-white text-sm rounded-full font-medium">
                      실시중
                    </span>
                  </div>
                </div>
                <div>
                  <Link
                    href={`/view/survey/${activeSurvey.id}`}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                  >
                    설문지 보기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
            <EmptyState
              icon={AlertTriangle}
              title="활성 설문이 없습니다"
              description="설문을 생성하고 활성화하여 고객 피드백을 받아보세요."
              action={
                <Link
                  href="/dashboard/surveys/new"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4 mr-2" />새 설문 만들기
                </Link>
              }
              variant="card"
            />
          </div>
        )}

        {/* 주요 통계 카드 - 동적 렌더링 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 기본 카드들 - 항상 표시 */}
          {/* 전체 고객수 카드 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">전체 고객수</h3>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">
                {dashboardStats.totalCustomers}
              </p>
              <p className="text-xs text-gray-500">누적 고객 수</p>
            </div>
          </div>

          {/* 최근 7일 신규 고객 카드 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">
                신규 고객(7일)
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">
                {dashboardStats.recentCustomerCount}
              </p>
              <p className="text-xs text-gray-500">최근 7일간 신규 고객</p>
            </div>
          </div>

          {/* 전반적 만족도 카드 - 활성화된 경우에만 표시 */}
          {requiredQuestions.find(
            (q) => q.category === "overall_satisfaction" && q.is_active
          ) && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-medium text-gray-900">평균 평점</h3>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardStats.avgRating.toFixed(1)}점
                </p>
                <p className="text-xs text-gray-500">전반적 만족도</p>
              </div>
            </div>
          )}
        </div>

        {/* 주요 지표 추이 - 재방문의사와 추천의사 */}
        {(enabledQuestions.find((q) => q.category === "revisit_intention") ||
          enabledQuestions.find((q) => q.category === "recommendation")) && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              주요 지표 추이
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 재방문의사 트렌드 차트 */}
              {enabledQuestions.find(
                (q) => q.category === "revisit_intention"
              ) && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      재방문의사 추이
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      재방문의사 평균 점수 (5점 만점 기준)
                    </p>
                  </div>
                  <div className="p-6">
                    {revisitTrendData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revisitTrendData}>
                              <defs>
                                <linearGradient
                                  id="revisitGradient"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="#3b82f6"
                                    stopOpacity={0.3}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="#3b82f6"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                }}
                                formatter={(
                                  value: number,
                                  name: string,
                                  props: any
                                ) => [
                                  `${Math.round(value)}% (${
                                    props.payload.count
                                  }명 응답)`,
                                  "재방문의사 점수",
                                ]}
                                labelStyle={{ color: "#374151" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="percentage"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#revisitGradient)"
                                dot={{
                                  fill: "#3b82f6",
                                  stroke: "white",
                                  strokeWidth: 2,
                                  r: 4,
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">
                            최근 평균:{" "}
                            <span className="font-medium text-blue-600">
                              {latestRevisitEntry.percentage}% (
                              {(
                                (latestRevisitEntry.percentage * 5) /
                                100
                              ).toFixed(1)}
                              점)
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            응답 {latestRevisitEntry.count}명 기준
                            {latestRevisitEntry.count < 5 &&
                              latestRevisitEntry.count > 0 && (
                                <span className="text-orange-500 ml-1">
                                  • 표본 수 부족
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={TrendingUp}
                        title="아직 데이터가 없습니다"
                        description="데이터가 충분히 수집되지 않아 차트를 표시할 수 없습니다."
                        action={
                          <Link
                            href="/dashboard/surveys"
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                          >
                            <BarChart className="h-4 w-4 mr-2" />
                            설문 관리하기
                          </Link>
                        }
                        variant="chart"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 추천의사 트렌드 차트 */}
              {enabledQuestions.find(
                (q) => q.category === "recommendation"
              ) && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                      </div>
                      추천의사 추이
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      추천의사 평균 점수 (5점 만점 기준)
                    </p>
                  </div>
                  <div className="p-6">
                    {(() => {
                      const stats = displayStats.find(
                        (s) => s.category === "recommendation"
                      );
                      return stats?.trend ? (
                        <div className="space-y-4">
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={stats.trend}>
                                <defs>
                                  <linearGradient
                                    id="recommendationGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="5%"
                                      stopColor="#f97316"
                                      stopOpacity={0.3}
                                    />
                                    <stop
                                      offset="95%"
                                      stopColor="#f97316"
                                      stopOpacity={0}
                                    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#e5e7eb"
                                />
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 12, fill: "#6b7280" }}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis
                                  domain={[0, 100]}
                                  tick={{ fontSize: 12, fill: "#6b7280" }}
                                  tickLine={false}
                                  axisLine={false}
                                  tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    boxShadow:
                                      "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                  }}
                                  formatter={(
                                    value: number,
                                    name: string,
                                    props: any
                                  ) => [
                                    `${Math.round(value)}% (${
                                      props.payload.count
                                    }명 응답)`,
                                    "추천의사 점수",
                                  ]}
                                  labelStyle={{ color: "#374151" }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#f97316"
                                  strokeWidth={2}
                                  fill="url(#recommendationGradient)"
                                  dot={{
                                    fill: "#f97316",
                                    stroke: "white",
                                    strokeWidth: 2,
                                    r: 4,
                                  }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="text-sm text-gray-600">
                              평균:{" "}
                              <span className="font-medium text-orange-600">
                                {stats.average?.toFixed(1)}점
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <EmptyState
                          icon={TrendingUp}
                          title="아직 데이터가 없습니다"
                          description="데이터가 충분히 수집되지 않아 차트를 표시할 수 없습니다."
                          action={
                            <Link
                              href="/dashboard/surveys"
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                            >
                              <BarChart className="h-4 w-4 mr-2" />
                              설문 관리하기
                            </Link>
                          }
                          variant="chart"
                        />
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 전체 현황 및 시각화 지표 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">전체 현황</h2>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 응답 트렌드 차트 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <BarChart className="h-4 w-4 text-green-600" />
                    </div>
                    응답 트렌드
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">일별 응답 수</p>
                </div>
                {dashboardStats.unreadCount > 0 && (
                  <span className="ml-2 px-3 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold">
                    NEW {dashboardStats.unreadCount}
                  </span>
                )}
              </div>
              <div className="p-6">
                {responseTrendData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={responseTrendData}>
                          <defs>
                            <linearGradient
                              id="responseGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, "dataMax"]}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            formatter={(value: number) => [
                              `${value}명`,
                              "응답 수",
                            ]}
                            labelStyle={{ color: "#374151" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#responseGradient)"
                            dot={{
                              fill: "#10b981",
                              stroke: "white",
                              strokeWidth: 2,
                              r: 4,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">
                        최근 응답:{" "}
                        <span className="font-medium text-green-600">
                          {latestResponseEntry.count}명
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        총{" "}
                        {responseTrendData.reduce((sum, d) => sum + d.count, 0)}
                        명 응답
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={BarChart}
                    title="아직 데이터가 없습니다"
                    description="데이터가 충분히 수집되지 않아 차트를 표시할 수 없습니다."
                    action={
                      <Link
                        href="/dashboard/surveys"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                      >
                        <BarChart className="h-4 w-4 mr-2" />
                        설문 관리하기
                      </Link>
                    }
                    variant="chart"
                  />
                )}
              </div>
            </div>

            {/* 별점 분포 차트 */}
            {enabledQuestions.find(
              (q) => q.category === "overall_satisfaction"
            ) && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                      <Star className="h-4 w-4 text-yellow-600" />
                    </div>
                    별점 분포
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    전반적 만족도 평점별 응답 비율
                  </p>
                </div>
                <div className="p-6">
                  {ratingDistribution.length > 0 ? (
                    <div className="space-y-4">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={ratingDistribution}
                            layout="vertical"
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e5e7eb"
                            />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{ fontSize: 12, fill: "#6b7280" }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <YAxis
                              type="category"
                              dataKey="rating"
                              tick={{ fontSize: 12, fill: "#6b7280" }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `${value}점`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                              }}
                              formatter={(
                                value: number,
                                name: string,
                                props: any
                              ) => [
                                `${props.payload.count}명 (${value}%)`,
                                `${props.payload.rating}점`,
                              ]}
                              labelStyle={{ color: "#374151" }}
                            />
                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                              {ratingDistribution.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={`hsl(${45 + entry.rating * 10}, 70%, ${
                                    60 - index * 5
                                  }%)`}
                                />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">
                          평균 평점:{" "}
                          <span className="font-medium text-yellow-600">
                            {dashboardStats.avgRating.toFixed(1)}점
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          총{" "}
                          {ratingDistribution.reduce(
                            (sum, r) => sum + r.count,
                            0
                          )}
                          명 응답
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Star}
                      title="아직 데이터가 없습니다"
                      description="데이터가 충분히 수집되지 않아 차트를 표시할 수 없습니다."
                      action={
                        <Link
                          href="/dashboard/surveys"
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                        >
                          <BarChart className="h-4 w-4 mr-2" />
                          설문 관리하기
                        </Link>
                      }
                      variant="chart"
                    />
                  )}
                </div>
              </div>
            )}

            {/* 방문빈도 분포 */}
            {enabledQuestions.find((q) => q.category === "visit_frequency") && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    방문빈도 분포
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">고객 방문 패턴</p>
                </div>
                <div className="p-6">
                  {(() => {
                    const stats = displayStats.find(
                      (s) => s.category === "visit_frequency"
                    );
                    if (!stats?.distribution)
                      return (
                        <EmptyState
                          icon={Users}
                          title="데이터 없음"
                          description="방문빈도 데이터가 수집되지 않았습니다."
                          variant="card"
                        />
                      );

                    const total = Object.values(stats.distribution).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const sortedEntries = Object.entries(
                      stats.distribution
                    ).sort(([, a], [, b]) => b - a);

                    return (
                      <div className="space-y-3">
                        {sortedEntries.slice(0, 5).map(([option, count]) => {
                          const percentage = Math.round((count / total) * 100);
                          return (
                            <div
                              key={option}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2 flex-1">
                                <span className="text-xs font-medium text-gray-700 min-w-[70px] truncate">
                                  {option}
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-right min-w-[50px]">
                                <span className="text-xs font-bold text-gray-900">
                                  {count}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({percentage}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="bg-purple-50 rounded-lg p-3 mt-4">
                          <div className="text-xs text-gray-600">
                            총 {total}명
                            {sortedEntries.length > 0 && (
                              <>
                                {" "}
                                • 최다: {sortedEntries[0][0]} (
                                {sortedEntries[0][1]}명)
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 세부 평가 지표들 */}
        {enabledQuestions.filter(
          (q) =>
            ![
              "overall_satisfaction",
              "revisit_intention",
              "recommendation",
              "visit_frequency",
            ].includes(q.category)
        ).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              세부 평가 지표
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {enabledQuestions
                .filter(
                  (q) =>
                    ![
                      "overall_satisfaction",
                      "revisit_intention",
                      "recommendation",
                      "visit_frequency",
                    ].includes(q.category)
                )
                .map((question) => {
                  const stats = displayStats.find(
                    (s) => s.category === question.category
                  );

                  return (
                    <div
                      key={question.id}
                      className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Star className="h-3 w-3 text-white" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {getCategoryDisplayName(question.category)}
                        </h3>
                      </div>

                      {stats?.average !== undefined ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.average.toFixed(1)}
                            </p>
                            <span className="text-sm text-gray-500">/ 5.0</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= Math.round(stats.average!)
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-2">
                              ({Math.round(stats.average * 20)}%)
                            </span>
                          </div>
                          <div className="text-xs">
                            {stats.average >= 4.5 ? (
                              <span className="text-green-600 font-medium">
                                매우 우수
                              </span>
                            ) : stats.average >= 4.0 ? (
                              <span className="text-blue-600 font-medium">
                                우수
                              </span>
                            ) : stats.average >= 3.5 ? (
                              <span className="text-yellow-600 font-medium">
                                양호
                              </span>
                            ) : stats.average >= 3.0 ? (
                              <span className="text-orange-600 font-medium">
                                보통
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">
                                개선 필요
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Star className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">데이터 없음</p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* AI 분석 결과 */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    AI 분석 결과
                  </h3>
                  {latestAIStats && (
                    <span className="text-xs text-gray-500">
                      {new Date(latestAIStats.analysis_date).toLocaleDateString(
                        "ko-KR"
                      )}{" "}
                      분석
                    </span>
                  )}
                </div>
              </div>
              {latestAIStats && activeSurvey && (
                <Link
                  href={`/dashboard/surveys/${activeSurvey.id}/responses`}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  자세히 보기
                </Link>
              )}
            </div>
          </div>

          {latestAIStats ? (
            <div className="p-6 space-y-4">
              {/* 분석 요약 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {latestAIStats.summary}
                </p>
              </div>

              {/* 장점과 단점 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 장점 */}
                {latestAIStats.top_pros &&
                  latestAIStats.top_pros.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <h4 className="flex items-center text-sm font-medium text-green-800 mb-3">
                        <div className="w-5 h-5 bg-green-500 rounded-lg flex items-center justify-center mr-2">
                          <ThumbsUp className="h-3 w-3 text-white" />
                        </div>
                        강점
                      </h4>
                      <ul className="space-y-2">
                        {latestAIStats.top_pros
                          .slice(0, 2)
                          .map((pro, index) => (
                            <li
                              key={index}
                              className="text-xs text-green-700 flex items-start"
                            >
                              <span className="text-green-500 mr-2 font-bold">
                                •
                              </span>
                              <span>{pro}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                {/* 단점 */}
                {latestAIStats.top_cons &&
                  latestAIStats.top_cons.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                      <h4 className="flex items-center text-sm font-medium text-orange-800 mb-3">
                        <div className="w-5 h-5 bg-orange-500 rounded-lg flex items-center justify-center mr-2">
                          <AlertTriangle className="h-3 w-3 text-white" />
                        </div>
                        개선점
                      </h4>
                      <ul className="space-y-2">
                        {latestAIStats.top_cons
                          .slice(0, 2)
                          .map((con, index) => (
                            <li
                              key={index}
                              className="text-xs text-orange-700 flex items-start"
                            >
                              <span className="text-orange-500 mr-2 font-bold">
                                •
                              </span>
                              <span>{con}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Bot}
              title="AI 분석 결과가 없습니다"
              description="충분한 응답 데이터가 수집되면 AI가 자동으로 분석해드립니다."
              action={
                activeSurvey && (
                  <Link
                    href={`/dashboard/surveys/${activeSurvey.id}/responses`}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    분석하기
                  </Link>
                )
              }
              variant="default"
            />
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/surveys"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <BarChart size={16} className="mr-2" />
              설문 관리하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
