// src/app/view/survey/[surveyId]/page.tsx
"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { useParams, useRouter } from "next/navigation"; // Added useRouter
import { supabase } from "@/lib/supabaseClient";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Send,
  User,
  X,
  Edit3,
  Star,
  CheckSquare,
  MessageSquare,
  ChevronRight,
  Clock,
  Award,
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
  rating_min_label?: string;
  rating_max_label?: string;
  original_question_type?: string;
  original_options?: any;
  required_question_category?: string;
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

  // Sticky progress bar state
  const [showStickyProgress, setShowStickyProgress] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // 포커스 상태 관리
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(
    null
  );

  // 진행률 계산 함수
  const calculateProgress = () => {
    if (!survey?.questions.length) return 0;
    const answeredCount = survey.questions.filter((q) => {
      const answer = answers[q.id];
      // 포커스된 텍스트 질문은 완료로 카운트하지 않음
      if (q.type === "textarea" && focusedQuestionId === q.id) {
        return false;
      }
      return (
        (answer?.response_text && answer.response_text.trim()) ||
        (answer?.selected_option_ids &&
          answer.selected_option_ids.length > 0) ||
        typeof answer?.rating === "number"
      );
    }).length;
    return Math.round((answeredCount / survey.questions.length) * 100);
  };

  // Intersection Observer for sticky progress
  useEffect(() => {
    if (!headerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyProgress(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-60px 0px 0px 0px", // 60px 위에서 사라질 때 트리거
      }
    );

    observer.observe(headerRef.current);

    return () => observer.disconnect();
  }, [survey]);

  // 질문 유형별 아이콘 반환
  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "textarea":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "rating":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "select":
        return <CheckSquare className="h-5 w-5 text-green-500" />;
      default:
        return <Edit3 className="h-5 w-5 text-gray-500" />;
    }
  };

  useEffect(() => {
    async function fetchSurveyData() {
      try {
        setLoading(true);
        setError(null);

        const surveyId = params.surveyId as string;
        console.log("Fetching survey data for:", surveyId);

        // 1. 설문 기본 정보 조회
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("id, title, description, is_active")
          .eq("id", surveyId)
          .single();

        if (surveyError) {
          console.error("Survey fetch error:", surveyError);
          if (surveyError.code === "PGRST116") {
            throw new Error("설문을 찾을 수 없습니다.");
          }
          throw new Error("설문 정보를 불러오는데 실패했습니다.");
        }

        if (!surveyData.is_active) {
          throw new Error("현재 활성화되지 않은 설문입니다.");
        }

        console.log("Survey data:", surveyData);

        // 2. 질문 목록 조회 (필수질문 카테고리 정보 포함)
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(
            `
            id,
            question_text,
            question_type,
            options,
            order_num,
            is_required,
            required_question_id,
            required_questions:required_question_id (
              category
            )
          `
          )
          .eq("survey_id", surveyId)
          .order("order_num", { ascending: true });

        if (questionsError) {
          console.error("Questions fetch error:", questionsError);
          throw new Error("질문 목록을 불러오는데 실패했습니다.");
        }

        console.log("Questions data:", questionsData);

        // 질문 데이터 형식 변환
        const formattedQuestions = questionsData.map((q): Question => {
          const dbQuestionType = q.question_type;
          let feQuestionType: Question["type"];

          if (typeof dbQuestionType === "string") {
            if (
              dbQuestionType === "text" ||
              dbQuestionType === "textarea" ||
              dbQuestionType === "short_text"
            ) {
              feQuestionType = "textarea";
            } else if (dbQuestionType === "rating") {
              feQuestionType = "rating";
            } else if (
              dbQuestionType === "select" ||
              dbQuestionType === "single_choice" ||
              dbQuestionType === "multiple_choice" ||
              dbQuestionType === "boolean"
            ) {
              feQuestionType = "select";
            } else {
              console.warn(
                `Unknown string question type from DB: ${dbQuestionType} for question ID ${q.id}, defaulting to textarea.`
              );
              feQuestionType = "textarea"; // Default for unknown string types
            }
          } else {
            // Handle null, undefined, or non-string dbQuestionType
            console.warn(
              `Question type from DB is not a string (value: ${dbQuestionType}) for question ID ${q.id}, defaulting to textarea.`
            );
            feQuestionType = "textarea"; // Default if type is missing or not a string
          }

          const dbOptions = q.options; // q.options is the JSONB field from the database

          // 필수질문 카테고리 확인 - 디버그 로그 추가
          const requiredQuestionCategory =
            (q.required_questions as any)?.category || null;
          console.log(
            `질문 "${q.question_text.substring(
              0,
              30
            )}..." - required_question_id: ${
              q.required_question_id
            }, category: ${requiredQuestionCategory}`
          );

          return {
            id: q.id,
            text: q.question_text,
            type: feQuestionType,
            options: dbOptions?.choices_text
              ? dbOptions.choices_text.map((text: string, index: number) => ({
                  id: `choice_${index + 1}`,
                  text: text,
                }))
              : undefined,
            isMultiSelect:
              feQuestionType === "select" &&
              (dbQuestionType === "multiple_choice" || // dbQuestionType could be string here
                dbOptions?.isMultiSelect === true),
            required: q.is_required,
            placeholder: dbOptions?.placeholder,
            maxRating: dbOptions?.maxRating || 5,
            labels: dbOptions?.labels, // For specific rating point labels if ever used
            rating_min_label: dbOptions?.rating_min_label,
            rating_max_label: dbOptions?.rating_max_label,
            original_question_type:
              typeof dbQuestionType === "string"
                ? dbQuestionType
                : String(dbQuestionType), // Store original, ensure string
            original_options: dbOptions,
            required_question_category: requiredQuestionCategory,
          };
        });

        setSurvey({
          id: surveyData.id,
          title: surveyData.title,
          description: surveyData.description,
          questions: formattedQuestions,
        });
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "설문을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchSurveyData();
  }, [params.surveyId]);

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

      // 이름이 없으면 "익명" + 랜덤번호로 기본값 생성
      const customerName =
        customerInfo.name.trim() ||
        `익명${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`;

      // 선택된 성별을 그대로 사용 (DB 제약에서 '남성','여성','답변안함'만 허용)
      const safeGender = customerInfo.gender; // '남성' | '여성' | '답변안함'

      // [✔] customer_info 한 번만 insert
      const { data: customerData, error: customerError } = await supabase
        .from("customer_info")
        .insert({
          survey_id: surveyId,
          user_id: userId,
          name: customerName,
          age_group: customerInfo.age_group,
          gender: safeGender,
          phone: customerInfo.phone?.trim() || null,
        })
        .select();

      if (customerError || !customerData || customerData.length === 0) {
        throw new Error(
          `고객 정보 저장 중 오류가 발생했습니다: ${
            customerError?.message || "저장 실패"
          }`
        );
      }

      // 2. 설문 응답 처리
      const responsesToProcess = Object.values(answers)
        .filter(
          (ans) =>
            (ans.response_text && ans.response_text.trim() !== "") ||
            (ans.selected_option_ids && ans.selected_option_ids.length > 0) ||
            typeof ans.rating === "number"
        )
        .map((ans) => {
          const question = survey!.questions.find(
            (q) => q.id === ans.question_id
          );
          const requiredQuestionCategory = question?.required_question_category;

          const responseData: any = {
            survey_id: surveyId,
            question_id: ans.question_id,
            user_id: userId,
            customer_info_id: customerData[0].id,
            required_question_category: requiredQuestionCategory || null,
          };
          if (ans.response_text?.trim()) {
            responseData.response_text = ans.response_text.trim();
          }
          if (ans.selected_option_ids?.length) {
            responseData.selected_option = ans.selected_option_ids[0];
            responseData.selected_options = ans.selected_option_ids;
          }
          if (typeof ans.rating === "number") {
            responseData.rating = ans.rating;
          }
          return responseData;
        });

      // 3. 기존 응답 삭제
      const { error: deleteError } = await supabase
        .from("responses")
        .delete()
        .eq("customer_info_id", customerData[0].id);
      if (deleteError) {
        console.warn("기존 응답 삭제 중 오류:", deleteError);
      }

      // 4. 새 응답 삽입
      if (responsesToProcess.length > 0) {
        const { error: insertError } = await supabase
          .from("responses")
          .insert(responsesToProcess)
          .select();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-600" />
          <p className="text-gray-600">설문지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-sm w-full">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">설문 완료!</h1>
          <p className="text-gray-600 mb-6">소중한 의견 감사합니다.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-sm w-full">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-6">
            {error || "설문을 찾을 수 없습니다."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Progress Bar */}
      {showStickyProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">{survey.title}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div ref={headerRef} className="bg-white rounded-lg p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="text-gray-600 text-sm mb-4">{survey.description}</p>
          )}

          {/* Progress */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
              <div>
                <p className="text-red-800 text-sm font-medium">오류 발생</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.questions.map((question, index) => {
            const isAnswered = () => {
              const answer = answers[question.id];
              // 포커스된 텍스트 질문은 완료로 처리하지 않음
              if (
                question.type === "textarea" &&
                focusedQuestionId === question.id
              ) {
                return false;
              }
              return (
                (answer?.response_text && answer.response_text.trim()) ||
                (answer?.selected_option_ids &&
                  answer.selected_option_ids.length > 0) ||
                typeof answer?.rating === "number"
              );
            };

            return (
              <div
                key={question.id}
                id={`question-${question.id}`}
                className={`rounded-lg p-5 transition-all duration-300 ${
                  isAnswered()
                    ? "bg-gray-200 opacity-70"
                    : "bg-white ring-1 ring-gray-200 shadow-sm"
                }`}
              >
                {/* Question Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`inline-block px-3 py-1 text-md font-medium rounded-full ${
                        isAnswered()
                          ? "bg-gray-300 text-gray-600"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {question.required && (
                      <span className="text-red-500 text-sm">필수</span>
                    )}
                  </div>
                  <h3
                    className={`text-xl leading-7 break-keep  font-semibold transition-colors duration-300 ${
                      isAnswered() ? "text-gray-600" : "text-gray-900"
                    }`}
                  >
                    {question.text}
                  </h3>
                </div>

                {/* Question Content */}
                <div>
                  {question.type === "textarea" && (
                    <div>
                      <textarea
                        rows={4}
                        className={`w-full p-3 rounded-lg resize-none transition-all duration-300 ${
                          isAnswered()
                            ? "border-0 bg-gray-300 text-gray-600"
                            : "border border-gray-300 bg-white focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        }`}
                        placeholder="답변을 입력해주세요"
                        value={answers[question.id]?.response_text || ""}
                        onChange={(e) =>
                          handleAnswerChange(
                            question.id,
                            e.target.value,
                            question.type
                          )
                        }
                        onFocus={() => setFocusedQuestionId(question.id)}
                        onBlur={() => setFocusedQuestionId(null)}
                        required={question.required}
                      />
                    </div>
                  )}

                  {question.type === "select" && question.options && (
                    <div className="space-y-3">
                      {question.options.map((option) => {
                        const isSelected = question.isMultiSelect
                          ? (
                              answers[question.id]?.selected_option_ids || []
                            ).includes(option.id)
                          : answers[question.id]?.selected_option_ids?.[0] ===
                            option.id;

                        return (
                          <label
                            key={option.id}
                            className={`block p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                              isAnswered()
                                ? isSelected
                                  ? "bg-blue-100 border-0"
                                  : "bg-gray-300 border-0"
                                : isSelected
                                ? "border border-gray-900 bg-gray-50"
                                : "border border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type={
                                  question.isMultiSelect ? "checkbox" : "radio"
                                }
                                name={`question-${question.id}`}
                                value={option.id}
                                checked={isSelected}
                                onChange={() =>
                                  handleAnswerChange(
                                    question.id,
                                    option.id,
                                    question.type,
                                    question.isMultiSelect,
                                    option.id
                                  )
                                }
                                className="mr-3"
                                required={
                                  question.required &&
                                  !question.isMultiSelect &&
                                  !answers[question.id]?.selected_option_ids
                                    ?.length
                                }
                              />
                              <span
                                className={`transition-colors duration-300 ${
                                  isAnswered()
                                    ? isSelected
                                      ? "text-blue-700 font-medium"
                                      : "text-gray-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {option.text}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.type === "rating" && (
                    <div>
                      {/* Rating Labels: This specific div for labels should always render if question.type is 'rating' */}
                      <div
                        className={`flex justify-between text-sm mb-4 px-0 transition-colors duration-300 ${
                          isAnswered() ? "text-gray-500" : "text-gray-600"
                        }`}
                      >
                        <span>
                          {question.rating_min_label || "매우 불만족"}
                        </span>
                        <span>{question.rating_max_label || "매우 만족"}</span>
                      </div>

                      {/* Rating Options */}
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from(
                          { length: question.maxRating || 5 },
                          (_, i) => i + 1
                        ).map((ratingValue) => {
                          const isSelected =
                            answers[question.id]?.rating === ratingValue;
                          return (
                            <label
                              key={ratingValue}
                              className={`block p-4 rounded-lg text-center cursor-pointer transition-all duration-300 ${
                                isAnswered()
                                  ? isSelected
                                    ? "bg-gray-500 border-0"
                                    : "bg-gray-300 border-0"
                                  : isSelected
                                  ? "border border-gray-900 bg-gray-100"
                                  : "border border-gray-300 bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={ratingValue}
                                checked={isSelected}
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
                                  typeof answers[question.id]?.rating !==
                                    "number"
                                }
                              />
                              <div
                                className={`text-lg font-bold transition-colors duration-300 ${
                                  isAnswered()
                                    ? isSelected
                                      ? "text-white"
                                      : "text-gray-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {ratingValue}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Submit Button */}
          <div className="rounded-lg p-6">
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  제출 중...
                </div>
              ) : (
                `설문 완료`
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Customer Info Modal */}
      {showCustomerInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  정보 입력
                </h3>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                왜 이런 정보를 수집하나요?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                더 나은 맞춤 서비스를 제공하기 위해 어떤 고객님들이 참여하고
                피드백을 주셨는지 확인하기 위해 필요해요.
              </p>
            </div>

            <form onSubmit={handleCustomerInfoSubmit} className="p-6 space-y-6">
              {customerInfoError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{customerInfoError}</p>
                </div>
              )}

              {/* Age Group */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  연령대 <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerInfo.age_group}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      age_group: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200"
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

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  성별 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["남성", "여성", "답변안함"].map((gender) => (
                    <label
                      key={gender}
                      className={`p-4 border rounded-lg text-center cursor-pointer text-sm font-medium transition-all duration-200 ${
                        customerInfo.gender === gender
                          ? "border-gray-900 bg-gray-100 text-gray-900"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
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
                        className="sr-only"
                        required
                        disabled={submitting}
                      />
                      {gender}
                    </label>
                  ))}
                </div>
              </div>

              {/* Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  이름 <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200"
                  placeholder="이름을 입력해주세요"
                  disabled={submitting}
                />
              </div>

              {/* Phone (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  전화번호{" "}
                  <span className="text-gray-500 text-xs">(선택사항)</span>
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200"
                  placeholder="010-1234-5678"
                  disabled={submitting}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerInfoModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium disabled:opacity-50 transition-all duration-200"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      제출 중
                    </div>
                  ) : (
                    "완료"
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
