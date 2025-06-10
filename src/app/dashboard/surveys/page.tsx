"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import {
  Plus,
  Edit3,
  Eye,
  ExternalLink,
  BarChart3,
  Trash2,
  Copy,
  AlertTriangle,
  Activity,
  Power,
} from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
}

export default function SurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError?.message);
        router.push("/auth");
        return;
      }

      console.log("Fetching surveys for user:", session.user.id);

      const { data: surveysData, error: surveysError } = await supabase
        .from("surveys")
        .select("id, title, description, created_at, is_active")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      console.log("Surveys query result:", { surveysData, surveysError });

      if (surveysError) {
        console.error("Error fetching surveys:", surveysError);
        setError("설문 목록을 불러오는 데 실패했습니다.");
        return;
      }

      console.log("Found surveys:", surveysData);
      setSurveys(surveysData || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Unexpected error:", error);
      setError("예상치 못한 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const toggleSurveyActive = async (
    surveyId: string,
    currentActive: boolean
  ) => {
    try {
      setToggleLoading(surveyId);

      // 활성화하려는 경우, 기존 활성 설문을 비활성화
      if (!currentActive) {
        const { error: deactivateError } = await supabase
          .from("surveys")
          .update({ is_active: false })
          .neq("id", surveyId);

        if (deactivateError) {
          throw new Error("기존 활성 설문 비활성화 중 오류가 발생했습니다.");
        }
      }

      // 현재 설문 상태 변경
      const { error: updateError } = await supabase
        .from("surveys")
        .update({ is_active: !currentActive })
        .eq("id", surveyId);

      if (updateError) {
        throw new Error("설문 상태 변경 중 오류가 발생했습니다.");
      }

      // 로컬 상태 업데이트
      const updatedSurveys = surveys.map((survey) => ({
        ...survey,
        is_active: survey.id === surveyId ? !currentActive : false,
      }));
      setSurveys(updatedSurveys);
      alert(
        currentActive
          ? "설문이 비활성화되었습니다."
          : "설문이 활성화되었습니다."
      );
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Toggle error:", error);
      alert(error.message || "설문 상태 변경 중 오류가 발생했습니다.");
    } finally {
      setToggleLoading(null);
    }
  };

  const deleteSurvey = async (surveyId: string) => {
    if (
      !confirm(
        "정말로 이 설문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    try {
      setDeleteLoading(surveyId);

      // Delete related AI statistics first
      const { error: aiStatsError } = await supabase
        .from("ai_statistics")
        .delete()
        .eq("survey_id", surveyId);

      if (aiStatsError) {
        console.error("Error deleting AI statistics:", aiStatsError);
      }

      // Delete related customer_info
      const { error: customerInfoError } = await supabase
        .from("customer_info")
        .delete()
        .eq("survey_id", surveyId);

      if (customerInfoError) {
        console.error("Error deleting customer info:", customerInfoError);
      }

      // Delete related responses
      const { error: responsesError } = await supabase
        .from("responses")
        .delete()
        .eq("survey_id", surveyId);

      if (responsesError) {
        console.error("Error deleting responses:", responsesError);
        throw new Error("응답 데이터 삭제 중 오류가 발생했습니다.");
      }

      // Delete related questions
      const { error: questionsError } = await supabase
        .from("questions")
        .delete()
        .eq("survey_id", surveyId);

      if (questionsError) {
        console.error("Error deleting questions:", questionsError);
        throw new Error("질문 데이터 삭제 중 오류가 발생했습니다.");
      }

      // Delete the survey
      const { error: surveyError } = await supabase
        .from("surveys")
        .delete()
        .eq("id", surveyId);

      if (surveyError) {
        console.error("Error deleting survey:", surveyError);
        throw new Error("설문 삭제 중 오류가 발생했습니다.");
      }

      // Refresh the list
      const updatedSurveys = surveys.filter((survey) => survey.id !== surveyId);
      setSurveys(updatedSurveys);
      alert("설문이 성공적으로 삭제되었습니다.");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Delete error:", error);
      alert(error.message || "설문 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("링크가 클립보드에 복사되었습니다!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchSurveys();

    // 외부 클릭시 드롭다운 닫기
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchSurveys]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon={({ className }) => (
            <div
              className={`rounded-full border-b-2 border-blue-600 animate-spin ${className}`}
            />
          )}
          title="설문 목록을 불러오는 중..."
          description="잠시만 기다려 주세요."
          variant="default"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              설문 관리
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              생성된 설문들을 관리하고 분석하세요
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Activity size={16} className="mr-2" />
              대시보드
            </Link>
            <Link
              href="/dashboard/surveys/new"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus size={18} className="mr-2" />새 설문 만들기
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-xl flex items-start space-x-2">
            <AlertTriangle
              size={16}
              className="text-red-500 mt-0.5 flex-shrink-0"
            />
            <span className="text-sm">
              <strong className="font-semibold">오류:</strong> {error}
            </span>
          </div>
        )}

        {/* Active Survey Notice */}
        {surveys.some((s) => s.is_active) && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <Power className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-green-800">활성 설문</h3>
            </div>
            <p className="text-sm text-green-700 mt-1">
              현재 <strong>{surveys.find((s) => s.is_active)?.title}</strong>
              이(가) 활성 상태입니다. 고객이 볼 수 있는 설문은 하나뿐입니다.
            </p>
          </div>
        )}

        {/* Surveys List */}
        {surveys.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
            <EmptyState
              icon={BarChart3}
              title="첫 설문을 만들어보세요!"
              description="아직 생성된 설문이 없습니다. 새 설문을 만들어 고객 피드백 수집을 시작하세요."
              variant="default"
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                설문 목록 ({surveys.length}개)
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${
                    survey.is_active
                      ? "bg-green-50 border-l-4 border-green-500"
                      : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                          {survey.title}
                        </h3>
                        {survey.is_active && (
                          <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full font-medium">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 leading-relaxed line-clamp-2">
                        {survey.description || "설명 없음"}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>
                          생성일:{" "}
                          {new Date(survey.created_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 액션 버튼 영역 */}
                    <div className="flex flex-col space-y-3 sm:ml-6">
                      {/* 활성화 토글 */}
                      <div className="flex items-center justify-between sm:justify-start space-x-3">
                        <span className="text-sm text-gray-600">활성 상태</span>
                        <button
                          onClick={() =>
                            toggleSurveyActive(survey.id, survey.is_active)
                          }
                          disabled={toggleLoading === survey.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            survey.is_active ? "bg-green-600" : "bg-gray-300"
                          } ${
                            toggleLoading === survey.id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              survey.is_active
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 주요 액션 버튼 */}
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/surveys/${survey.id}/responses`}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-w-0"
                        >
                          <BarChart3 size={14} className="mr-1 flex-shrink-0" />
                          <span className="truncate">응답분석</span>
                        </Link>

                        <Link
                          href={`/dashboard/surveys/${survey.id}/edit`}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-w-0"
                        >
                          <Edit3 size={14} className="mr-1 flex-shrink-0" />
                          <span className="truncate">수정</span>
                        </Link>

                        {/* 더보기 드롭다운 */}
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => {
                              setOpenDropdown(
                                openDropdown === survey.id ? null : survey.id
                              );
                            }}
                            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <span className="text-lg">⋯</span>
                          </button>

                          {openDropdown === survey.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <Link
                                  href={`/view/survey/${survey.id}`}
                                  target="_blank"
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  <Eye size={14} className="mr-3" />
                                  미리보기
                                </Link>
                                <button
                                  onClick={() => {
                                    copyToClipboard(
                                      `${window.location.origin}/view/survey/${survey.id}`
                                    );
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Copy size={14} className="mr-3" />
                                  링크 복사
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => {
                                    deleteSurvey(survey.id);
                                    setOpenDropdown(null);
                                  }}
                                  disabled={deleteLoading === survey.id}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deleteLoading === survey.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-red-700 mr-3"></div>
                                  ) : (
                                    <Trash2 size={14} className="mr-3" />
                                  )}
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 미리보기 모달 */}
      {previewSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  설문 미리보기
                </h3>
                <button
                  onClick={() => setPreviewSurvey(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <h4 className="font-medium text-gray-900 mb-2">
                {previewSurvey.title}
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                {previewSurvey.description || "설명 없음"}
              </p>
              <div className="text-xs text-gray-500 space-y-1 mb-6">
                <p>
                  생성일:{" "}
                  {new Date(previewSurvey.created_at).toLocaleDateString(
                    "ko-KR"
                  )}
                </p>
                <p>설문 ID: {previewSurvey.id}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/surveys/${previewSurvey.id}/responses`}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setPreviewSurvey(null)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  응답 보기
                </Link>
                <Link
                  href={`/view/survey/${previewSurvey.id}`}
                  target="_blank"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setPreviewSurvey(null)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  실제 테스트
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
