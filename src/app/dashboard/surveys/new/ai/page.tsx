"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Edit,
  Save,
  RefreshCw,
} from "lucide-react";
import { User } from "@supabase/supabase-js";

interface GeneratedQuestion {
  question_text: string;
  question_type: "text" | "rating" | "single_choice" | "multiple_choice";
  choices_text?: string[];
  rating_min_label?: string;
  rating_max_label?: string;
}

interface RequiredQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: Record<string, unknown> | null;
  order_num: number;
  is_active: boolean;
  rating_min_label?: string;
  rating_max_label?: string;
}

interface GeneratedSurvey {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}

export default function AISurveyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userInput, setUserInput] = useState(
    "새로 오픈한 가게인데 어떤점들을 개선해야 할지 모르겠어요. 고객들의 의견을 듣고 싶어요."
  );
  const [generatedSurvey, setGeneratedSurvey] =
    useState<GeneratedSurvey | null>(null);
  const [requiredQuestions, setRequiredQuestions] = useState<RequiredQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedSurvey, setEditedSurvey] = useState<GeneratedSurvey | null>(
    null
  );

  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Authentication error:", sessionError?.message);
        router.push("/auth");
        return;
      }

      setUser(session.user);

      // 사용자의 활성화된 필수질문들 조회
      try {
        const { data: userRequiredQuestions, error: requiredQuestionsError } =
          await supabase
            .from("user_required_questions")
            .select(
              `
              required_questions!inner(*)
            `
            )
            .eq("user_id", session.user.id)
            .eq("is_enabled", true)
            .eq("required_questions.is_active", true);

        if (!requiredQuestionsError && userRequiredQuestions) {
          const requiredQuestionsData = (userRequiredQuestions as { required_questions: RequiredQuestion }[])
            .map((urq) => urq.required_questions)
            .filter((rq): rq is RequiredQuestion => rq && rq.is_active)
            .sort((a, b) => a.order_num - b.order_num);

          setRequiredQuestions(requiredQuestionsData);
          console.log("조회된 필수질문들:", requiredQuestionsData);
        }
      } catch (error) {
        console.error("필수질문 조회 오류:", error);
      }

      setLoadingUser(false);
    };
    fetchUser();
  }, [router]);

  const generateSurvey = async () => {
    if (!userInput.trim()) {
      setError("설문에 대한 설명을 입력해주세요.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // 현재 세션의 토큰 가져오기
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      }

      const response = await fetch("/api/generate-survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          description: userInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI 설문 생성에 실패했습니다.");
      }

      const data = await response.json();
      setGeneratedSurvey(data.survey);
      setEditedSurvey(data.survey);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error generating survey:", error);

      let errorMessage = "AI 설문 생성에 실패했습니다: ";

      if (
        error.message?.includes("과부하") ||
        error.message?.includes("overloaded")
      ) {
        errorMessage =
          "AI 서비스가 일시적으로 과부하 상태입니다. 1-2분 후 다시 시도해주세요.";
      } else if (error.message?.includes("인증")) {
        errorMessage =
          "인증에 문제가 있습니다. 페이지를 새로고침하거나 다시 로그인해주세요.";
      } else {
        errorMessage += error.message || "알 수 없는 오류";
      }

      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const createSurvey = async () => {
    if (!user || !editedSurvey) {
      setError("사용자 정보 또는 설문 데이터가 없습니다.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // 0. 기존 활성 설문 비활성화
      const { error: deactivateError } = await supabase
        .from("surveys")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (deactivateError) {
        console.error("기존 활성 설문 비활성화 오류:", deactivateError);
      }

      // 1. 사용자의 store_id 가져오기
      console.log("현재 사용자 ID:", user.id);

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id, store_name")
        .eq("user_id", user.id)
        .single();

      console.log("매장 조회 결과:", { storeData, storeError });

      let storeId;

      if (storeError) {
        if (storeError.code === "PGRST116") {
          // 매장 정보가 없는 경우 기본 매장 생성
          console.log("매장 정보가 없어서 기본 매장을 생성합니다.");

          const { data: newStoreData, error: createStoreError } = await supabase
            .from("stores")
            .insert({
              user_id: user.id,
              store_name: "기본 매장",
              business_registration_number: "000-00-00000",
              owner_contact: "000-0000-0000",
              store_type_broad: "기타",
            })
            .select("id")
            .single();

          if (createStoreError || !newStoreData) {
            throw new Error(
              "기본 매장 생성에 실패했습니다: " +
                (createStoreError?.message || "알 수 없는 오류")
            );
          }

          storeId = newStoreData.id;
          console.log("생성된 기본 매장 ID:", storeId);
        } else {
          throw new Error(`매장 정보 조회 실패: ${storeError.message}`);
        }
      } else {
        if (!storeData || !storeData.id) {
          throw new Error("매장 정보를 찾을 수 없습니다.");
        }
        storeId = storeData.id;
        console.log("사용할 매장 ID:", storeId);
      }

      // 2. 설문 생성 (새 설문을 활성화)
      const surveyInsertData = {
        user_id: user.id,
        store_id: storeId,
        title: editedSurvey.title,
        description: editedSurvey.description,
        is_active: true, // 새 설문을 활성화
      };
      console.log("설문 생성 데이터:", surveyInsertData);

      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert(surveyInsertData)
        .select("id");

      if (surveyError) {
        console.error("설문 생성 에러:", surveyError);
        throw surveyError;
      }

      if (!surveyData || surveyData.length === 0 || !surveyData[0]?.id) {
        throw new Error("설문 생성 후 ID를 받아오지 못했습니다.");
      }

      const newSurveyId = surveyData[0].id;
      console.log("생성된 설문 ID:", newSurveyId);

      // 3. 사용자가 활성화한 필수질문들 조회 및 추가
      let allQuestionsToInsert: Record<string, unknown>[] = [];

      // 필수질문들을 먼저 추가 (앞쪽에 배치) - 활성화된 것만
      if (requiredQuestions.length > 0) {
        const requiredQuestionData = requiredQuestions.map(
          (rq: RequiredQuestion, index: number) => {
            const questionData: Record<string, unknown> = {
              survey_id: newSurveyId,
              store_id: storeId, // store_id 추가
              question_text: rq.question_text,
              question_type: rq.question_type,
              options: rq.options || { maxRating: 5, required: true },
              order_num: index + 1,
              is_required: true,
              required_question_id: rq.id,
            };

            // rating 질문인 경우 라벨 정보 추가
            if (rq.question_type === "rating") {
              questionData.rating_min_label =
                rq.options?.rating_min_label || "매우 불만족";
              questionData.rating_max_label =
                rq.options?.rating_max_label || "매우 만족";
            }

            return questionData;
          }
        );

        allQuestionsToInsert = [...requiredQuestionData];
        console.log("추가된 필수질문들:", requiredQuestionData);
      }

      // 4. AI가 생성한 질문들 추가 (필수질문 뒤에 배치)
      const aiQuestionsToInsert = editedSurvey.questions.map((q, index) => {
        const questionData: Record<string, unknown> = {
          survey_id: newSurveyId,
          store_id: storeId,
          question_text: q.question_text,
          question_type: q.question_type,
          order_num: allQuestionsToInsert.length + index + 1, // 필수질문 뒤에 배치
          is_required: false,
        };

        // 객관식 질문의 경우 options 추가
        if (
          q.question_type === "single_choice" ||
          q.question_type === "multiple_choice"
        ) {
          questionData.options = {
            choices_text: q.choices_text || [],
            choice_ids: (q.choices_text || []).map(
              (_, idx) => `choice_${idx + 1}`
            ),
            isMultiSelect: q.question_type === "multiple_choice",
          };
        }

        // 별점 질문의 경우 rating 라벨 추가
        if (q.question_type === "rating") {
          questionData.rating_min_label = q.rating_min_label || "매우 불만족";
          questionData.rating_max_label = q.rating_max_label || "매우 만족";
        }

        console.log(`AI 생성 질문 ${index + 1} 데이터:`, questionData);
        return questionData;
      });

      allQuestionsToInsert = [...allQuestionsToInsert, ...aiQuestionsToInsert];

      console.log("생성할 모든 질문들:", allQuestionsToInsert);

      if (allQuestionsToInsert.length > 0) {
        const { error: questionsError } = await supabase
          .from("questions")
          .insert(allQuestionsToInsert);

        if (questionsError) {
          console.error("질문 생성 에러:", questionsError);
          // 설문 삭제 (롤백)
          await supabase.from("surveys").delete().eq("id", newSurveyId);
          throw questionsError;
        }
      }

      setSuccessMessage("AI 생성 설문이 성공적으로 저장되고 활성화되었습니다!");

      // 2초 후 설문 목록으로 이동
      setTimeout(() => {
        router.push("/dashboard/surveys");
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error creating survey:", error);
      setError(
        "설문 저장에 실패했습니다: " + (error.message || "알 수 없는 오류")
      );
    } finally {
      setCreating(false);
    }
  };

  const updateSurveyField = (
    field: keyof GeneratedSurvey,
    value: unknown
  ) => {
    if (!editedSurvey) return;
    setEditedSurvey({ ...editedSurvey, [field]: value });
  };

  const updateQuestion = (
    index: number,
    field: keyof GeneratedQuestion,
    value: unknown
  ) => {
    if (!editedSurvey) return;
    const updatedQuestions = [...editedSurvey.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setEditedSurvey({ ...editedSurvey, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    if (!editedSurvey) return;
    const updatedQuestions = editedSurvey.questions.filter(
      (_, i) => i !== index
    );
    setEditedSurvey({ ...editedSurvey, questions: updatedQuestions });
  };

  const addQuestion = () => {
    if (!editedSurvey) return;
    const newQuestion: GeneratedQuestion = {
      question_text: "",
      question_type: "text",
      choices_text: [],
    };
    setEditedSurvey({
      ...editedSurvey,
      questions: [...editedSurvey.questions, newQuestion],
    });
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="text-gray-600">사용자 정보 확인 중...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">접근 오류</h3>
          <p className="text-sm text-gray-600 mb-6">
            사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/surveys/new"
            className="inline-flex items-center text-gray-600 hover:text-black transition-colors mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            설문 생성 방식 선택으로 돌아가기
          </Link>

          <div className=" p-4 sm:p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl">
                  <Sparkles className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                AI로 설문 만들기
                <span className="inline-block ml-2 px-2 py-1 text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full">
                  BETA
                </span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                원하는 설문 내용을 자연어로 설명하면 AI가 자동으로 설문을
                생성합니다
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <AlertTriangle
                  size={16}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />
                <span className="text-sm">
                  <strong className="font-semibold">오류:</strong> {error}
                </span>
              </div>
              {error.includes("과부하") && (
                <button
                  onClick={() => {
                    setError(null);
                    generateSurvey();
                  }}
                  className="ml-4 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl flex items-start space-x-2">
            <CheckCircle
              size={16}
              className="text-green-500 mt-0.5 flex-shrink-0"
            />
            <span className="text-sm">
              <strong className="font-semibold">성공:</strong> {successMessage}
            </span>
          </div>
        )}

        {/* AI Input Section */}
        {!generatedSurvey && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-4">
              <div>
                <textarea
                  id="userInput"
                  rows={3}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                  placeholder="예: 카페 고객들의 메뉴 선호도와 서비스 만족도를 조사하고 싶어요. 특히 신메뉴 출시를 위한 의견도 받고 싶고, 재방문 의향과 추천 의향도 알고 싶습니다. 고객의 연령대와 방문 빈도도 조사하면 좋겠어요."
                  disabled={generating}
                />
              </div>

              <button
                onClick={generateSurvey}
                disabled={generating || !userInput.trim()}
                className="w-full inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400 transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI가 설문을 생성하고 있습니다...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI로 설문 생성하기
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Generated Survey Preview/Edit */}
        {generatedSurvey && editedSurvey && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  AI 생성 설문 {editMode ? "수정" : "미리보기"}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {editMode ? "미리보기" : "수정"}
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedSurvey(null);
                      setEditedSurvey(null);
                      setUserInput("");
                      setEditMode(false);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    새로 생성
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {editMode ? (
                <div className="space-y-6">
                  {/* 기본 정보 수정 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        설문 제목
                      </label>
                      <input
                        type="text"
                        value={editedSurvey.title}
                        onChange={(e) =>
                          updateSurveyField("title", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        설문 설명
                      </label>
                      <textarea
                        rows={3}
                        value={editedSurvey.description}
                        onChange={(e) =>
                          updateSurveyField("description", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* 질문 수정 */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-md font-semibold text-gray-900">
                        질문 목록 ({editedSurvey.questions.length}개)
                      </h3>
                      <button
                        onClick={addQuestion}
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        질문 추가
                      </button>
                    </div>

                    {editedSurvey.questions.map((question, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            질문 #{index + 1}
                          </span>
                          <button
                            onClick={() => removeQuestion(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            삭제
                          </button>
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={question.question_text}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "question_text",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder="질문 내용"
                          />

                          <select
                            value={question.question_type}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "question_type",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          >
                            <option value="text">주관식</option>
                            <option value="rating">별점 평가</option>
                            <option value="single_choice">
                              객관식 (단일선택)
                            </option>
                            <option value="multiple_choice">
                              객관식 (다중선택)
                            </option>
                          </select>

                          {(question.question_type === "single_choice" ||
                            question.question_type === "multiple_choice") && (
                            <div className="space-y-2">
                              <label className="text-xs text-gray-600">
                                선택지 (줄바꿈으로 구분)
                              </label>
                              <textarea
                                rows={3}
                                value={(question.choices_text || []).join("\n")}
                                onChange={(e) =>
                                  updateQuestion(
                                    index,
                                    "choices_text",
                                    e.target.value
                                      .split("\n")
                                      .filter((choice) => choice.trim())
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                placeholder="선택지 1&#10;선택지 2&#10;선택지 3"
                              />
                            </div>
                          )}

                          {question.question_type === "rating" && (
                            <div className="space-y-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <label className="text-xs text-gray-600 font-medium">
                                별점 척도 라벨 설정
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    1점 기준 (최소값)
                                  </label>
                                  <input
                                    type="text"
                                    value={question.rating_min_label || ""}
                                    onChange={(e) =>
                                      updateQuestion(
                                        index,
                                        "rating_min_label",
                                        e.target.value
                                      )
                                    }
                                    placeholder="예: 매우 불만족"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    5점 기준 (최대값)
                                  </label>
                                  <input
                                    type="text"
                                    value={question.rating_max_label || ""}
                                    onChange={(e) =>
                                      updateQuestion(
                                        index,
                                        "rating_max_label",
                                        e.target.value
                                      )
                                    }
                                    placeholder="예: 매우 만족"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto bg-gray-50 p-4 pb-8">
                  {/* 헤더 */}
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {editedSurvey.title}
                    </h1>
                    <p className="text-gray-600">{editedSurvey.description}</p>
                  </div>

                  {/* 설문 콘텐츠 */}
                  <div className="space-y-6">
                    {/* 필수질문 미리보기 */}
                    {requiredQuestions.map((requiredQ, index) => (
                      <div
                        key={`preview-required-${requiredQ.id}`}
                        className="bg-white ring-1 ring-gray-200 shadow-sm rounded-lg p-5"
                      >
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="inline-block px-3 py-1 text-md font-medium rounded-full bg-gray-100 text-gray-700">
                              {index + 1}
                            </span>
                            <span className="text-red-500 text-sm">필수</span>
                          </div>
                          <h3 className="text-xl leading-7 break-keep font-semibold text-gray-900">
                            {requiredQ.question_text}
                          </h3>
                        </div>

                        <div>
                          {requiredQ.question_type === "text" && (
                            <div>
                              <textarea
                                rows={4}
                                className="w-full p-3 rounded-lg resize-none border border-gray-300 bg-white focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                placeholder="답변을 입력해주세요"
                                disabled
                              />
                            </div>
                          )}

                          {requiredQ.question_type === "rating" && (
                            <div>
                              <div className="flex justify-between text-sm mb-4 px-0 text-gray-600">
                                <span>
                                  {requiredQ.options?.rating_min_label ||
                                    "매우 불만족"}
                                </span>
                                <span>
                                  {requiredQ.options?.rating_max_label ||
                                    "매우 만족"}
                                </span>
                              </div>

                              <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((ratingValue) => (
                                  <label
                                    key={ratingValue}
                                    className="block p-4 rounded-lg text-center cursor-pointer border border-gray-300 bg-white"
                                  >
                                    <input
                                      type="radio"
                                      name={`preview_required_q_${requiredQ.id}`}
                                      value={ratingValue}
                                      className="sr-only"
                                      disabled
                                    />
                                    <div className="text-lg font-bold text-gray-900">
                                      {ratingValue}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {(requiredQ.question_type === "single_choice" ||
                            requiredQ.question_type === "multiple_choice") && (
                            <div className="space-y-3">
                              {(requiredQ.options?.choices_text || []).map(
                                (choice: string, choiceIndex: number) => (
                                  <label
                                    key={choiceIndex}
                                    className="block p-4 rounded-lg cursor-pointer border border-gray-300 bg-white"
                                  >
                                    <div className="flex items-center">
                                      <input
                                        type={
                                          requiredQ.question_type ===
                                          "single_choice"
                                            ? "radio"
                                            : "checkbox"
                                        }
                                        name={`preview_required_q_${requiredQ.id}`}
                                        className="mr-3"
                                        disabled
                                      />
                                      <span className="text-gray-900">
                                        {choice}
                                      </span>
                                    </div>
                                  </label>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* AI 생성 질문 미리보기 */}
                    {editedSurvey.questions.map((question, index) => (
                      <div
                        key={index}
                        className="bg-white ring-1 ring-gray-200 shadow-sm rounded-lg p-5"
                      >
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="inline-block px-3 py-1 text-md font-medium rounded-full bg-gray-100 text-gray-700">
                              {requiredQuestions.length + index + 1}
                            </span>
                          </div>
                          <h3 className="text-xl leading-7 break-keep font-semibold text-gray-900">
                            {question.question_text}
                          </h3>
                        </div>

                        <div>
                          {question.question_type === "text" && (
                            <div>
                              <textarea
                                rows={4}
                                className="w-full p-3 rounded-lg resize-none border border-gray-300 bg-white focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                placeholder="답변을 입력해주세요"
                                disabled
                              />
                            </div>
                          )}

                          {question.question_type === "rating" && (
                            <div>
                              <div className="flex justify-between text-sm mb-4 px-0 text-gray-600">
                                <span>
                                  {question.rating_min_label || "매우 불만족"}
                                </span>
                                <span>
                                  {question.rating_max_label || "매우 만족"}
                                </span>
                              </div>

                              <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((ratingValue) => (
                                  <label
                                    key={ratingValue}
                                    className="block p-4 rounded-lg text-center cursor-pointer border border-gray-300 bg-white"
                                  >
                                    <input
                                      type="radio"
                                      name={`preview_q_${index}`}
                                      value={ratingValue}
                                      className="sr-only"
                                      disabled
                                    />
                                    <div className="text-lg font-bold text-gray-900">
                                      {ratingValue}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {(question.question_type === "single_choice" ||
                            question.question_type === "multiple_choice") && (
                            <div className="space-y-3">
                              {(question.choices_text || []).map(
                                (choice, choiceIndex) => (
                                  <label
                                    key={choiceIndex}
                                    className="block p-4 rounded-lg cursor-pointer border border-gray-300 bg-white"
                                  >
                                    <div className="flex items-center">
                                      <input
                                        type={
                                          question.question_type ===
                                          "single_choice"
                                            ? "radio"
                                            : "checkbox"
                                        }
                                        name={`preview_q_${index}`}
                                        className="mr-3"
                                        disabled
                                      />
                                      <span className="text-gray-900">
                                        {choice}
                                      </span>
                                    </div>
                                  </label>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 제출 버튼 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <button
                        className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg"
                        disabled
                      >
                        설문 완료
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 하단 버튼 */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200 mt-6">
                <div className="text-sm text-gray-500">
                  💡 생성된 설문이 마음에 들지 않으면 수정하거나 새로 생성할 수
                  있습니다
                </div>

                <button
                  onClick={createSurvey}
                  disabled={creating}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400 transition-colors"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      설문 저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      설문 저장하기
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
