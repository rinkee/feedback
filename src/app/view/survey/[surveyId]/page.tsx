// src/app/view/survey/[surveyId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation"; // Added useRouter
import { supabase } from "@/lib/supabaseClient";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Send,
  User,
  X,
} from "lucide-react";

interface SurveyOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: "textarea" | "select" | "rating";
  options?: SurveyOption[];
  isMultiSelect?: boolean;
  required?: boolean;
  placeholder?: string;
  maxRating?: number;
  labels?: { [key: number]: string };
  original_question_type?: string;
  original_options?: any;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

interface Answer {
  question_id: string;
  response_text?: string | null;
  selected_option_ids?: string[] | null;
  rating?: number | null;
}

interface CustomerInfo {
  name: string;
  age_group: string;
  gender: string;
  phone?: string;
  email?: string;
}

export default function SurveyViewPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const router = useRouter();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: Answer }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 고객 정보 관련 state
  const [showCustomerInfoModal, setShowCustomerInfoModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    age_group: "",
    gender: "",
    phone: "",
    email: "",
  });
  const [customerInfoError, setCustomerInfoError] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function fetchSurveyData() {
      if (!surveyId) {
        setError("Survey ID is missing.");
        setLoading(false);
        return;
      }

      console.log("Attempting to fetch survey with ID:", surveyId);
      console.log("Using supabase client:", !!supabase);
      setLoading(true);
      setError(null);

      try {
        // 먼저 전체 설문 테이블에서 모든 레코드 조회
        const { data: allSurveysTest, error: allSurveysTestError } =
          await supabase.from("surveys").select("*").limit(10);

        console.log("All surveys test query:", {
          allSurveysTest,
          allSurveysTestError,
        });

        // 특정 설문 조회
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", surveyId);

        console.log("Survey query result:", { surveyData, surveyError });

        if (surveyError) {
          console.error("Survey fetch error:", surveyError);
          throw surveyError;
        }

        // 결과가 배열로 반환되므로 첫 번째 요소를 확인
        if (!surveyData || surveyData.length === 0) {
          console.log("No survey found with ID:", surveyId);

          // 특정 사용자의 설문만 조회해보기
          console.log("Attempting to fetch surveys for specific user...");
          const { data: userSurveys, error: userSurveysError } = await supabase
            .from("surveys")
            .select("*")
            .eq("user_id", "5e1f5903-b48d-4502-95cb-838df25fbf48")
            .limit(5);

          console.log("User surveys:", { userSurveys, userSurveysError });

          throw new Error(
            "설문을 찾을 수 없습니다. 설문이 삭제되었거나 잘못된 링크일 수 있습니다."
          );
        }

        if (surveyData.length > 1) {
          console.warn("Multiple surveys found with the same ID");
        }

        const survey = surveyData[0];
        console.log("Found survey:", survey);

        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("id, question_text, question_type, options, order_num")
          .eq("survey_id", surveyId)
          .order("order_num", { ascending: true });

        console.log("Questions query result:", {
          questionsData,
          questionsError,
        }); // 디버깅용 로그 추가

        if (questionsError) {
          console.error("Questions fetch error:", questionsError);
          throw questionsError;
        }

        const transformedQuestions: Question[] = (questionsData || []).map(
          (q: any) => {
            let questionOptions: SurveyOption[] = [];
            let isMultiSelectFlag = false;
            let currentQuestionType: Question["type"] = "textarea";

            if (
              q.question_type === "multiple_choice" ||
              q.question_type === "boolean" ||
              q.question_type === "select"
            ) {
              currentQuestionType = "select";
              if (
                q.options &&
                q.options.choices_text &&
                Array.isArray(q.options.choices_text)
              ) {
                questionOptions = q.options.choices_text.map(
                  (text: string, index: number) => ({
                    id:
                      q.options.choice_ids?.[index] ||
                      `${q.id}_option_${index}`,
                    text: text,
                  })
                );
              }
              isMultiSelectFlag =
                q.question_type === "multiple_choice"
                  ? !!q.options?.isMultiSelect
                  : false;
              if (
                q.question_type === "boolean" &&
                questionOptions.length === 0
              ) {
                questionOptions = [
                  { id: `${q.id}_option_yes`, text: "예" },
                  { id: `${q.id}_option_no`, text: "아니오" },
                ];
              }
            } else if (q.question_type === "rating") {
              currentQuestionType = "rating";
            } else if (
              q.question_type === "textarea" ||
              q.question_type === "short_text" ||
              q.question_type === "text"
            ) {
              currentQuestionType = "textarea";
            }

            return {
              id: q.id,
              text: q.question_text,
              type: currentQuestionType,
              options: questionOptions,
              isMultiSelect: isMultiSelectFlag,
              required: q.required ?? false,
              placeholder: q.placeholder,
              maxRating:
                q.max_rating ??
                (currentQuestionType === "rating" ? 5 : undefined),
              labels:
                q.labels ?? (currentQuestionType === "rating" ? {} : undefined),
              original_question_type: q.question_type,
              original_options: q.options,
            };
          }
        );

        console.log("Transformed questions:", transformedQuestions); // 디버깅용 로그 추가
        setSurvey({ ...survey, questions: transformedQuestions });
      } catch (err: any) {
        console.error("Error fetching survey:", err);
        setError(err.message || "Failed to load survey. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchSurveyData();
  }, [surveyId, supabase]);

  const handleAnswerChange = (
    questionId: string,
    value: string | number,
    questionType: Question["type"],
    isMultiSelect?: boolean,
    optionId?: string
  ) => {
    setAnswers((prevAnswers) => {
      const newAnswers = { ...prevAnswers };
      let currentAnswerForQuestion: Answer = newAnswers[questionId]
        ? { ...newAnswers[questionId] }
        : { question_id: questionId };

      if (questionType === "textarea") {
        currentAnswerForQuestion.response_text = value as string;
        currentAnswerForQuestion.selected_option_ids = null;
        currentAnswerForQuestion.rating = null;
      } else if (questionType === "rating") {
        currentAnswerForQuestion.rating = value as number;
        currentAnswerForQuestion.selected_option_ids = null;
        currentAnswerForQuestion.response_text = null;
      } else if (questionType === "select") {
        if (isMultiSelect && optionId) {
          const currentSelected =
            currentAnswerForQuestion.selected_option_ids || [];
          if (currentSelected.includes(optionId)) {
            currentAnswerForQuestion.selected_option_ids =
              currentSelected.filter((id) => id !== optionId);
          } else {
            currentAnswerForQuestion.selected_option_ids = [
              ...currentSelected,
              optionId,
            ];
          }
        } else {
          currentAnswerForQuestion.selected_option_ids = [value as string];
        }
        currentAnswerForQuestion.response_text = null;
        currentAnswerForQuestion.rating = null;
      }
      newAnswers[questionId] = currentAnswerForQuestion;
      return newAnswers;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!survey) return;
    setError(null);

    // 필수 질문 검증
    for (const question of survey.questions) {
      if (question.required) {
        const answer = answers[question.id];
        let isAnswered = false;
        if (answer) {
          if (
            question.type === "textarea" &&
            answer.response_text &&
            answer.response_text.trim() !== ""
          ) {
            isAnswered = true;
          } else if (
            question.type === "rating" &&
            typeof answer.rating === "number"
          ) {
            isAnswered = true;
          } else if (
            question.type === "select" &&
            answer.selected_option_ids &&
            answer.selected_option_ids.length > 0
          ) {
            isAnswered = true;
          }
        }
        if (!isAnswered) {
          setError(`질문 "${question.text}"은(는) 필수 항목입니다.`);
          const questionElement = document.getElementById(
            `question-${question.id}`
          );
          if (questionElement) {
            questionElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
          return;
        }
      }
    }

    // 세션 확인 - 없으면 로그인 페이지로 리다이렉트
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      setError("응답을 제출하려면 로그인이 필요합니다.");
      setTimeout(() => {
        const currentUrl = window.location.pathname;
        localStorage.setItem("redirectAfterLogin", currentUrl);
        router.push("/auth");
      }, 2000);
      return;
    }

    // 설문 답변이 완료되면 고객 정보 입력 모달 표시
    setShowCustomerInfoModal(true);
  };

  const handleCustomerInfoSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCustomerInfoError(null);

    // 고객 정보 필수 필드 검증
    if (!customerInfo.name.trim()) {
      setCustomerInfoError("이름을 입력해주세요.");
      return;
    }
    if (!customerInfo.age_group) {
      setCustomerInfoError("연령대를 선택해주세요.");
      return;
    }
    if (!customerInfo.gender) {
      setCustomerInfoError("성별을 선택해주세요.");
      return;
    }

    await submitSurveyWithCustomerInfo();
  };

  const submitSurveyWithCustomerInfo = async () => {
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session!.user.id;

      console.log("Submitting survey with customer info...");
      console.log("Customer info:", customerInfo);
      console.log("Survey answers:", answers);

      // 1. 고객 정보 저장 - 항상 새로운 레코드 생성
      const { data: customerData, error: customerInsertError } = await supabase
        .from("customer_info")
        .insert({
          survey_id: surveyId,
          user_id: userId,
          name: customerInfo.name.trim(),
          age_group: customerInfo.age_group,
          gender: customerInfo.gender,
          phone: customerInfo.phone?.trim() || null,
          email: customerInfo.email?.trim() || null,
        })
        .select();

      console.log("Customer info insert result:", {
        customerData,
        customerInsertError,
      });

      if (customerInsertError || !customerData || customerData.length === 0) {
        throw new Error(
          `고객 정보 저장 중 오류가 발생했습니다: ${
            customerInsertError?.message || "알 수 없는 오류"
          }`
        );
      }

      // 2. 설문 응답 처리 - 항상 새로운 응답 생성
      const responsesToProcess = Object.values(answers)
        .filter(
          (ans) =>
            (ans.response_text && ans.response_text.trim() !== "") ||
            (ans.selected_option_ids && ans.selected_option_ids.length > 0) ||
            typeof ans.rating === "number"
        )
        .map((ans) => {
          const responseData: any = {
            survey_id: surveyId,
            question_id: ans.question_id,
            user_id: userId,
            customer_info_id: customerData[0].id, // 새로 생성된 고객 정보 ID 연결
          };

          if (ans.response_text && ans.response_text.trim() !== "") {
            responseData.response_text = ans.response_text.trim();
          }

          if (ans.selected_option_ids && ans.selected_option_ids.length > 0) {
            responseData.selected_option = ans.selected_option_ids[0];
            responseData.selected_options = ans.selected_option_ids;
          }

          if (typeof ans.rating === "number") {
            responseData.rating = ans.rating;
          }

          return responseData;
        });

      console.log("Responses to process:", responsesToProcess);

      // 3. 해당 customer_info_id의 기존 응답 삭제 (같은 사용자가 재제출하는 경우 대비)
      const { error: deleteError } = await supabase
        .from("responses")
        .delete()
        .eq("customer_info_id", customerData[0].id);

      if (deleteError) {
        console.warn("기존 응답 삭제 중 오류:", deleteError);
        // 기존 응답이 없을 수도 있으므로 오류가 나도 계속 진행
      }

      // 4. 모든 응답을 새로 삽입
      if (responsesToProcess.length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from("responses")
          .insert(responsesToProcess)
          .select();

        console.log("Responses insert result:", {
          insertData,
          insertError,
        });

        if (insertError) {
          throw new Error(
            `응답 저장 중 오류가 발생했습니다: ${insertError.message}`
          );
        }
      }

      setShowCustomerInfoModal(false);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      setCustomerInfoError(
        err.message || "제출 중 예기치 않은 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-black animate-spin" />
        <p className="text-slate-600 mt-4 text-lg">
          설문지를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          설문에 참여해주셔서 감사합니다!
        </h1>
        <p className="text-slate-600 text-lg max-w-md mb-8">
          응답이 성공적으로 제출되었습니다.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-md"
          aria-label="대시보드로 돌아가기"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-700 text-lg mb-6">
          {error || "설문지를 찾을 수 없습니다."}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-md"
          aria-label="대시보드로 돌아가기"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center border-b border-slate-200 pb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
              {survey.description}
            </p>
          )}
        </header>

        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow"
            role="alert"
          >
            <div className="flex">
              <div className="py-1">
                <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              </div>
              <div>
                <p className="font-bold">오류 발생</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {survey.questions.map((question, index) => (
            <div
              key={question.id}
              id={`question-${question.id}`}
              className="bg-white p-6 sm:p-8 rounded-xl shadow-lg"
            >
              <div className="mb-5">
                <p className="block text-sm font-medium text-slate-500 mb-1">
                  질문 {index + 1}
                  {question.required && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </p>
                <p className="text-lg font-semibold text-slate-800 leading-tight">
                  {question.text}
                </p>
              </div>

              {question.type === "textarea" && (
                <textarea
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors placeholder-slate-400 text-sm sm:text-base"
                  placeholder={
                    question.placeholder || "자유롭게 답변해주세요..."
                  }
                  value={answers[question.id]?.response_text || ""}
                  onChange={(e) =>
                    handleAnswerChange(
                      question.id,
                      e.target.value,
                      question.type
                    )
                  }
                  required={question.required}
                  aria-label={`질문 ${index + 1}: ${question.text}`}
                />
              )}

              {question.type === "select" && question.options && (
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center p-3.5 border rounded-lg transition-all cursor-pointer text-sm sm:text-base 
                                  ${
                                    (
                                      question.isMultiSelect
                                        ? (
                                            answers[question.id]
                                              ?.selected_option_ids || []
                                          ).includes(option.id)
                                        : answers[question.id]
                                            ?.selected_option_ids?.[0] ===
                                          option.id
                                    )
                                      ? "bg-slate-100 border-black ring-1 ring-black shadow-inner"
                                      : "bg-white border-slate-300 hover:border-slate-400"
                                  }`}
                    >
                      <input
                        type={question.isMultiSelect ? "checkbox" : "radio"}
                        name={`question-${question.id}${
                          question.isMultiSelect ? "" : ""
                        }`}
                        value={option.id}
                        checked={
                          question.isMultiSelect
                            ? (
                                answers[question.id]?.selected_option_ids || []
                              ).includes(option.id)
                            : answers[question.id]?.selected_option_ids?.[0] ===
                              option.id
                        }
                        onChange={() =>
                          handleAnswerChange(
                            question.id,
                            option.id,
                            question.type,
                            question.isMultiSelect,
                            option.id
                          )
                        }
                        className={`${
                          question.isMultiSelect
                            ? "form-checkbox"
                            : "form-radio"
                        } h-4 w-4 text-black border-slate-400 focus:ring-black focus:ring-offset-1`}
                        required={
                          question.required &&
                          !question.isMultiSelect &&
                          !answers[question.id]?.selected_option_ids?.length
                        }
                        aria-label={option.text}
                      />
                      <span className="ml-3 font-medium text-slate-700">
                        {option.text}
                      </span>
                    </label>
                  ))}
                  {question.required &&
                    question.isMultiSelect &&
                    (!answers[question.id]?.selected_option_ids ||
                      answers[question.id]?.selected_option_ids?.length ===
                        0) && (
                      <input
                        type="text"
                        required
                        style={{ display: "none" }}
                        value={(
                          answers[question.id]?.selected_option_ids || []
                        ).join(",")}
                        readOnly
                        aria-hidden="true"
                      />
                    )}
                </div>
              )}

              {question.type === "rating" && (
                <div
                  className="flex items-center space-x-1 sm:space-x-2 justify-center py-2 mt-2 flex-wrap"
                  role="radiogroup"
                  aria-labelledby={`question-label-${question.id}`}
                >
                  <p id={`question-label-${question.id}`} className="sr-only">
                    {question.text}
                  </p>
                  {Array.from(
                    { length: question.maxRating || 5 },
                    (_, i) => i + 1
                  ).map((ratingValue) => (
                    <label
                      key={ratingValue}
                      className={`relative flex flex-col items-center justify-center p-2 border-2 rounded-lg cursor-pointer transition-all w-12 h-12 sm:w-14 sm:h-14 my-1 
                                  ${
                                    answers[question.id]?.rating === ratingValue
                                      ? "border-black bg-slate-100 shadow-inner"
                                      : "border-slate-300 hover:border-slate-400 bg-white"
                                  }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={ratingValue}
                        checked={answers[question.id]?.rating === ratingValue}
                        onChange={() =>
                          handleAnswerChange(
                            question.id,
                            ratingValue,
                            question.type
                          )
                        }
                        className="sr-only"
                        required={
                          question.required &&
                          typeof answers[question.id]?.rating !== "number"
                        }
                        aria-label={`${ratingValue}점${
                          question.labels && question.labels[ratingValue]
                            ? `: ${question.labels[ratingValue]}`
                            : ""
                        }`}
                      />
                      <span
                        className={`text-lg sm:text-xl font-semibold ${
                          answers[question.id]?.rating === ratingValue
                            ? "text-black"
                            : "text-slate-600"
                        }`}
                      >
                        {ratingValue}
                      </span>
                      {question.labels && question.labels[ratingValue] && (
                        <span
                          className={`absolute -bottom-5 text-xs text-center w-full ${
                            answers[question.id]?.rating === ratingValue
                              ? "text-black font-medium"
                              : "text-slate-500"
                          }`}
                        >
                          {question.labels[ratingValue]}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="pt-6">
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-white bg-black hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="설문 완료 및 제출하기"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  제출 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  설문 완료 및 제출하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <footer className="mt-12 text-center text-sm text-slate-500 py-8 border-t border-slate-200">
        <p>
          &copy; {new Date().getFullYear()} FeedbackFlow. All rights reserved.
        </p>
      </footer>

      {/* 고객 정보 입력 모달 */}
      {showCustomerInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-6 w-6 text-black mr-2" />
                  <h3 className="text-xl font-bold text-gray-900">
                    고객 정보 입력
                  </h3>
                </div>
                <button
                  onClick={() => setShowCustomerInfoModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={submitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                설문 제출을 위해 간단한 정보를 입력해주세요.
              </p>
            </div>

            <form onSubmit={handleCustomerInfoSubmit} className="p-6 space-y-4">
              {customerInfoError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <p className="text-sm">{customerInfoError}</p>
                </div>
              )}

              {/* 이름 입력 */}
              <div>
                <label
                  htmlFor="customer-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customer-name"
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="이름을 입력해주세요"
                  required
                  disabled={submitting}
                />
              </div>

              {/* 연령대 선택 */}
              <div>
                <label
                  htmlFor="customer-age"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  연령대 <span className="text-red-500">*</span>
                </label>
                <select
                  id="customer-age"
                  value={customerInfo.age_group}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      age_group: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  required
                  disabled={submitting}
                >
                  <option value="">연령대를 선택해주세요</option>
                  <option value="10대">10대</option>
                  <option value="20대">20대</option>
                  <option value="30대">30대</option>
                  <option value="40대">40대</option>
                  <option value="50대">50대</option>
                  <option value="60대 이상">60대 이상</option>
                </select>
              </div>

              {/* 성별 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  성별 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {["남성", "여성", "기타", "답변하지 않음"].map((gender) => (
                    <label key={gender} className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={customerInfo.gender === gender}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({
                            ...prev,
                            gender: e.target.value,
                          }))
                        }
                        className="h-4 w-4 text-black border-gray-300 focus:ring-black"
                        required
                        disabled={submitting}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {gender}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 전화번호 입력 (선택사항) */}
              <div>
                <label
                  htmlFor="customer-phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  전화번호 <span className="text-gray-400">(선택사항)</span>
                </label>
                <input
                  type="tel"
                  id="customer-phone"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="010-1234-5678"
                  disabled={submitting}
                />
              </div>

              {/* 이메일 입력 (선택사항) */}
              <div>
                <label
                  htmlFor="customer-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  이메일 <span className="text-gray-400">(선택사항)</span>
                </label>
                <input
                  type="email"
                  id="customer-email"
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="example@email.com"
                  disabled={submitting}
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerInfoModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      제출 중...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      설문 제출하기
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
