"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Users,
  Calendar,
  FileText,
  Star,
  BarChart3,
  Search,
  Eye,
  User,
  AlertTriangle,
  Loader2,
  Copy,
  Bot,
  Sparkles,
  TrendingUp,
  History,
  ChevronRight,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from "lucide-react";

interface CustomerInfo {
  id: string;
  name: string;
  age_group: string;
  gender: string;
  phone?: string;
  email?: string;
  created_at: string;
}

interface Response {
  id: string;
  question_id: string;
  response_text?: string;
  selected_option?: string;
  selected_options?: string[];
  rating?: number;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options?: Record<string, unknown>;
  order_num: number;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

interface ResponseData {
  customer_info: CustomerInfo;
  responses: Response[];
  user_id: string;
}

interface AIStatistic {
  id: string;
  summary: string;
  statistics: Record<string, unknown>;
  recommendations: string;
  analysis_date: string;
  total_responses: number;
  average_rating?: number;
  main_customer_age_group?: string;
  main_customer_gender?: string;
  top_pros?: string[];
  top_cons?: string[];
}

export default function SurveyResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responsesData, setResponsesData] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // AI 분석 관련 state
  const [aiStatistics, setAiStatistics] = useState<AIStatistic[]>([]);
  const [latestAiAnalysis, setLatestAiAnalysis] = useState<AIStatistic | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);

  useEffect(() => {
    fetchSurveyData();
    fetchAIStatistics();
  }, [surveyId, fetchSurveyData, fetchAIStatistics]);

  const fetchSurveyData = useCallback(async () => {
    try {
      setLoading(true);

      // 세션 확인
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        router.push("/auth");
        return;
      }

      const userId = sessionData.session.user.id;

      // 1. 설문 정보 조회 (소유자 확인)
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("id, title, description, created_at")
        .eq("id", surveyId)
        .eq("user_id", userId)
        .single();

      if (surveyError || !surveyData) {
        throw new Error("설문을 찾을 수 없거나 접근 권한이 없습니다.");
      }

      setSurvey(surveyData);

      // 2. 질문 목록 조회
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("id, question_text, question_type, options, order_num")
        .eq("survey_id", surveyId)
        .order("order_num", { ascending: true });

      if (questionsError) {
        throw new Error("질문 목록을 불러오는데 실패했습니다.");
      }

      setQuestions(questionsData || []);

      // 3. 고객 정보 조회
      const { data: customerInfoData, error: customerError } = await supabase
        .from("customer_info")
        .select("*")
        .eq("survey_id", surveyId);

      if (customerError) {
        throw new Error("고객 정보를 불러오는데 실패했습니다.");
      }

      // 4. 모든 응답 조회
      const { data: responsesData, error: responsesError } = await supabase
        .from("responses")
        .select("*, customer_info_id")
        .eq("survey_id", surveyId);

      if (responsesError) {
        throw new Error("응답 데이터를 불러오는데 실패했습니다.");
      }

      // 5. 데이터 조합
      const combinedData: ResponseData[] = (customerInfoData || []).map(
        (customer) => {
          const userResponses = (responsesData || []).filter(
            (response) => response.customer_info_id === customer.id
          );

          return {
            customer_info: customer,
            responses: userResponses,
            user_id: customer.user_id,
          };
        }
      );

      // 응답이 있는 customer_info만 필터링
      const filteredData = combinedData.filter(
        (item) => item.responses.length > 0
      );

      setResponsesData(filteredData);

      // 6. 통계 계산
      calculateStats(filteredData, questionsData || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error fetching survey data:", error);
      setError(error.message || "데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  const fetchAIStatistics = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/ai-statistics`);

      if (response.ok) {
        const data = await response.json();
        setAiStatistics(data.statistics);
        if (data.statistics.length > 0) {
          setLatestAiAnalysis(data.statistics[0]);
        }
      }
    } catch (error: unknown) {
      console.error("AI 통계 조회 오류:", error);
    }
  }, [surveyId]);

  const generateAIAnalysis = async () => {
    if (responsesData.length === 0) {
      alert("분석할 응답 데이터가 없습니다.");
      return;
    }

    if (isAnalyzing) {
      return; // 이미 분석 중인 경우 중단
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/ai-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Gemini 분석 결과를 바로 상태에 반영
        if (result.analysis) {
          const geminiAnalysis = {
            id: Date.now().toString(),
            summary: result.analysis.summary,
            statistics: result.analysis.statistics,
            recommendations: result.analysis.recommendations,
            analysis_date: new Date().toISOString(),
            total_responses: result.totalResponses,
            average_rating: result.keyStats.averageRating,
            main_customer_age_group: result.keyStats.mainCustomerAgeGroup,
            main_customer_gender: result.keyStats.mainCustomerGender,
            top_pros: result.analysis.topPros,
            top_cons: result.analysis.topCons,
          };
          setLatestAiAnalysis(geminiAnalysis);
          setAiStatistics([geminiAnalysis]);
        }
        // AI 통계를 새로 가져와서 상태 업데이트
        await fetchAIStatistics();
        // 전체 데이터도 다시 가져와서 최신 상태 반영
        await fetchSurveyData();
        alert("AI 분석이 완료되었습니다!");
      } else {
        const errorData = await response.json();
        alert(`AI 분석 실패: ${errorData.error}`);
      }
    } catch (error: unknown) {
      console.error("AI 분석 오류:", error);
      alert("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateStats = (data: ResponseData[], questions: Question[]) => {
    const ageGroups: Record<string, number> = {};
    const genders: Record<string, number> = {};
    const averageRatings: Record<string, number> = {};

    // 연령대별, 성별 통계
    data.forEach((item) => {
      const { age_group, gender } = item.customer_info;
      ageGroups[age_group] = (ageGroups[age_group] || 0) + 1;
      genders[gender] = (genders[gender] || 0) + 1;
    });

    // 평점 질문별 평균 계산
    questions.forEach((question) => {
      if (question.question_type === "rating") {
        const ratings = data
          .flatMap((item) => item.responses)
          .filter(
            (response) =>
              response.question_id === question.id && response.rating
          )
          .map((response) => response.rating!);

        if (ratings.length > 0) {
          averageRatings[question.id] =
            ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        }
      }
    });

    // 통계 상태 업데이트는 생략
  };

  const formatResponse = (response: Response, question: Question) => {
    // 주관식 응답
    if (response.response_text && response.response_text.trim()) {
      return response.response_text.trim();
    }

    // 평점 응답
    if (response.rating !== null && response.rating !== undefined) {
      return `${response.rating}점`;
    }

    // 다중선택 응답 처리
    if (response.selected_options && Array.isArray(response.selected_options)) {
      if (
        question.options &&
        question.options.choices_text &&
        Array.isArray(question.options.choices_text)
      ) {
        const formattedOptions = response.selected_options.map((option) => {
          const match = option.match(/^choice_(\d+)$/);
          if (match) {
            const index = parseInt(match[1]) - 1;
            if (question.options.choices_text[index]) {
              return question.options.choices_text[index];
            }
          }
          return option;
        });
        return formattedOptions.join(", ");
      }
      return response.selected_options.join(", ");
    }

    // 단일선택 응답 처리
    if (response.selected_option && response.selected_option.trim()) {
      if (
        question.options &&
        question.options.choices_text &&
        Array.isArray(question.options.choices_text)
      ) {
        const match = response.selected_option.match(/^choice_(\d+)$/);
        if (match) {
          const index = parseInt(match[1]) - 1;
          if (question.options.choices_text[index]) {
            return question.options.choices_text[index];
          }
        }
      }
      return response.selected_option;
    }

    return "응답 없음";
  };

  // 필터링된 응답 데이터
  const filteredResponsesData = responsesData.filter((item) => {
    // 시간대별 필터링
    const responseTime = new Date(item.responses[0]?.created_at || "");
    const hour = responseTime.getHours();
    let matchesTimeSlot = true;

    if (selectedTimeSlot) {
      switch (selectedTimeSlot) {
        case "morning":
          matchesTimeSlot = hour >= 6 && hour < 12;
          break;
        case "lunch":
          matchesTimeSlot = hour >= 12 && hour < 14;
          break;
        case "afternoon":
          matchesTimeSlot = hour >= 14 && hour < 18;
          break;
        case "evening":
          matchesTimeSlot = hour >= 18 && hour < 22;
          break;
        case "night":
          matchesTimeSlot = hour >= 22 || hour < 6;
          break;
        default:
          matchesTimeSlot = true;
      }
    }

    const matchesAgeGroup =
      !selectedAgeGroup || item.customer_info.age_group === selectedAgeGroup;
    const matchesGender =
      !selectedGender || item.customer_info.gender === selectedGender;

    return matchesTimeSlot && matchesAgeGroup && matchesGender;
  });

  // 유니크한 연령대와 성별 목록
  const uniqueAgeGroups = Array.from(
    new Set(responsesData.map((item) => item.customer_info.age_group))
  ).sort();
  const uniqueGenders = Array.from(
    new Set(responsesData.map((item) => item.customer_info.gender))
  ).sort();

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredResponsesData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = filteredResponsesData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  // 필터 변경 시 페이지 리셋
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    if (filterType === "timeSlot") {
      setSelectedTimeSlot(value);
    } else if (filterType === "ageGroup") {
      setSelectedAgeGroup(value);
    } else if (filterType === "gender") {
      setSelectedGender(value);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="text-gray-600">응답 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">오류 발생</h3>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard/surveys"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            설문 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            설문을 찾을 수 없습니다
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            요청하신 설문이 존재하지 않거나 접근 권한이 없습니다.
          </p>
          <Link
            href="/dashboard/surveys"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            설문 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/dashboard/surveys"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
          >
            <ArrowLeft
              size={20}
              className="mr-2 group-hover:-translate-x-1 transition-transform"
            />
            설문 목록으로 돌아가기
          </Link>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  {survey.title}
                </h1>
                {survey.description && (
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {survey.description}
                  </p>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  생성일:{" "}
                  {new Date(survey.created_at).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/dashboard/surveys/${surveyId}/edit`}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  수정
                </Link>
                <Link
                  href={`/view/survey/${surveyId}`}
                  target="_blank"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  미리보기
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* AI 분석 섹션 */}
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-200 p-6 mb-6">
          <div className="flex flex-col space-y-4 lg:space-y-0 mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  AI 통계 분석
                </h2>
                <p className="text-gray-600">
                  설문 응답을 AI가 분석한 상세 결과
                </p>
              </div>
            </div>
            {/* AI 분석 중 상태 */}
            {isAnalyzing ? (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-purple-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  분석중
                </h3>
                <p className="text-gray-600">
                  AI가 응답 데이터를 분석하고 있습니다...
                </p>
              </div>
            ) : latestAiAnalysis ? (
              <div className="flex space-x-3">
                {aiStatistics.length > 0 && (
                  <button
                    onClick={() => setShowAnalysisHistory(true)}
                    className="flex items-center px-4 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-white transition-colors"
                  >
                    <History className="h-4 w-4 mr-2" />
                    분석 이력
                  </button>
                )}
                <button
                  onClick={generateAIAnalysis}
                  disabled={isAnalyzing || responsesData.length === 0}
                  className={`flex items-center px-6 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                    isAnalyzing || responsesData.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  } text-white`}
                >
                  <Sparkles className="h-4 w-4 mr-2" />새 AI 분석 생성
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI 분석 결과가 없습니다
                </h3>
                <p className="text-gray-600 mb-6">
                  응답 데이터를 AI가 분석하여 인사이트를 제공합니다.
                </p>
                <button
                  onClick={generateAIAnalysis}
                  disabled={isAnalyzing || responsesData.length === 0}
                  className={`px-6 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                    isAnalyzing || responsesData.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  } text-white`}
                >
                  <Sparkles className="h-4 w-4 mr-2 inline" />첫 번째 AI 분석
                  시작하기
                </button>
              </div>
            )}
          </div>

          {latestAiAnalysis ? (
            <div className="space-y-6">
              {/* 핵심 지표 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* NPS 카드 */}
                <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-700">
                        NPS
                      </h4>
                    </div>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      <div className="absolute bottom-6 right-0 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        순추천지수(Net Promoter Score): 고객이 다른 사람에게
                        추천할 의향을 나타내는 지표 (-100~100)
                      </div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mb-1">
                    {latestAiAnalysis.statistics?.nps || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(latestAiAnalysis.statistics?.nps || 0) > 50
                      ? "우수"
                      : (latestAiAnalysis.statistics?.nps || 0) > 0
                      ? "보통"
                      : "개선필요"}
                  </p>
                </div>

                {/* CSAT 카드 */}
                <div className="bg-white rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-green-600" />
                      <h4 className="text-sm font-semibold text-gray-700">
                        CSAT
                      </h4>
                    </div>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      <div className="absolute bottom-6 right-0 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        고객만족도(Customer Satisfaction): 전반적인 만족도를
                        백분율로 표시 (0~100%)
                      </div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mb-1">
                    {latestAiAnalysis.statistics?.csat || 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {(latestAiAnalysis.statistics?.csat || 0) > 80
                      ? "우수"
                      : (latestAiAnalysis.statistics?.csat || 0) > 60
                      ? "보통"
                      : "개선필요"}
                  </p>
                </div>

                {/* 충성도 카드 */}
                <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h4 className="text-sm font-semibold text-gray-700">
                      충성도
                    </h4>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 mb-1">
                    {latestAiAnalysis.statistics?.loyaltyIndex || 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {(latestAiAnalysis.statistics?.loyaltyIndex || 0) > 70
                      ? "높음"
                      : (latestAiAnalysis.statistics?.loyaltyIndex || 0) > 50
                      ? "보통"
                      : "낮음"}
                  </p>
                </div>
              </div>

              {/* 기본 통계 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">총 고객수</div>
                  <div className="text-xl font-bold text-gray-900">
                    {latestAiAnalysis.total_responses}명
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">평균 평점</div>
                  <div className="text-xl font-bold text-gray-900">
                    {latestAiAnalysis?.average_rating !== undefined &&
                    latestAiAnalysis?.average_rating !== null
                      ? `${latestAiAnalysis?.average_rating}점`
                      : "0점"}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">주 고객층</div>
                  <div className="text-lg font-bold text-gray-900">
                    {latestAiAnalysis?.main_customer_age_group || "N/A"}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">주 성별</div>
                  <div className="text-lg font-bold text-gray-900">
                    {latestAiAnalysis?.main_customer_gender || "N/A"}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    AI 분석 요약
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-base">
                  {latestAiAnalysis?.summary}
                </p>
              </div>

              {/* 장점과 단점 섹션 */}
              {(latestAiAnalysis?.top_pros &&
                latestAiAnalysis?.top_pros.length > 0) ||
              (latestAiAnalysis?.top_cons &&
                latestAiAnalysis?.top_cons.length > 0) ? (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* 장점 */}
                  {latestAiAnalysis?.top_pros &&
                    latestAiAnalysis?.top_pros.length > 0 && (
                      <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <ThumbsUp className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="text-lg font-bold text-green-800">
                            강점
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {latestAiAnalysis?.top_pros?.map((pro, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-medium text-green-600">
                                  {index + 1}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {pro}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 단점 */}
                  {latestAiAnalysis?.top_cons &&
                    latestAiAnalysis?.top_cons.length > 0 && (
                      <div className="bg-white rounded-xl p-6 border border-orange-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <ThumbsDown className="h-5 w-5 text-orange-600" />
                          </div>
                          <h3 className="text-lg font-bold text-orange-800">
                            약점
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {latestAiAnalysis?.top_cons?.map((con, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-medium text-orange-600">
                                  {index + 1}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {con}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : null}

              {/* AI 개선 방안 */}
              <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    AI 개선 방안
                  </h3>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {latestAiAnalysis?.recommendations}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* 응답 목록 */}
        {responsesData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              아직 응답이 없습니다
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              설문 링크를 공유하여 응답을 수집하세요.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/view/survey/${surveyId}`
                );
                alert("링크가 복사되었습니다!");
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Copy size={16} className="mr-2" />
              설문 링크 복사
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* 검색 및 필터 */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex gap-3 flex-1">
                  <select
                    value={selectedTimeSlot}
                    onChange={(e) =>
                      handleFilterChange("timeSlot", e.target.value)
                    }
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm flex-1"
                  >
                    <option value="">모든 시간대</option>
                    <option value="morning">오전 (06:00-12:00)</option>
                    <option value="lunch">점심 (12:00-14:00)</option>
                    <option value="afternoon">오후 (14:00-18:00)</option>
                    <option value="evening">저녁 (18:00-22:00)</option>
                    <option value="night">밤 (22:00-06:00)</option>
                  </select>
                  <select
                    value={selectedAgeGroup}
                    onChange={(e) =>
                      handleFilterChange("ageGroup", e.target.value)
                    }
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm flex-1"
                  >
                    <option value="">모든 연령대</option>
                    {uniqueAgeGroups.map((ageGroup) => (
                      <option key={ageGroup} value={ageGroup}>
                        {ageGroup}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedGender}
                    onChange={(e) =>
                      handleFilterChange("gender", e.target.value)
                    }
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm flex-1"
                  >
                    <option value="">모든 성별</option>
                    {uniqueGenders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </div>
                {(selectedTimeSlot || selectedAgeGroup || selectedGender) && (
                  <button
                    onClick={() => {
                      setSelectedTimeSlot("");
                      setSelectedAgeGroup("");
                      setSelectedGender("");
                      setCurrentPage(1);
                    }}
                    className="px-4 py-3 text-sm text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-gray-900">응답 목록</h2>
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {selectedTimeSlot || selectedAgeGroup || selectedGender
                      ? `${filteredResponsesData.length}개 / 전체 ${responsesData.length}개`
                      : `${responsesData.length}개`}
                  </div>
                </div>
                {filteredResponsesData.length > 0 && (
                  <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                    {startIndex + 1}-
                    {Math.min(endIndex, filteredResponsesData.length)} 표시
                  </div>
                )}
              </div>
            </div>

            {filteredResponsesData.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  검색 조건을 변경하거나 필터를 초기화해보세요.
                </p>
                <button
                  onClick={() => {
                    setSelectedTimeSlot("");
                    setSelectedAgeGroup("");
                    setSelectedGender("");
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <>
                {/* 응답 목록 - 그리드 형태 */}
                <div className="p-6">
                  <div className="grid gap-6">
                    {currentPageData.map((responseData) => (
                      <div
                        key={responseData.customer_info.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
                      >
                        {/* 응답자 정보 헤더 */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {responseData.customer_info.name}
                              </h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <span>
                                  {responseData.customer_info.age_group}
                                </span>
                                <span>•</span>
                                <span>{responseData.customer_info.gender}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(
                              responseData.responses[0]?.created_at || ""
                            ).toLocaleDateString("ko-KR")}
                          </div>
                        </div>

                        {/* 질문과 응답 - PC에서는 2-3열 그리드 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {questions.map((question) => {
                            const response = responseData.responses.find(
                              (r) => r.question_id === question.id
                            );

                            return (
                              <div
                                key={question.id}
                                className="bg-gray-50 rounded-lg p-4"
                              >
                                <h4 className="text-sm font-medium text-gray-900 mb-3 leading-tight">
                                  Q{question.order_num}.{" "}
                                  {question.question_text}
                                </h4>

                                {!response ? (
                                  <p className="text-sm text-gray-400 italic">
                                    응답 없음
                                  </p>
                                ) : (
                                  <div>
                                    {question.question_type === "text" && (
                                      <p className="text-sm text-gray-800 bg-white p-3 rounded border-l-2 border-gray-400">
                                        {response.response_text || "응답 없음"}
                                      </p>
                                    )}

                                    {question.question_type ===
                                      "single_choice" && (
                                      <div className="text-sm text-gray-800 bg-white p-3 rounded">
                                        {formatResponse(response, question)}
                                      </div>
                                    )}

                                    {question.question_type ===
                                      "multiple_choice" && (
                                      <div className="text-sm text-gray-800 bg-white p-3 rounded">
                                        {formatResponse(response, question)}
                                      </div>
                                    )}

                                    {question.question_type === "rating" && (
                                      <div className="bg-white p-3 rounded">
                                        <div className="flex items-center space-x-2">
                                          <div className="flex space-x-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                size={16}
                                                className={`${
                                                  star <= (response.rating || 0)
                                                    ? "text-yellow-400 fill-current"
                                                    : "text-gray-300"
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-sm font-medium text-gray-900">
                                            {response.rating}/5
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          이전
                        </button>

                        <div className="flex items-center space-x-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    currentPage === pageNum
                                      ? "bg-blue-600 text-white"
                                      : "border border-gray-300 hover:bg-white"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          다음
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>

                      <div className="text-sm text-gray-500">
                        총 {totalPages}페이지
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* AI 분석 이력 모달 */}
        {showAnalysisHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <History className="h-6 w-6 text-purple-600 mr-2" />
                    AI 분석 이력
                  </h3>
                  <button
                    onClick={() => setShowAnalysisHistory(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {aiStatistics.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">아직 분석 이력이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiStatistics.map((analysis, index) => (
                      <div
                        key={analysis.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              분석 #{aiStatistics.length - index}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                                최신
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(analysis.analysis_date).toLocaleString(
                              "ko-KR"
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">
                              분석 요약
                            </h4>
                            <p className="text-sm text-gray-700">
                              {analysis.summary}
                            </p>
                          </div>

                          <details className="group">
                            <summary className="cursor-pointer font-medium text-gray-900 hover:text-purple-600 transition-colors">
                              개선 방안 보기
                            </summary>
                            <div className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-4 border-l-2 border-purple-200">
                              {analysis.recommendations}
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
