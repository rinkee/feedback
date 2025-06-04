"use client";

import Link from "next/link";
import {
  BarChart,
  MessageSquare,
  Smile,
  ThumbsUp,
  Edit3,
  Eye,
  PlusCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Target,
  Star,
  Calendar,
  Bot,
  Sparkles,
  User,
  CheckCircle,
  Clock,
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
  customer_info: {
    name: string;
    age_group: string;
    gender: string;
  };
  response_text?: string;
  rating?: number;
  created_at: string;
  is_read: boolean;
  questions?: {
    question_text: string;
    question_type: string;
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [latestAIStats, setLatestAIStats] = useState<AIStatistic | null>(null);
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalResponses: 0,
    averageSatisfaction: 0,
    revisitIntention: 0,
    unreadCount: 0,
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

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
          setFetchError("활성 설문을 찾을 수 없습니다.");
        } else {
          setActiveSurvey(activeSurveyData);

          if (activeSurveyData) {
            // 2. 활성 설문의 AI 통계 조회
            const { data: aiStatsData } = await supabase
              .from("ai_statistics")
              .select("*")
              .eq("survey_id", activeSurveyData.id)
              .order("analysis_date", { ascending: false })
              .limit(1);

            if (aiStatsData && aiStatsData.length > 0) {
              setLatestAIStats(aiStatsData[0]);
            }

            // 3. 통계 데이터 계산
            const { data: responsesData } = await supabase
              .from("responses")
              .select(
                `
                *,
                customer_info:customer_info_id (
                  name,
                  age_group,
                  gender
                ),
                questions!question_id (
                  question_text,
                  question_type
                )
              `
              )
              .eq("survey_id", activeSurveyData.id);

            if (responsesData) {
              // 고객별로 그룹화
              const customerResponses = new Map();
              responsesData.forEach((response) => {
                const customerId = response.customer_info_id;
                if (!customerResponses.has(customerId)) {
                  customerResponses.set(customerId, []);
                }
                customerResponses.get(customerId).push(response);
              });

              const totalResponses = customerResponses.size;
              const ratings = responsesData
                .filter((r) => r.rating !== null)
                .map((r) => r.rating);
              const averageRating =
                ratings.length > 0
                  ? ratings.reduce((sum, rating) => sum + rating, 0) /
                    ratings.length
                  : 0;

              // 재방문 의사 계산 (4점 이상 비율)
              const positiveRatings = ratings.filter((r) => r >= 4);
              const revisitIntention =
                ratings.length > 0
                  ? (positiveRatings.length / ratings.length) * 100
                  : 0;

              // 읽지 않은 응답 수
              const unreadCount = responsesData.filter(
                (r) => !r.is_read
              ).length;

              setDashboardStats({
                totalResponses,
                averageSatisfaction: Math.round(averageRating * 10) / 10,
                revisitIntention: Math.round(revisitIntention),
                unreadCount,
              });

              // 4. 최근 응답 5개 조회 (question이 있는 것만 필터링)
              const validResponses = responsesData.filter(
                (r) => r.questions && (r.response_text || r.rating)
              );

              // 고객별로 그룹화하고 최근 응답 하나씩만 선택
              const customerResponseMap = new Map();
              validResponses.forEach((response) => {
                const customerId = response.customer_info_id;
                if (!customerResponseMap.has(customerId)) {
                  customerResponseMap.set(customerId, response);
                } else {
                  // 더 최근의 응답으로 업데이트
                  const existingResponse = customerResponseMap.get(customerId);
                  if (
                    new Date(response.created_at) >
                    new Date(existingResponse.created_at)
                  ) {
                    customerResponseMap.set(customerId, response);
                  }
                }
              });

              // 최근 5명의 고객 응답만 선택
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
        setFetchError("대시보드 데이터를 불러오는 데 실패했습니다.");
      }

      setLoading(false);
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

  const markAsRead = async (responseId: string) => {
    await supabase
      .from("responses")
      .update({ is_read: true })
      .eq("id", responseId);

    // 로컬 상태 업데이트
    setRecentResponses((prev) =>
      prev.map((response) =>
        response.id === responseId ? { ...response, is_read: true } : response
      )
    );

    setDashboardStats((prev) => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  };

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-1">
              실시간 피드백 분석 및 설문 현황
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/surveys"
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <BarChart size={18} className="mr-2" />
              설문 관리
            </Link>
          </div>
        </div>

        {/* 활성 설문 정보 */}
        {activeSurvey ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    현재 실시중인 설문
                  </h2>
                  <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full font-medium">
                    ACTIVE
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {activeSurvey.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {activeSurvey.description}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 lg:ml-6">
                <Link
                  href={`/dashboard/surveys/${activeSurvey.id}/responses`}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Eye size={16} className="mr-2" />
                  응답 보기
                </Link>
                <Link
                  href={`/view/survey/${activeSurvey.id}`}
                  target="_blank"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye size={16} className="mr-2" />
                  설문 미리보기
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="text-lg font-medium text-yellow-800">
                  활성 설문이 없습니다
                </h3>
                <p className="text-yellow-700 mt-1">
                  설문을 생성하고 활성화하여 고객 피드백을 받아보세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-blue-50">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">총 응답수</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardStats.totalResponses}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-yellow-50">
                <Star size={24} className="text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">평균 만족도</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardStats.averageSatisfaction}/5
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-green-50">
                <ThumbsUp size={24} className="text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">재방문 의사</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardStats.revisitIntention}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-purple-50">
                <MessageSquare size={24} className="text-purple-600" />
              </div>
              {dashboardStats.unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                  NEW
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">
                읽지 않은 응답
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardStats.unreadCount}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI 분석 결과 */}
          {latestAIStats && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        AI 분석 결과
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(
                          latestAIStats.analysis_date
                        ).toLocaleDateString("ko-KR")}{" "}
                        분석
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    최신 분석
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* 분석 요약 */}
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-purple-500">
                  <h4 className="flex items-center font-semibold text-gray-900 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
                    핵심 인사이트
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {latestAIStats.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 주요 장점 */}
                  {latestAIStats.top_pros &&
                    latestAIStats.top_pros.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <h4 className="flex items-center font-semibold text-green-800 mb-3">
                          <ThumbsUp className="h-4 w-4 text-green-600 mr-2" />
                          강점 포인트
                        </h4>
                        <ul className="space-y-2">
                          {latestAIStats.top_pros
                            .slice(0, 3)
                            .map((pro, index) => (
                              <li
                                key={index}
                                className="flex items-start text-sm text-green-800"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="font-medium">{pro}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* 개선점 */}
                  {latestAIStats.top_cons &&
                    latestAIStats.top_cons.length > 0 && (
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <h4 className="flex items-center font-semibold text-orange-800 mb-3">
                          <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                          개선 필요사항
                        </h4>
                        <ul className="space-y-2">
                          {latestAIStats.top_cons
                            .slice(0, 3)
                            .map((con, index) => (
                              <li
                                key={index}
                                className="flex items-start text-sm text-orange-800"
                              >
                                <Clock className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="font-medium">{con}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                </div>

                {/* 전체 분석 보기 버튼 */}
                {activeSurvey && (
                  <div className="pt-4 border-t border-gray-200">
                    <Link
                      href={`/dashboard/surveys/${activeSurvey.id}/responses`}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      상세 AI 분석 및 개선 방안 보기
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 최근 응답 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 text-gray-600 mr-2" />
                  최근 고객 응답
                </h3>
                {activeSurvey && (
                  <Link
                    href={`/dashboard/surveys/${activeSurvey.id}/responses`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    전체 보기
                  </Link>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">고객별 최신 응답</p>
            </div>

            <div className="p-6">
              {recentResponses.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">아직 응답이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentResponses.map((response) => (
                    <div
                      key={response.id}
                      className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {response.customer_info.name}
                              </h4>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {response.customer_info.age_group} •{" "}
                                {response.customer_info.gender}
                              </span>
                              {!response.is_read && (
                                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-2 bg-gray-50 rounded px-2 py-1">
                              📋{" "}
                              {response.questions?.question_text ||
                                "질문 정보 없음"}
                            </p>
                            <div className="text-sm text-gray-800">
                              {response.questions?.question_type === "rating" &&
                              response.rating ? (
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      size={14}
                                      className={`${
                                        star <= response.rating!
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-1 font-semibold text-gray-900">
                                    {response.rating}/5
                                  </span>
                                </div>
                              ) : (
                                <p className="bg-white border rounded-lg px-3 py-2 text-sm">
                                  {response.response_text || "응답 없음"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <span className="text-xs text-gray-500">
                            {new Date(response.created_at).toLocaleDateString(
                              "ko-KR",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                          {!response.is_read && (
                            <button
                              onClick={() => markAsRead(response.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                            >
                              읽음 처리
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
