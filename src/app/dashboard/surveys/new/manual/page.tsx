"use client";

import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  Save,
} from "lucide-react";
import { User } from "@supabase/supabase-js";

interface Question {
  tempId: string;
  question_text: string;
  question_type: "text" | "rating" | "single_choice" | "multiple_choice";
  choices_text: string[];
  isMultiSelect?: boolean;
}

export default function ManualSurveyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

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
      setLoadingUser(false);
    };
    fetchUser();
  }, [router]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        tempId: `temp-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 15)}`,
        question_text: "",
        question_type: "text",
        choices_text: [],
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };

    // 질문 유형이 변경되면 선택지 초기화
    if (field === "question_type") {
      const newType = value as Question["question_type"];
      if (newType === "single_choice" || newType === "multiple_choice") {
        newQuestions[index].choices_text = ["", ""];
        newQuestions[index].isMultiSelect = newType === "multiple_choice";
      } else {
        newQuestions[index].choices_text = [];
        newQuestions[index].isMultiSelect = undefined;
      }
    }

    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices_text.push("");
    setQuestions(newQuestions);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices_text[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices_text = newQuestions[
      questionIndex
    ].choices_text.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setError("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    if (!title.trim()) {
      setError("설문 제목을 입력해주세요.");
      return;
    }

    if (questions.length === 0) {
      setError("하나 이상의 질문을 추가해주세요.");
      return;
    }

    // 질문 유효성 검사
    for (const q of questions) {
      if (!q.question_text.trim()) {
        setError("모든 질문의 내용을 입력해주세요.");
        return;
      }
      if (
        (q.question_type === "single_choice" ||
          q.question_type === "multiple_choice") &&
        q.choices_text.some((opt) => !opt.trim())
      ) {
        setError("선택형 질문의 모든 선택지를 입력해주세요.");
        return;
      }
      if (
        (q.question_type === "single_choice" ||
          q.question_type === "multiple_choice") &&
        q.choices_text.filter((opt) => opt.trim()).length < 2
      ) {
        setError("선택형 질문에는 최소 2개 이상의 선택지가 필요합니다.");
        return;
      }
    }

    setCreating(true);
    setError(null);
    setSuccessMessage(null);

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
        .select("id, name")
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
              name: "기본 매장",
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
        title: title.trim(),
        description: description.trim() || null,
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

      // 3. 질문 생성
      const questionsToInsert = questions.map((q, index) => {
        const questionData = {
          survey_id: newSurveyId,
          store_id: storeId,
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: (() => {
            if (
              q.question_type === "single_choice" ||
              q.question_type === "multiple_choice"
            ) {
              return {
                choices_text: q.choices_text.filter((opt) => opt.trim()),
                choice_ids: q.choices_text
                  .filter((opt) => opt.trim())
                  .map((_, idx) => `choice_${idx + 1}`),
                isMultiSelect: q.question_type === "multiple_choice",
              };
            }
            return null;
          })(),
          order_num: index + 1,
        };
        console.log(`질문 ${index + 1} 데이터:`, questionData);
        return questionData;
      });

      console.log("생성할 질문들:", questionsToInsert);

      if (questionsToInsert.length > 0) {
        const { error: questionsError } = await supabase
          .from("questions")
          .insert(questionsToInsert);

        if (questionsError) {
          // 설문 삭제 (롤백)
          await supabase.from("surveys").delete().eq("id", newSurveyId);
          throw questionsError;
        }
      }

      setSuccessMessage("설문이 성공적으로 생성되고 활성화되었습니다!");
      setTitle("");
      setDescription("");
      setQuestions([]);

      // 2초 후 설문 목록으로 이동
      setTimeout(() => {
        router.push("/dashboard/surveys");
      }, 2000);
    } catch (err: any) {
      console.error("Error creating survey:", err);
      setError(
        "설문 생성에 실패했습니다: " + (err.message || "알 수 없는 오류")
      );
    } finally {
      setCreating(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <>
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  직접 설문 만들기
                </h1>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  질문을 하나씩 추가하여 맞춤형 설문을 생성하세요
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start space-x-2">
              <AlertTriangle
                size={16}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm">
                <strong className="font-semibold">오류:</strong> {error}
              </span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl flex items-start space-x-2">
              <CheckCircle
                size={16}
                className="text-green-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm">
                <strong className="font-semibold">성공:</strong>{" "}
                {successMessage}
              </span>
            </div>
          )}

          {/* Survey Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  기본 정보
                </h2>

                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    설문 제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="예: 고객 만족도 조사"
                    disabled={creating}
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    설문 설명 (선택사항)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="설문에 대한 간단한 설명을 입력하세요"
                    disabled={creating}
                  />
                </div>
              </div>

              {/* 질문 관리 */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    질문 목록 ({questions.length}개)
                  </h2>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                    disabled={creating}
                  >
                    <PlusCircle size={16} className="mr-2" />
                    질문 추가
                  </button>
                </div>

                {questions.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">
                      아직 추가된 질문이 없습니다
                    </p>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <PlusCircle size={16} className="mr-2" />첫 번째 질문
                      추가하기
                    </button>
                  </div>
                )}

                {questions.map((question, qIndex) => (
                  <div
                    key={question.tempId}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-sm font-medium text-gray-700">
                        질문 #{qIndex + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        disabled={creating}
                      >
                        삭제
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          질문 내용
                        </label>
                        <textarea
                          value={question.question_text}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              "question_text",
                              e.target.value
                            )
                          }
                          placeholder="질문 내용을 입력하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          rows={2}
                          required
                          disabled={creating}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          질문 유형
                        </label>
                        <select
                          value={question.question_type}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              "question_type",
                              e.target.value as Question["question_type"]
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          disabled={creating}
                        >
                          <option value="text">주관식 (텍스트)</option>
                          <option value="rating">별점 평가 (1-5점)</option>
                          <option value="single_choice">
                            객관식 (단일 선택)
                          </option>
                          <option value="multiple_choice">
                            객관식 (다중 선택)
                          </option>
                        </select>
                      </div>

                      {(question.question_type === "single_choice" ||
                        question.question_type === "multiple_choice") && (
                        <div className="space-y-3 pl-4 border-l-2 border-gray-300">
                          <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">
                              선택지 (최소 2개)
                            </label>
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                              disabled={creating}
                            >
                              선택지 추가
                            </button>
                          </div>

                          {question.choices_text.map((option, oIndex) => (
                            <div
                              key={oIndex}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  updateOption(qIndex, oIndex, e.target.value)
                                }
                                placeholder={`선택지 ${oIndex + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                required
                                disabled={creating}
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="text-red-500 hover:text-red-700 text-sm p-1"
                                disabled={
                                  creating || question.choices_text.length <= 2
                                }
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 하단 버튼 */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  disabled={creating}
                >
                  <Eye size={18} className="mr-2" />
                  미리보기
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      설문 생성하기
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                설문 미리보기
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {title || "설문 제목"}
                </h3>
                {description && <p className="text-gray-600">{description}</p>}
              </div>

              {questions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  아직 추가된 질문이 없습니다.
                </p>
              ) : (
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div
                      key={question.tempId}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <p className="font-medium text-gray-900 mb-3">
                        {index + 1}. {question.question_text || "질문 내용"}
                      </p>

                      {question.question_type === "text" && (
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                          rows={3}
                          placeholder="응답자가 답변을 입력하는 영역입니다."
                          disabled
                        />
                      )}

                      {question.question_type === "rating" && (
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className="text-2xl text-yellow-400"
                            >
                              ★
                            </span>
                          ))}
                          <span className="ml-3 text-sm text-gray-500">
                            (1-5점)
                          </span>
                        </div>
                      )}

                      {(question.question_type === "single_choice" ||
                        question.question_type === "multiple_choice") && (
                        <div className="space-y-2">
                          {question.choices_text.map((option, oIndex) => (
                            <label
                              key={oIndex}
                              className="flex items-center text-gray-700"
                            >
                              <input
                                type={
                                  question.question_type === "single_choice"
                                    ? "radio"
                                    : "checkbox"
                                }
                                name={`preview_q_${question.tempId}`}
                                className="mr-2"
                                disabled
                              />
                              {option || `선택지 ${oIndex + 1}`}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
