"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  PlusCircle,
  CheckCircle,
  Eye,
  X,
} from "lucide-react";

interface Question {
  id?: string;
  tempId?: string; // React key용 임시 ID
  survey_id?: string;
  question_text: string;
  question_type: "text" | "rating" | "boolean" | "multiple_choice";
  options?: Record<string, unknown>;
  choices_text: string[];
  isMultiSelect?: boolean;
  order_num?: number;
  is_required?: boolean; // 필수질문 여부 추가
  required_question_id?: string; // 필수질문 템플릿 ID
}

interface SurveyData {
  id: string;
  title: string;
  description: string | null;
  questions?: Question[];
  store_id?: string | null;
  user_id?: string | null;
}

export default function EditSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [initialSurvey, setInitialSurvey] = useState<SurveyData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "questions">("basic");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!surveyId) {
      setError("설문 ID가 유효하지 않습니다.");
      setLoading(false);
      setLoadingQuestions(false);
      return;
    }

    const fetchSurveyDetails = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("surveys")
        .select("id, title, description")
        .eq("id", surveyId);

      if (fetchError) {
        console.error("Error fetching survey details:", fetchError);
        setError("설문 정보를 불러오는 데 실패했습니다: " + fetchError.message);
        setSurvey(null);
      } else if (data && data.length > 0) {
        const surveyData = data[0];
        setSurvey(surveyData);
        setInitialSurvey(surveyData);
        await fetchQuestions(surveyData.id);
      } else {
        setError("해당 ID의 설문을 찾을 수 없습니다.");
        setSurvey(null);
      }
      setLoading(false);
    };

    const fetchQuestions = async (surveyId: string) => {
      setLoadingQuestions(true);
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("*, is_required, required_question_id")
          .eq("survey_id", surveyId)
          .order("order_num", { ascending: true });

        if (error) throw error;

        const questionsFromResponse = data.map((q: Record<string, unknown>) => {
          let parsedOptions: Record<string, unknown> = {};
          let choicesText: string[] = [];
          let isMultiSelect = false;

          try {
            if (q.options) {
              if (typeof q.options === "string") {
                parsedOptions = JSON.parse(q.options);
              } else {
                parsedOptions = q.options;
              }

              if (Array.isArray(parsedOptions)) {
                choicesText = parsedOptions;
              } else if (parsedOptions.choices_text) {
                choicesText = parsedOptions.choices_text;
                isMultiSelect = !!parsedOptions.isMultiSelect;
              }
            }
          } catch (error: unknown) {
            console.error("Error parsing options:", error);
          }

          return {
            ...q,
            choices_text: choicesText,
            isMultiSelect: isMultiSelect,
          };
        });

        setQuestions(questionsFromResponse);
        setInitialQuestions(JSON.parse(JSON.stringify(questionsFromResponse)));
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Error fetching questions:", err);
        setError("질문 정보를 불러오는 데 실패했습니다: " + err.message);
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchSurveyDetails();
  }, [surveyId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!survey) return;
    const { name, value } = e.target;
    setSurvey({ ...survey, [name]: value });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      tempId: `temp-${Date.now()}`,
      question_text: "",
      question_type: "text",
      choices_text: [],
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (
    index: number,
    field: keyof Question,
    value: unknown
  ) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };

    if (field === "question_type") {
      const oldType = questions[index].question_type;
      const newType = value as Question["question_type"];

      if (newType !== oldType) {
        if (newType === "multiple_choice") {
          updatedQuestions[index].choices_text = ["", ""];
          updatedQuestions[index].isMultiSelect = false;
        } else if (newType === "boolean") {
          updatedQuestions[index].choices_text = ["예", "아니오"];
          updatedQuestions[index].isMultiSelect = false;
        } else {
          updatedQuestions[index].choices_text = [];
          updatedQuestions[index].isMultiSelect = undefined;
        }
      }
    }

    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    const questionToRemove = questions[index];

    // 필수질문인 경우 삭제 방지
    if (questionToRemove.is_required) {
      alert(
        "필수질문은 삭제할 수 없습니다. 필수 질문 설정 메뉴에서 비활성화해주세요."
      );
      return;
    }

    if (window.confirm("이 질문을 삭제하시겠습니까?")) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      setQuestions(updatedQuestions);
    }
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    const q = updatedQuestions[questionIndex];

    if (!q.choices_text) q.choices_text = [];
    q.choices_text.push("");

    setQuestions(updatedQuestions);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updatedQuestions = [...questions];
    const q = updatedQuestions[questionIndex];

    if (!q.choices_text) q.choices_text = [];
    q.choices_text[optionIndex] = value;

    setQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    const q = updatedQuestions[questionIndex];

    if (!q.choices_text) return;

    if (q.question_type === "boolean" && q.choices_text.length <= 2) {
      alert("예/아니오 질문은 2개의 선택지가 필요합니다.");
      return;
    }

    if (q.question_type === "multiple_choice" && q.choices_text.length <= 2) {
      alert(
        "객관식 질문은 최소 2개의 선택지가 필요합니다. 이 선택지는 삭제할 수 없습니다."
      );
      return;
    }

    q.choices_text = q.choices_text.filter((_, i) => i !== optionIndex);
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!survey || !surveyId) {
      setError("설문 정보가 없거나 ID가 유효하지 않습니다.");
      return;
    }

    const hasSurveyChanges =
      survey.title !== initialSurvey?.title ||
      survey.description !== initialSurvey?.description;

    const hasQuestionChanges =
      JSON.stringify(questions) !== JSON.stringify(initialQuestions);

    if (!hasSurveyChanges && !hasQuestionChanges) {
      setSuccessMessage("변경 사항이 없습니다.");
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    for (const q of questions) {
      if (!q.question_text.trim()) {
        setError(
          `질문 내용을 입력해주세요 (질문 #${questions.indexOf(q) + 1}).`
        );
        return;
      }

      if (
        q.question_type === "multiple_choice" ||
        q.question_type === "boolean"
      ) {
        if (q.choices_text.length < 2) {
          setError(
            `질문 #${
              questions.indexOf(q) + 1
            }: 선택지는 최소 2개 이상이어야 합니다.`
          );
          return;
        }
      }

      if (
        q.question_type === "boolean" &&
        q.choices_text &&
        q.choices_text.length !== 2
      ) {
        setError(
          `예/아니오 질문은 정확히 2개의 선택지만 가질 수 있습니다 (질문 #${
            questions.indexOf(q) + 1
          }).`
        );
        return;
      }

      if (q.choices_text) {
        for (const opt of q.choices_text) {
          if (
            !opt.trim() &&
            (q.question_type === "multiple_choice" ||
              q.question_type === "boolean")
          ) {
            setError(
              `선택지 내용을 입력해주세요 (질문 #${questions.indexOf(q) + 1}).`
            );
            return;
          }
        }
      }
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. 설문 기본 정보 업데이트
      if (hasSurveyChanges) {
        const { error: updateError } = await supabase
          .from("surveys")
          .update({
            title: survey.title,
            description: survey.description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", surveyId);

        if (updateError) throw updateError;
      }

      // 2. 질문 업데이트
      if (hasQuestionChanges) {
        // 2.1 기존 질문 구분 (업데이트 또는 삭제할 질문)
        const existingQuestions = questions.filter((q) => q.id);
        const newQuestions = questions.filter((q) => !q.id);
        const deletedQuestions = initialQuestions.filter(
          (initQ) => !existingQuestions.some((q) => q.id === initQ.id)
        );

        // 2.2 삭제된 질문 처리
        if (deletedQuestions.length > 0) {
          const deletedIds = deletedQuestions.map((q) => q.id).filter(Boolean);
          if (deletedIds.length > 0) {
            const { error: deleteError } = await supabase
              .from("questions")
              .delete()
              .in("id", deletedIds);

            if (deleteError) throw deleteError;
          }
        }

        // 2.3 기존 질문 업데이트
        for (const q of existingQuestions) {
          // 데이터베이스 저장용 options 객체 생성
          let dbOptions: Record<string, unknown> = {};

          if (
            q.question_type === "multiple_choice" ||
            q.question_type === "boolean"
          ) {
            dbOptions = {
              choices_text: q.choices_text || [],
              isMultiSelect:
                q.question_type === "multiple_choice"
                  ? !!q.isMultiSelect
                  : false,
            };
          } else if (q.question_type === "rating") {
            dbOptions = {}; // 필요시 rating 관련 옵션 추가
          } else if (q.question_type === "text") {
            dbOptions = {}; // 필요시 text 관련 옵션 추가
          }

          const { error: updateError } = await supabase
            .from("questions")
            .update({
              question_text: q.question_text,
              question_type: q.question_type,
              options: dbOptions,
              order_num: q.order_num,
              updated_at: new Date().toISOString(),
            })
            .eq("id", q.id);

          if (updateError) throw updateError;
        }

        // 2.4 새 질문 추가
        if (newQuestions.length > 0) {
          const questionsToInsert = newQuestions.map((q) => {
            // 데이터베이스 저장용 options 객체 생성
            let dbOptions: Record<string, unknown> = {};

            if (
              q.question_type === "multiple_choice" ||
              q.question_type === "boolean"
            ) {
              dbOptions = {
                choices_text: q.choices_text || [],
                isMultiSelect:
                  q.question_type === "multiple_choice"
                    ? !!q.isMultiSelect
                    : false,
              };
            } else if (q.question_type === "rating") {
              dbOptions = {};
            } else if (q.question_type === "text") {
              dbOptions = {};
            }

            return {
              survey_id: surveyId,
              store_id: survey.store_id || null,
              user_id: survey.user_id || null,
              question_text: q.question_text,
              question_type: q.question_type,
              options: dbOptions,
              order_num: q.order_num,
            };
          });

          const { error: insertError } = await supabase
            .from("questions")
            .insert(questionsToInsert);

          if (insertError) throw insertError;
        }
      }

      // 성공 처리
      setSuccessMessage("설문이 성공적으로 업데이트되었습니다.");
      setInitialSurvey(JSON.parse(JSON.stringify(survey)));
      setInitialQuestions(JSON.parse(JSON.stringify(questions)));
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error updating survey:", err);
      setError("설문 업데이트에 실패했습니다: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">설문 정보 로딩 중...</p>
      </div>
    );
  }

  if (error && !survey) {
    // Critical error, survey not loaded
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-xl text-red-700 mb-2">오류 발생</p>
        <p className="text-md text-gray-600 mb-6">{error}</p>
        <Link href="/dashboard" legacyBehavior>
          <a className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            대시보드로 돌아가기
          </a>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/dashboard" legacyBehavior>
              <a className="inline-flex items-center text-gray-700 hover:text-black transition-colors">
                <ArrowLeft size={20} className="mr-2" />
                대시보드로 돌아가기
              </a>
            </Link>
          </div>

          <div className="bg-white rounded-lg">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6 pb-4 border-b border-gray-200">
              설문 수정하기
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-300 rounded-md flex items-center">
                <AlertTriangle size={20} className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-300 rounded-md">
                {successMessage}
              </div>
            )}

            {survey && !loading ? (
              <>
                {/* 탭 네비게이션 */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab("basic")}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${
                      activeTab === "basic"
                        ? "border-black text-black"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    기본 정보
                  </button>
                  <button
                    onClick={() => setActiveTab("questions")}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${
                      activeTab === "questions"
                        ? "border-black text-black"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    질문 관리
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* 기본 정보 탭 */}
                  {activeTab === "basic" && (
                    <div className="space-y-6">
                      <div>
                        <label
                          htmlFor="title"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          설문 제목
                        </label>
                        <input
                          type="text"
                          name="title"
                          id="title"
                          required
                          value={survey.title}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm"
                          placeholder="예: 고객 만족도 설문"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          설문 설명 (선택 사항)
                        </label>
                        <textarea
                          name="description"
                          id="description"
                          rows={4}
                          value={survey.description || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm"
                          placeholder="예: 저희 서비스에 대한 소중한 의견을 들려주세요."
                        />
                      </div>
                    </div>
                  )}

                  {/* 질문 관리 탭 */}
                  {activeTab === "questions" && (
                    <div>
                      {loadingQuestions ? (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">질문 정보 로딩 중...</p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-black">
                              질문 목록
                            </h2>
                            <button
                              type="button"
                              onClick={addQuestion}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                            >
                              <PlusCircle size={18} className="mr-2" />
                              질문 추가
                            </button>
                          </div>

                          {questions.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                              <p className="text-gray-500">
                                질문이 없습니다. 질문을 추가해 주세요.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {questions.map((q, qIndex) => (
                                <div
                                  key={q.id || q.tempId}
                                  className="py-4 border-b border-gray-200 last:border-b-0"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-2">
                                      <h3 className="text-sm font-semibold text-gray-800">
                                        질문 #{qIndex + 1}
                                      </h3>
                                      {q.is_required && (
                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                          필수질문
                                        </span>
                                      )}
                                    </div>
                                    {!q.is_required && (
                                      <button
                                        type="button"
                                        onClick={() => removeQuestion(qIndex)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                                        title="질문 삭제"
                                      >
                                        <X size={16} />
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <label
                                        htmlFor={`question_text_${
                                          q.id || q.tempId
                                        }`}
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                      >
                                        질문 내용:
                                        {q.is_required && (
                                          <span className="text-green-600 ml-1">
                                            (필수질문은 수정할 수 없습니다)
                                          </span>
                                        )}
                                      </label>
                                      <textarea
                                        id={`question_text_${q.id || q.tempId}`}
                                        value={q.question_text}
                                        onChange={(e) =>
                                          updateQuestion(
                                            qIndex,
                                            "question_text",
                                            e.target.value
                                          )
                                        }
                                        placeholder="질문 내용을 입력하세요"
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm ${
                                          q.is_required
                                            ? "bg-gray-100 cursor-not-allowed"
                                            : ""
                                        }`}
                                        rows={2}
                                        required
                                        readOnly={q.is_required}
                                        disabled={q.is_required}
                                      />
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`question_type_${
                                          q.id || q.tempId
                                        }`}
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                      >
                                        질문 유형:
                                      </label>
                                      <select
                                        id={`question_type_${q.id || q.tempId}`}
                                        value={q.question_type}
                                        onChange={(e) =>
                                          updateQuestion(
                                            qIndex,
                                            "question_type",
                                            e.target
                                              .value as Question["question_type"]
                                          )
                                        }
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm ${
                                          q.is_required
                                            ? "bg-gray-100 cursor-not-allowed"
                                            : ""
                                        }`}
                                        disabled={q.is_required}
                                      >
                                        <option value="text">
                                          주관식 (텍스트)
                                        </option>
                                        <option value="rating">
                                          별점 평가 (1-5점)
                                        </option>
                                        <option value="boolean">
                                          예/아니오
                                        </option>
                                        <option value="multiple_choice">
                                          객관식 선택
                                        </option>
                                      </select>
                                    </div>

                                    {(q.question_type === "multiple_choice" ||
                                      q.question_type === "boolean") && (
                                      <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 py-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          선택지:
                                        </label>
                                        {q.choices_text.map((opt, oIndex) => (
                                          <div
                                            key={oIndex}
                                            className="flex items-center space-x-2"
                                          >
                                            <input
                                              type="text"
                                              value={opt}
                                              onChange={(e) =>
                                                updateOption(
                                                  qIndex,
                                                  oIndex,
                                                  e.target.value
                                                )
                                              }
                                              placeholder={`선택지 ${
                                                oIndex + 1
                                              }`}
                                              className="flex-grow px-2 py-1.5 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-xs"
                                              required
                                            />
                                            {q.question_type ===
                                              "multiple_choice" &&
                                              q.choices_text.length > 2 && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    removeOption(qIndex, oIndex)
                                                  }
                                                  className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                                                >
                                                  <X size={14} />
                                                </button>
                                              )}
                                          </div>
                                        ))}

                                        {/* 선택지 추가 버튼 (객관식만) */}
                                        {q.question_type ===
                                          "multiple_choice" && (
                                          <button
                                            type="button"
                                            onClick={() => addOption(qIndex)}
                                            className="mt-1 px-2 py-1 text-xs font-medium text-black hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                          >
                                            선택지 추가
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 저장 버튼 */}
                  <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ease-in-out"
                      disabled={saving || loading || loadingQuestions}
                    >
                      <Eye size={18} className="mr-2" />
                      미리보기
                    </button>
                    <button
                      type="submit"
                      disabled={saving || loading || loadingQuestions}
                      className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400"
                    >
                      {saving ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Save size={18} className="mr-2" />
                          변경사항 저장
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              !loading && (
                <p className="text-center text-gray-500 py-5">
                  설문 정보를 찾을 수 없습니다.
                </p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Survey Preview Modal */}
      {showPreview && survey && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out opacity-100">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-100">
            <div className="flex justify-between items-center mb-6 pb-3 border-b">
              <h2 className="text-2xl font-semibold text-gray-800">
                설문 미리보기
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="미리보기 닫기"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-700 mb-2 break-words">
                {survey?.title || (
                  <span className="text-gray-400 italic">
                    설문 제목이 여기에 표시됩니다.
                  </span>
                )}
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap break-words">
                {survey?.description || (
                  <span className="text-gray-400 italic">
                    설문 설명이 여기에 표시됩니다.
                  </span>
                )}
              </p>
            </div>

            {questions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                아직 추가된 질문이 없습니다. 질문을 추가하고 미리보세요.
              </p>
            ) : (
              <div className="space-y-6">
                {questions.map((q, index) => (
                  <div
                    key={q.id || q.tempId}
                    className="p-4 border border-gray-200 rounded-md bg-gray-50"
                  >
                    <p className="font-semibold text-gray-700 mb-3 break-words">
                      {index + 1}.{" "}
                      {q.question_text || (
                        <span className="text-gray-400 italic">
                          질문 내용이 여기에 표시됩니다.
                        </span>
                      )}
                    </p>
                    {q.question_type === "text" && (
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                        rows={3}
                        placeholder="응답자가 답변을 입력하는 영역입니다."
                        disabled
                      />
                    )}
                    {q.question_type === "rating" && (
                      <div className="flex items-center space-x-1 text-3xl text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} role="img" aria-label="별점">
                            ☆
                          </span>
                        ))}
                        <span className="ml-3 text-sm text-gray-500">
                          (별점 평가 1-5점)
                        </span>
                      </div>
                    )}
                    {q.question_type === "boolean" && (
                      <div className="space-y-2 mt-2">
                        {q.choices_text && q.choices_text.length >= 2 ? (
                          <>
                            <label className="flex items-center text-gray-700 cursor-not-allowed">
                              <input
                                type="radio"
                                name={`preview_q_${q.id || q.tempId}`}
                                className="mr-2 cursor-not-allowed"
                                disabled
                              />
                              {q.choices_text[0] || (
                                <span className="text-gray-400 italic">
                                  옵션 1
                                </span>
                              )}
                            </label>
                            <label className="flex items-center text-gray-700 cursor-not-allowed">
                              <input
                                type="radio"
                                name={`preview_q_${q.id || q.tempId}`}
                                className="mr-2 cursor-not-allowed"
                                disabled
                              />
                              {q.choices_text[1] || (
                                <span className="text-gray-400 italic">
                                  옵션 2
                                </span>
                              )}
                            </label>
                          </>
                        ) : (
                          <p className="text-sm text-red-500 italic">
                            이 질문 유형에는 최소 2개의 선택지가 필요합니다.
                          </p>
                        )}
                      </div>
                    )}
                    {q.question_type === "multiple_choice" && (
                      <div className="space-y-2 mt-2">
                        {q.choices_text && q.choices_text.length > 0 ? (
                          q.choices_text.map((opt, optIndex) => (
                            <label
                              key={optIndex}
                              className="flex items-center text-gray-700 cursor-not-allowed"
                            >
                              <input
                                type={q.isMultiSelect ? "checkbox" : "radio"}
                                name={`preview_q_${q.id || q.tempId}`}
                                value={opt}
                                className="mr-2 cursor-not-allowed"
                                disabled
                              />
                              {opt || (
                                <span className="text-gray-400 italic">
                                  선택지 {optIndex + 1}
                                </span>
                              )}
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            선택지가 없습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 pt-4 border-t flex justify-center space-x-4">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                닫기
              </button>
              <Link
                href={`/view/survey/${surveyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                실제 설문 테스트
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
