"use client";

import Link from "next/link";
import {
  BarChart,
  MessageSquare,
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
import { supabase } from "@/lib/supabaseClient";
import { User as AuthUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalCustomers: 0,
    recentCustomerCount: 0,
    avgResponseTime: 0,
    unreadCount: 0,
  });
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [latestAIStats, setLatestAIStats] = useState<AIStatistic | null>(null);
  const [selectedResponseData, setSelectedResponseData] =
    useState<ResponseModalData | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  // 차트 데이터 상태
  const [revisitTrendData, setRevisitTrendData] = useState<RevisitTrendData[]>(
    []
  );
  const [responseTrendData, setResponseTrendData] = useState<
    ResponseTrendData[]
  >([]);
  const [ratingDistribution, setRatingDistribution] = useState<
    RatingDistribution[]
  >([]);

  const router = useRouter();

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
        // 1. 활성 설문 조회
        const { data: activeSurveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("id, title, description, created_at, is_active")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .single();

        if (surveyError) {
          console.error("Error fetching active survey:", surveyError);
        } else {
          setActiveSurvey(activeSurveyData);

          if (activeSurveyData) {
            // 차트 데이터 가져오기
            await fetchChartData(activeSurveyData.id);

            // 통계 데이터 계산 (고객수, 신규고객, 평균 응답시간, NEW)
            // 1) 전체 고객 수
            const { data: allCustomers } = await supabase
              .from("customer_info")
              .select("id, created_at")
              .eq("survey_id", activeSurveyData.id);
            const totalCustomers = allCustomers?.length || 0;

            // 2) 최근 7일 신규 고객 수
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentCustomers = (allCustomers || []).filter(
              (c) => new Date(c.created_at) >= sevenDaysAgo
            );
            const recentCustomerCount = recentCustomers.length;

            // 3) 평균 응답 소요 시간 (고객별로 created_at ~ 마지막 응답 created_at 평균)
            let avgResponseTime = 0;
            if (allCustomers && allCustomers.length > 0) {
              let totalTime = 0;
              let count = 0;
              for (const customer of allCustomers) {
                const { data: customerResponses } = await supabase
                  .from("responses")
                  .select("created_at")
                  .eq("survey_id", activeSurveyData.id)
                  .eq("customer_info_id", customer.id)
                  .order("created_at", { ascending: true });
                if (customerResponses && customerResponses.length > 0) {
                  const start = new Date(customer.created_at).getTime();
                  const end = new Date(
                    customerResponses[customerResponses.length - 1].created_at
                  ).getTime();
                  if (end > start) {
                    totalTime += (end - start) / 1000; // 초 단위
                    count++;
                  }
                }
              }
              avgResponseTime = count > 0 ? Math.round(totalTime / count) : 0;
            }

            // 4) 읽지 않은 응답이 있는 고객 수(NEW)
            const { data: unreadResponses } = await supabase
              .from("responses")
              .select("customer_info_id")
              .eq("survey_id", activeSurveyData.id)
              .eq("is_read", false);
            const unreadCustomerSet = new Set(
              (unreadResponses || []).map((r) => r.customer_info_id)
            );
            const unreadCount = unreadCustomerSet.size;

            setDashboardStats({
              totalCustomers,
              recentCustomerCount,
              avgResponseTime,
              unreadCount,
            });

            // AI 통계/최근응답 등 기존 로직 유지
            const { data: aiStatsData } = await supabase
              .from("ai_statistics")
              .select("*")
              .eq("survey_id", activeSurveyData.id)
              .order("analysis_date", { ascending: false })
              .limit(1);
            if (aiStatsData && aiStatsData.length > 0) {
              setLatestAIStats(aiStatsData[0]);
            }
            const { data: responsesData } = await supabase
              .from("responses")
              .select(
                `*,
                customer_info:customer_info_id (
                  name,
                  age_group,
                  gender
                ),
                questions!question_id (
                  question_text,
                  question_type
                )`
              )
              .eq("survey_id", activeSurveyData.id);
            if (responsesData) {
              // 최근 응답 5개 조회 (기존 로직 유지)
              const validResponses = responsesData.filter(
                (r) => r.questions && (r.response_text || r.rating)
              );
              const customerResponseMap = new Map();
              validResponses.forEach((response) => {
                const customerId = response.customer_info_id;
                if (!customerResponseMap.has(customerId)) {
                  customerResponseMap.set(customerId, response);
                } else {
                  const existingResponse = customerResponseMap.get(customerId);
                  if (
                    new Date(response.created_at) >
                    new Date(existingResponse.created_at)
                  ) {
                    customerResponseMap.set(customerId, response);
                  }
                }
              });
              const recentResponsesData = Array.from(
                customerResponseMap.values()
              )
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .slice(0, 5);
              setRecentResponses(recentResponsesData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    // 차트 데이터 가져오는 함수
    const fetchChartData = async (surveyId: string) => {
      try {
        await Promise.all([
          fetchRevisitTrend(surveyId),
          fetchResponseTrend(surveyId),
          fetchRatingDistribution(surveyId),
        ]);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };

    // 재방문추이 가져오기 (필수질문 revisit_intention 카테고리 응답 기준)
    const fetchRevisitTrend = async (surveyId: string) => {
      try {
        const trendData: RevisitTrendData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0); // 하루의 시작 시각 고정
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          nextDate.setHours(0, 0, 0, 0); // 다음 날 시작 시각

          // 해당 날짜의 재방문의사(revisit_intention) 응답 가져오기
          const { data: revisitResponses } = await supabase
            .from("responses")
            .select("rating")
            .eq("survey_id", surveyId)
            .eq("required_question_category", "revisit_intention")
            .not("rating", "is", null)
            .gte("created_at", date.toISOString())
            .lt("created_at", nextDate.toISOString());

          let percentage = 0;
          const totalCount = revisitResponses?.length || 0;

          if (totalCount > 0) {
            // 4점 이상을 재방문 의사가 있는 것으로 간주
            const positiveCount = revisitResponses!.filter(
              (r) => r.rating >= 4
            ).length;
            percentage = Math.round((positiveCount / totalCount) * 100);
          }

          trendData.push({
            date: date.toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            }),
            percentage,
            count: totalCount,
          });
        }
        setRevisitTrendData(trendData);
      } catch (error) {
        console.error("Error fetching revisit trend:", error);
      }
    };

    // 응답 트렌드 가져오기 (날짜별 전체 응답 수)
    const fetchResponseTrend = async (surveyId: string) => {
      try {
        const trendData: ResponseTrendData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0); // 하루의 시작 시각 고정
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          nextDate.setHours(0, 0, 0, 0); // 다음 날 시작 시각

        // 해당 날짜에 응답한 고객 수 (customer_info_id 기준으로 중복 제거)
        const { data: dayResponses } = await supabase
          .from("responses")
          .select("customer_info_id")
          .eq("survey_id", surveyId)
          .gte("created_at", date.toISOString())
          .lt("created_at", nextDate.toISOString());

        const uniqueCustomers = new Set(
          (dayResponses || []).map((r) => r.customer_info_id)
        );

        trendData.push({
            date: date.toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            }),
          count: uniqueCustomers.size,
        });
        }
        setResponseTrendData(trendData);
      } catch (error) {
        console.error("Error fetching response trend:", error);
      }
    };

    // 별점 분포 가져오기 (overall_satisfaction 필수 질문 응답만)
    const fetchRatingDistribution = async (surveyId: string) => {
      try {
        // overall_satisfaction 카테고리 응답 직접 조회
        const { data: ratingResponses } = await supabase
          .from("responses")
          .select("rating")
          .eq("survey_id", surveyId)
          .eq("required_question_category", "overall_satisfaction")
          .not("rating", "is", null);

        if (!ratingResponses || ratingResponses.length === 0) {
          setRatingDistribution([]);
          return;
        }

        const totalCount = ratingResponses.length;
        const distribution: RatingDistribution[] = [];

        for (let rating = 1; rating <= 5; rating++) {
          const count = ratingResponses.filter(
            (r) => r.rating === rating
          ).length;
          const percentage = Math.round((count / totalCount) * 100);
          distribution.push({ rating, count, percentage });
        }

        setRatingDistribution(distribution);
      } catch (error) {
        console.error("Error fetching rating distribution:", error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
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
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 rounded-2xl p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  활성 설문이 없습니다
                </h3>
                <p className="text-gray-600">
                  설문을 생성하고 활성화하여 고객 피드백을 받아보세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

          {/* 평균 응답시간 카드 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">
                평균 응답시간
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">
                {dashboardStats.avgResponseTime}초
              </p>
              <p className="text-xs text-gray-500">응답 소요 시간</p>
            </div>
          </div>

          {/* NEW(읽지 않은 응답) 카드 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">NEW</h3>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">
                {dashboardStats.unreadCount}
              </p>
              <p className="text-xs text-gray-500">읽지 않은 응답</p>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 재방문의사 트렌드 차트 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                재방문의사 추이
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                재방문 의사 4점 이상 응답 비율
              </p>
            </div>
            <div className="p-6">
              {revisitTrendData.length > 0 ? (
                <div className="space-y-4">
                  {/* 차트 영역 */}
                  <div className="relative h-32">
                    <div className="absolute inset-0 flex items-end justify-between">
                      {revisitTrendData.map((data, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center flex-1"
                        >
                          <div
                            className="w-4 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                            style={{
                              height: `${Math.max(data.percentage, 5)}%`,
                            }}
                          ></div>
                          <span className="text-xs text-gray-500 mt-2 w-12 text-center">
                            {data.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 최신 데이터 표시 */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">
                      최근 데이터:{" "}
                      <span className="font-medium text-blue-600">
                        {revisitTrendData[revisitTrendData.length - 1]
                          ?.percentage || 0}
                        %
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      응답{" "}
                      {revisitTrendData[revisitTrendData.length - 1]?.count ||
                        0}
                      명 기준
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    아직 데이터가 없습니다
                  </p>
                </div>
              )}
            </div>
          </div>

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
                  NEW
                </span>
              )}
            </div>
            <div className="p-6">
              {responseTrendData.length > 0 ? (
                <div className="space-y-4">
                  {/* 차트 영역 */}
                  <div className="relative h-32">
                    <div className="absolute inset-0 flex items-end justify-between">
                      {responseTrendData.map((data, index) => {
                        const maxCount = Math.max(
                          ...responseTrendData.map((d) => d.count)
                        );
                        const height =
                          maxCount > 0 ? (data.count / maxCount) * 100 : 5;
                        return (
                          <div
                            key={index}
                            className="flex flex-col items-center flex-1"
                          >
                            <div
                              className="w-4 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                              style={{ height: `${Math.max(height, 5)}%` }}
                            ></div>
                            <span className="text-xs text-gray-500 mt-2 w-12 text-center">
                              {data.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* 최신 데이터 표시 */}
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">
                      최근 응답:{" "}
                      <span className="font-medium text-green-600">
                        {responseTrendData[responseTrendData.length - 1]
                          ?.count || 0}
                        명
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      총{" "}
                      {responseTrendData.reduce((sum, d) => sum + d.count, 0)}명
                      응답
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    아직 데이터가 없습니다
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 별점 분포 차트 */}
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
                <div className="space-y-3">
                  {ratingDistribution.map((rating) => (
                    <div
                      key={rating.rating}
                      className="flex items-center space-x-3"
                    >
                      <div className="flex items-center space-x-1">
                        <Star
                          size={14}
                          className="text-yellow-400 fill-current"
                        />
                        <span className="text-sm font-medium w-2">
                          {rating.rating}
                        </span>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-300"
                          style={{ width: `${rating.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600 min-w-[3rem] text-right">
                        <span className="font-medium">{rating.count}</span>
                        <span className="text-gray-400">명</span>
                      </div>
                      <div className="text-xs text-gray-500 min-w-[2.5rem] text-right">
                        {rating.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    아직 데이터가 없습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

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
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bot className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm mb-4">
                아직 AI 분석 결과가 없습니다
              </p>
              {activeSurvey && (
                <Link
                  href={`/dashboard/surveys/${activeSurvey.id}/responses`}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  분석하기
                </Link>
              )}
            </div>
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
