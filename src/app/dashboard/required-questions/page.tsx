"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Square,
  Star,
  Edit,
  Save,
  X,
  AlertCircle,
  Settings,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface QuestionOptions {
  required?: boolean;
  maxRating?: number;
  rating_min_label?: string;
  rating_max_label?: string;
  choices_text?: string[];
  choice_ids?: string[];
  isMultiSelect?: boolean;
}

interface RequiredQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: QuestionOptions;
  category: string;
  description: string;
  is_active: boolean;
  order_num: number;
  created_at: string;
  updated_at: string;
}

interface UserRequiredQuestion {
  id: string;
  user_id: string;
  required_question_id: string;
  is_enabled: boolean;
  required_questions: RequiredQuestion;
}

export default function RequiredQuestionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRequiredQuestions, setUserRequiredQuestions] = useState<
    UserRequiredQuestion[]
  >([]);
  const [availableQuestions, setAvailableQuestions] = useState<
    RequiredQuestion[]
  >([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    question_text: "",
    description: "",
    question_type: "rating",
    rating_min_label: "",
    rating_max_label: "",
    choices_text: [""],
  });

  const router = useRouter();

  // 카테고리 라벨 번역
  const getCategoryLabel = (category: string) => {
    const categoryLabels = {
      revisit_intention: "재방문의사",
      recommendation: "추천의사",
      overall_satisfaction: "전반적 만족도",
      visit_frequency: "방문빈도",
      service_quality: "서비스 품질",
      value_for_money: "가격 대비 만족도",
      customer_service: "고객 서비스",
      cleanliness: "청결도",
      accessibility: "접근성",
      waiting_time: "대기시간",
      food_quality: "음식 품질",
      food_portion: "음식 양",
      atmosphere: "매장 분위기",
      menu_variety: "메뉴 다양성",
      payment_convenience: "결제 편의성",
      custom: "기타",
    };
    return categoryLabels[category as keyof typeof categoryLabels] || category;
  };

  // 카테고리별 기본값 정의
  const categoryDefaults = {
    revisit_intention: {
      question_text: "저희 가게에 다시 방문하실 의향이 있나요?",
      description: "고객의 재방문 의사를 측정하여 고객 충성도를 파악합니다",
      rating_min_label: "전혀 없음",
      rating_max_label: "매우 높음",
    },
    recommendation: {
      question_text: "주변 지인들에게 저희 가게를 추천하고 싶으신가요?",
      description:
        "고객이 타인에게 추천할 의향을 측정하여 구전 마케팅 효과를 예측합니다",
      rating_min_label: "절대 추천 안함",
      rating_max_label: "적극 추천",
    },
    overall_satisfaction: {
      question_text: "전반적으로 저희 가게에 얼마나 만족하셨나요?",
      description: "전체적인 고객 만족도를 종합적으로 측정합니다",
      rating_min_label: "매우 불만족",
      rating_max_label: "매우 만족",
    },
    visit_frequency: {
      question_text: "이 가게를 얼마나 자주 이용하시나요?",
      description:
        "고객의 방문 빈도를 파악하여 충성도와 재방문 패턴을 분석합니다",
      rating_min_label: "",
      rating_max_label: "",
    },
    service_quality: {
      question_text: "저희 가게의 서비스 품질은 어떠셨나요?",
      description: "직원 서비스의 전문성과 친절도를 평가합니다",
      rating_min_label: "매우 나쁨",
      rating_max_label: "매우 좋음",
    },
    value_for_money: {
      question_text: "가격 대비 만족도는 어떠신가요?",
      description: "지불한 금액 대비 받은 가치에 대한 만족도를 측정합니다",
      rating_min_label: "매우 비쌈",
      rating_max_label: "매우 합리적",
    },
    customer_service: {
      question_text: "직원들의 고객 응대는 어떠셨나요?",
      description: "직원의 친절도, 응대 속도, 전문성을 종합 평가합니다",
      rating_min_label: "매우 불친절",
      rating_max_label: "매우 친절",
    },
    cleanliness: {
      question_text: "매장의 청결 상태는 어떠셨나요?",
      description: "매장과 시설의 청결 상태를 평가합니다",
      rating_min_label: "매우 더러움",
      rating_max_label: "매우 깨끗함",
    },
    accessibility: {
      question_text: "가게 위치의 접근성은 어떠셨나요?",
      description: "가게 위치, 교통편, 주차 등의 접근성을 평가합니다",
      rating_min_label: "매우 불편",
      rating_max_label: "매우 편리",
    },
    waiting_time: {
      question_text: "주문부터 음식이 나오기까지의 대기시간은 어떠셨나요?",
      description: "서비스 속도와 대기시간에 대한 고객 만족도를 측정합니다",
      rating_min_label: "너무 오래 걸림",
      rating_max_label: "매우 빠름",
    },
    food_quality: {
      question_text: "음식의 맛과 품질은 어떠셨나요?",
      description: "음식의 맛, 신선도, 품질을 종합적으로 평가합니다",
      rating_min_label: "매우 실망스러움",
      rating_max_label: "매우 맛있음",
    },
    food_portion: {
      question_text: "음식의 양은 어떠셨나요?",
      description: "제공된 음식의 양에 대한 만족도를 측정합니다",
      rating_min_label: "너무 적음",
      rating_max_label: "충분함",
    },
    atmosphere: {
      question_text: "매장의 분위기는 어떠셨나요?",
      description:
        "매장의 인테리어, 음악, 조명 등 전반적인 분위기를 평가합니다",
      rating_min_label: "매우 불쾌함",
      rating_max_label: "매우 좋음",
    },
    menu_variety: {
      question_text: "메뉴의 다양성은 어떠셨나요?",
      description: "메뉴의 종류와 선택권의 다양성을 평가합니다",
      rating_min_label: "매우 부족함",
      rating_max_label: "매우 다양함",
    },
    payment_convenience: {
      question_text: "결제 방법이 얼마나 편리하셨나요?",
      description: "고객이 선호하는 결제 방법을 파악합니다",
      rating_min_label: "매우 불편",
      rating_max_label: "매우 편리",
    },
    custom: {
      question_text: "",
      description: "",
      rating_min_label: "매우 불만족",
      rating_max_label: "매우 만족",
    },
  };

  // 편집 모드에서 카테고리 변경 처리 함수
  const handleEditCategoryChange = (category: string) => {
    const defaults =
      categoryDefaults[category as keyof typeof categoryDefaults];
    if (defaults && category !== "custom") {
      setEditForm({
        ...editForm,
        question_text: defaults.question_text,
        description: defaults.description,
        rating_min_label: defaults.rating_min_label,
        rating_max_label: defaults.rating_max_label,
        question_type:
          category === "visit_frequency" ? "single_choice" : "rating",
        choices_text:
          category === "visit_frequency"
            ? [
                "이번이 처음",
                "1년에 1-2번",
                "몇 달에 한 번",
                "한 달에 1-2번",
                "주 1-2회",
                "거의 매일",
              ]
            : [""],
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error or no session:", sessionError?.message);
        router.push("/auth");
        setLoading(false);
        return;
      }

      try {
        // 모든 필수 질문 조회 (활성화된 질문만)
        const { data: allQuestions, error: allError } = await supabase
          .from("required_questions")
          .select("*")
          .eq("is_active", true)
          .order("order_num");

        if (allError) {
          console.error("Error fetching required questions:", allError);
          setLoading(false);
          return;
        }

        setAvailableQuestions(allQuestions || []);

        // 사용자의 필수 질문 설정 조회
        const { data: userQuestions, error: userQuestionsError } = await supabase
          .from("user_required_questions")
          .select("*")
          .eq("user_id", session.user.id);

        if (userQuestionsError) {
          console.error("Error fetching user questions:", userQuestionsError);
        }

        const existingQuestionIds = new Set(
          (userQuestions || []).map((uq) => uq.required_question_id)
        );

        // 아직 설정하지 않은 질문들을 자동으로 추가 (모든 질문을 사용자 설정에 포함)
        const newQuestions = (allQuestions || [])
          .filter((q) => !existingQuestionIds.has(q.id))
          .map((q) => ({
            user_id: session.user.id,
            required_question_id: q.id,
            is_enabled: q.is_active, // 기본 활성화 상태를 따름
          }));

        if (newQuestions.length > 0) {
          await supabase.from("user_required_questions").insert(newQuestions);
        }

        // 업데이트된 사용자 질문 설정 조회
        const { data: finalUserQuestions, error: finalError } = await supabase
          .from("user_required_questions")
          .select(
            `
            *,
            required_questions!inner(*)
          `
          )
          .eq("user_id", session.user.id)
          .eq("required_questions.is_active", true);

        if (finalError) {
          console.error("Error fetching final user questions:", finalError);
        } else {
          setUserRequiredQuestions(finalUserQuestions || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const toggleQuestion = async (
    userQuestionId: string,
    currentState: boolean
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_required_questions")
        .update({ is_enabled: !currentState })
        .eq("id", userQuestionId);

      if (error) {
        console.error("Error updating question:", error);
        alert("설정 변경 중 오류가 발생했습니다.");
      } else {
        setUserRequiredQuestions((prev) =>
          prev.map((uq) =>
            uq.id === userQuestionId ? { ...uq, is_enabled: !currentState } : uq
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
      alert("설정 변경 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  const startEditing = (question: RequiredQuestion) => {
    setEditingQuestion(question.id);
    setEditForm({
      question_text: question.question_text,
      description: question.description,
      question_type: question.question_type,
      rating_min_label: question.options?.rating_min_label || "",
      rating_max_label: question.options?.rating_max_label || "",
      choices_text: question.options?.choices_text || [""],
    });
  };

  const saveEdit = async () => {
    if (!editingQuestion) return;

    setSaving(true);
    try {
      let updatedOptions: QuestionOptions = {};

      // 질문 유형에 따라 옵션 설정
      if (editForm.question_type === "rating") {
        updatedOptions = {
          required: false,
          maxRating: 5,
          rating_min_label: editForm.rating_min_label,
          rating_max_label: editForm.rating_max_label,
        };
      } else if (editForm.question_type === "single_choice") {
        updatedOptions = {
          choices_text: editForm.choices_text.filter(
            (choice) => choice.trim() !== ""
          ),
          choice_ids: editForm.choices_text
            .filter((choice) => choice.trim() !== "")
            .map((_, index) => `choice_${index + 1}`),
          isMultiSelect: false,
        };
      } else if (editForm.question_type === "text") {
        updatedOptions = {
          required: false,
        };
      }

      const { error } = await supabase
        .from("required_questions")
        .update({
          question_text: editForm.question_text,
          question_type: editForm.question_type,
          description: editForm.description,
          options: updatedOptions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingQuestion);

      if (error) {
        console.error("Error updating question:", error);
        alert("질문 수정 중 오류가 발생했습니다.");
      } else {
        // 로컬 상태 업데이트
        setAvailableQuestions((prev) =>
          prev.map((q) =>
            q.id === editingQuestion
              ? {
                  ...q,
                  question_text: editForm.question_text,
                  question_type: editForm.question_type,
                  description: editForm.description,
                  options: updatedOptions,
                }
              : q
          )
        );

        setUserRequiredQuestions((prev) =>
          prev.map((uq) =>
            uq.required_questions.id === editingQuestion
              ? {
                  ...uq,
                  required_questions: {
                    ...uq.required_questions,
                    question_text: editForm.question_text,
                    question_type: editForm.question_type,
                    description: editForm.description,
                    options: updatedOptions,
                  },
                }
              : uq
          )
        );

        setEditingQuestion(null);
        setEditForm({
          question_text: "",
          description: "",
          question_type: "rating",
          rating_min_label: "",
          rating_max_label: "",
          choices_text: [""],
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("질문 수정 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <EmptyState
          icon={({ className }) => (
            <CheckSquare
              className={`${className} animate-pulse text-green-600`}
            />
          )}
          title="필수 질문 설정을 불러오는 중..."
          description="잠시만 기다려 주세요."
          variant="default"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">필수 질문 설정</h1>
          <p className="text-gray-600 mt-2">
            모든 설문에 자동으로 포함될 필수 질문들을 선택하고 수정하세요.
          </p>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                필수 질문 관리 방법
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                • <strong>토글 스위치</strong>로 질문을 포함/제외할 수 있습니다
                <br />• <strong>수정 버튼</strong>으로 질문 내용과 설명을 변경할
                수 있습니다
                <br />• 기본적으로{" "}
                <strong>
                  재방문의사, 추천의사, 전반적 만족도, 방문빈도
                </strong>{" "}
                질문이 활성화되어 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckSquare className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  활성화된 질문
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {userRequiredQuestions.filter((q) => q.is_enabled).length}개
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <Square className="h-5 w-5 text-gray-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  비활성화된 질문
                </p>
                <p className="text-2xl font-bold text-gray-600">
                  {userRequiredQuestions.filter((q) => !q.is_enabled).length}개
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800">전체 질문</p>
                <p className="text-2xl font-bold text-blue-600">
                  {userRequiredQuestions.length}개
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 필수 질문 목록 */}
        <div className="space-y-4">
          {userRequiredQuestions
            .sort(
              (a, b) =>
                a.required_questions.order_num - b.required_questions.order_num
            )
            .map((userQuestion) => {
              const question = userQuestion.required_questions;
              const isEditing = editingQuestion === question.id;

              return (
                <div
                  key={userQuestion.id}
                  className={`bg-white border rounded-lg p-6 transition-all duration-200 ${
                    userQuestion.is_enabled
                      ? "border-green-200 shadow-sm"
                      : "border-gray-200 bg-gray-50 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Switch 토글 */}
                      <div className="flex flex-col items-center space-y-3">
                        <button
                          onClick={() =>
                            toggleQuestion(
                              userQuestion.id,
                              userQuestion.is_enabled
                            )
                          }
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                            userQuestion.is_enabled
                              ? "bg-green-600"
                              : "bg-gray-300"
                          } ${
                            saving
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          title={
                            userQuestion.is_enabled
                              ? "클릭하여 설문에서 제외"
                              : "클릭하여 설문에 포함"
                          }
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              userQuestion.is_enabled
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>

                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full transition-colors duration-200 ${
                            userQuestion.is_enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {userQuestion.is_enabled ? "포함" : "비포함"}
                        </span>
                      </div>

                      {/* 질문 내용 */}
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                카테고리 변경{" "}
                                <span className="text-xs text-gray-500">
                                  (변경하면 질문이 자동으로 설정됩니다)
                                </span>
                              </label>
                              <select
                                value={question.category}
                                onChange={(e) =>
                                  handleEditCategoryChange(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                              >
                                <option value="revisit_intention">
                                  재방문의사
                                </option>
                                <option value="recommendation">추천의사</option>
                                <option value="overall_satisfaction">
                                  전반적 만족도
                                </option>
                                <option value="visit_frequency">
                                  방문빈도
                                </option>
                                <option value="service_quality">
                                  서비스 품질
                                </option>
                                <option value="value_for_money">
                                  가격 대비 만족도
                                </option>
                                <option value="customer_service">
                                  고객 서비스
                                </option>
                                <option value="cleanliness">청결도</option>
                                <option value="accessibility">접근성</option>
                                <option value="waiting_time">대기시간</option>
                                <option value="food_quality">음식 품질</option>
                                <option value="food_portion">음식 양</option>
                                <option value="atmosphere">매장 분위기</option>
                                <option value="menu_variety">
                                  메뉴 다양성
                                </option>
                                <option value="payment_convenience">
                                  결제 편의성
                                </option>
                                <option value="custom">기타</option>
                              </select>
                            </div>
                            <input
                              type="text"
                              value={editForm.question_text}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  question_text: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="질문 내용"
                            />
                            <textarea
                              value={editForm.description}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  description: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              rows={2}
                              placeholder="설명"
                            />

                            {/* 질문 유형 선택 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                질문 유형
                              </label>
                              <select
                                value={editForm.question_type}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    question_type: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                              >
                                <option value="rating">별점 (1-5점)</option>
                                <option value="single_choice">객관식</option>
                                <option value="text">주관식</option>
                              </select>
                            </div>
                            {/* 질문 유형별 옵션 설정 */}
                            {editForm.question_type === "rating" && (
                              <div className="space-y-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                                      value={editForm.rating_min_label}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          rating_min_label: e.target.value,
                                        })
                                      }
                                      placeholder="예: 매우 불만족"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      5점 기준 (최대값)
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.rating_max_label}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          rating_max_label: e.target.value,
                                        })
                                      }
                                      placeholder="예: 매우 만족"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {editForm.question_type === "single_choice" && (
                              <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs text-gray-600 font-medium">
                                    객관식 선택지 설정
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditForm({
                                        ...editForm,
                                        choices_text: [
                                          ...editForm.choices_text,
                                          "",
                                        ],
                                      });
                                    }}
                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                  >
                                    + 선택지 추가
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {editForm.choices_text.map(
                                    (choice, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center space-x-2"
                                      >
                                        <span className="text-xs text-gray-500 w-6">
                                          {index + 1}.
                                        </span>
                                        <input
                                          type="text"
                                          value={choice}
                                          onChange={(e) => {
                                            const newChoices = [
                                              ...editForm.choices_text,
                                            ];
                                            newChoices[index] = e.target.value;
                                            setEditForm({
                                              ...editForm,
                                              choices_text: newChoices,
                                            });
                                          }}
                                          placeholder={`선택지 ${index + 1}`}
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                        {editForm.choices_text.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newChoices =
                                                editForm.choices_text.filter(
                                                  (_, i) => i !== index
                                                );
                                              setEditForm({
                                                ...editForm,
                                                choices_text: newChoices,
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {editForm.question_type === "text" && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700">
                                  주관식 질문은 별도 설정이 필요하지 않습니다.
                                  고객이 자유롭게 텍스트로 답변할 수 있습니다.
                                </p>
                              </div>
                            )}
                            <div className="flex space-x-2">
                              <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQuestion(null);
                                  setEditForm({
                                    question_text: "",
                                    description: "",
                                    question_type: "rating",
                                    rating_min_label: "",
                                    rating_max_label: "",
                                    choices_text: [""],
                                  });
                                }}
                                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3
                                className={`text-lg font-medium ${
                                  userQuestion.is_enabled
                                    ? "text-gray-900"
                                    : "text-gray-500"
                                }`}
                              >
                                {question.question_text}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                  userQuestion.is_enabled
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                {question.question_type === "rating"
                                  ? "별점"
                                  : question.question_type === "single_choice"
                                  ? "객관식"
                                  : "주관식"}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                  userQuestion.is_enabled
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {getCategoryLabel(question.category)}
                              </span>

                              {!userQuestion.is_enabled && (
                                <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  설문에서 제외됨
                                </span>
                              )}
                            </div>
                            {question.description && (
                              <p
                                className={`text-sm mb-3 ${
                                  userQuestion.is_enabled
                                    ? "text-gray-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {question.description}
                              </p>
                            )}
                            {/* 질문 타입별 미리보기 */}
                            {question.question_type === "rating" &&
                              question.options?.rating_min_label && (
                                <div
                                  className={`border rounded-lg p-3 mb-3 ${
                                    userQuestion.is_enabled
                                      ? "bg-yellow-50 border-yellow-200"
                                      : "bg-gray-50 border-gray-200"
                                  }`}
                                >
                                  <div
                                    className={`flex justify-between items-center text-sm ${
                                      userQuestion.is_enabled
                                        ? "text-yellow-800"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    <span>
                                      <strong>1점:</strong>{" "}
                                      {question.options.rating_min_label}
                                    </span>
                                    <span>
                                      <strong>5점:</strong>{" "}
                                      {question.options.rating_max_label}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {question.question_type === "single_choice" &&
                              question.options?.choices_text && (
                                <div
                                  className={`border rounded-lg p-3 mb-3 ${
                                    userQuestion.is_enabled
                                      ? "bg-blue-50 border-blue-200"
                                      : "bg-gray-50 border-gray-200"
                                  }`}
                                >
                                  <div
                                    className={`text-sm ${
                                      userQuestion.is_enabled
                                        ? "text-blue-800"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    <strong>선택지:</strong>
                                    <div className="mt-1 grid grid-cols-1 gap-1">
                                      {question.options.choices_text.map(
                                        (choice: string, index: number) => (
                                          <span key={index} className="text-xs">
                                            {index + 1}. {choice}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {question.question_type === "text" && (
                              <div
                                className={`border rounded-lg p-3 mb-3 ${
                                  userQuestion.is_enabled
                                    ? "bg-green-50 border-green-200"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <p
                                  className={`text-sm ${
                                    userQuestion.is_enabled
                                      ? "text-green-800"
                                      : "text-gray-500"
                                  }`}
                                >
                                  <strong>주관식:</strong> 고객이 자유롭게
                                  텍스트로 답변
                                </p>
                              </div>
                            )}
                            <div
                              className={`flex items-center space-x-4 text-xs ${
                                userQuestion.is_enabled
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }`}
                            >
                              <span>순서: {question.order_num}</span>
                              <span>
                                생성일:{" "}
                                {new Date(
                                  question.created_at
                                ).toLocaleDateString("ko-KR")}
                              </span>
                              {userQuestion.is_enabled ? (
                                <span className="text-green-600 font-medium">
                                  ✓ 새 설문에 자동 포함됨
                                </span>
                              ) : (
                                <span className="text-red-500 font-medium">
                                  ✗ 새 설문에서 제외됨
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    {!isEditing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditing(question)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          title="질문 수정"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* 통계 정보 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            필수질문 현황
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 필수질문</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userRequiredQuestions.length}개
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">포함된 질문</p>
                  <p className="text-2xl font-bold text-green-700">
                    {userRequiredQuestions.filter((uq) => uq.is_enabled).length}
                    개
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    새 설문에 포함됨
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">제외된 질문</p>
                  <p className="text-2xl font-bold text-red-700">
                    {
                      userRequiredQuestions.filter((uq) => !uq.is_enabled)
                        .length
                    }
                    개
                  </p>
                  <p className="text-xs text-red-600 mt-1">설문에서 제외됨</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Square className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {userRequiredQuestions.filter((uq) => !uq.is_enabled).length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm">
                  <p className="text-yellow-800 font-medium">알림</p>
                  <p className="text-yellow-700">
                    제외된 질문은 새로운 설문 생성 시 포함되지 않습니다. 필요한
                    경우 위의 스위치를 켜서 포함시켜 주세요.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
