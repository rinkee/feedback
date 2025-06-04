"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User as AuthUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Square,
  Star,
  Edit,
  Plus,
  Save,
  X,
  AlertCircle,
  Trash2,
  Settings,
} from "lucide-react";

interface RequiredQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
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
  const [user, setUser] = useState<AuthUser | null>(null);
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
    rating_min_label: "",
    rating_max_label: "",
  });

  // 모달 상태들
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] =
    useState<RequiredQuestion | null>(null);

  const [newQuestionForm, setNewQuestionForm] = useState({
    question_text: "",
    description: "",
    category: "",
    question_type: "rating",
    rating_min_label: "",
    rating_max_label: "",
  });

  const router = useRouter();

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
    product_quality: {
      question_text: "제품/음식의 품질은 어떠셨나요?",
      description: "제공된 제품이나 음식의 맛, 신선도, 품질을 평가합니다",
      rating_min_label: "매우 나쁨",
      rating_max_label: "매우 좋음",
    },
    custom: {
      question_text: "",
      description: "",
      rating_min_label: "매우 불만족",
      rating_max_label: "매우 만족",
    },
  };

  // 카테고리 변경 처리 함수
  const handleCategoryChange = (category: string) => {
    const defaults =
      categoryDefaults[category as keyof typeof categoryDefaults];
    if (defaults) {
      setNewQuestionForm({
        ...newQuestionForm,
        category,
        question_text: defaults.question_text,
        description: defaults.description,
        rating_min_label: defaults.rating_min_label,
        rating_max_label: defaults.rating_max_label,
      });
    }
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

      setUser(session.user);

      try {
        // 사용자의 필수 질문 설정 조회 (활성화된 질문만)
        const { data: userQuestions, error: userError } = await supabase
          .from("user_required_questions")
          .select(
            `
            *,
            required_questions!inner(*)
          `
          )
          .eq("user_id", session.user.id)
          .eq("required_questions.is_active", true);

        if (userError) {
          console.error("Error fetching user required questions:", userError);
        } else {
          setUserRequiredQuestions(userQuestions || []);
        }

        // 모든 활성 필수 질문 조회
        const { data: allQuestions, error: allError } = await supabase
          .from("required_questions")
          .select("*")
          .eq("is_active", true)
          .order("order_num");

        if (allError) {
          console.error("Error fetching required questions:", allError);
        } else {
          setAvailableQuestions(allQuestions || []);

          // 사용자가 아직 설정하지 않은 질문들을 자동으로 추가
          const existingQuestionIds = new Set(
            (userQuestions || []).map((uq) => uq.required_question_id)
          );

          const newQuestions = (allQuestions || [])
            .filter((q) => !existingQuestionIds.has(q.id))
            .map((q) => ({
              user_id: session.user.id,
              required_question_id: q.id,
              is_enabled: true, // 새로운 질문은 기본적으로 활성화
            }));

          if (newQuestions.length > 0) {
            const { error: insertError } = await supabase
              .from("user_required_questions")
              .insert(newQuestions);

            if (!insertError) {
              // 다시 조회하여 업데이트
              const { data: updatedUserQuestions } = await supabase
                .from("user_required_questions")
                .select(
                  `
                  *,
                  required_questions!inner(*)
                `
                )
                .eq("user_id", session.user.id)
                .eq("required_questions.is_active", true);

              setUserRequiredQuestions(updatedUserQuestions || []);
            }
          }
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
      rating_min_label: question.options?.rating_min_label || "",
      rating_max_label: question.options?.rating_max_label || "",
    });
  };

  const saveEdit = async () => {
    if (!editingQuestion) return;

    setSaving(true);
    try {
      const question = availableQuestions.find((q) => q.id === editingQuestion);
      const updatedOptions = { ...question?.options };

      if (question?.question_type === "rating") {
        updatedOptions.rating_min_label = editForm.rating_min_label;
        updatedOptions.rating_max_label = editForm.rating_max_label;
      }

      const { error } = await supabase
        .from("required_questions")
        .update({
          question_text: editForm.question_text,
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
          rating_min_label: "",
          rating_max_label: "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("질문 수정 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  const addNewQuestion = async () => {
    if (!newQuestionForm.question_text || !newQuestionForm.category) {
      alert("질문 내용과 카테고리를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      let options: any = { maxRating: 5, required: true };

      if (newQuestionForm.question_type === "rating") {
        options = {
          ...options,
          rating_min_label: newQuestionForm.rating_min_label || "매우 불만족",
          rating_max_label: newQuestionForm.rating_max_label || "매우 만족",
        };
      }

      // 새 필수 질문 생성
      const { data: newQuestion, error: insertError } = await supabase
        .from("required_questions")
        .insert({
          question_text: newQuestionForm.question_text,
          question_type: newQuestionForm.question_type,
          options: options,
          category: newQuestionForm.category,
          description: newQuestionForm.description,
          order_num: availableQuestions.length + 1,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating question:", insertError);
        alert("질문 생성 중 오류가 발생했습니다.");
        setSaving(false);
        return;
      }

      // 현재 사용자의 설정에 추가
      const { data: userQuestion } = await supabase
        .from("user_required_questions")
        .insert({
          user_id: user!.id,
          required_question_id: newQuestion.id,
          is_enabled: true,
        })
        .select(
          `
          *,
          required_questions(*)
        `
        )
        .single();

      if (userQuestion) {
        setUserRequiredQuestions((prev) => [...prev, userQuestion]);
      }

      setAvailableQuestions((prev) => [...prev, newQuestion]);
      setShowAddModal(false);
      setNewQuestionForm({
        question_text: "",
        description: "",
        category: "",
        question_type: "rating",
        rating_min_label: "",
        rating_max_label: "",
      });
    } catch (error) {
      console.error("Error:", error);
      alert("질문 생성 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  const confirmDelete = (question: RequiredQuestion) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  };

  const deleteQuestion = async () => {
    if (!questionToDelete) return;

    setSaving(true);
    try {
      // 필수질문을 비활성화 (완전 삭제하지 않음)
      const { error } = await supabase
        .from("required_questions")
        .update({ is_active: false })
        .eq("id", questionToDelete.id);

      if (error) {
        console.error("Error deleting question:", error);
        alert("질문 삭제 중 오류가 발생했습니다.");
      } else {
        // 로컬 상태에서 제거
        setAvailableQuestions((prev) =>
          prev.filter((q) => q.id !== questionToDelete.id)
        );
        setUserRequiredQuestions((prev) =>
          prev.filter((uq) => uq.required_question_id !== questionToDelete.id)
        );

        setShowDeleteModal(false);
        setQuestionToDelete(null);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("질문 삭제 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <CheckSquare className="h-8 w-8 animate-pulse text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">필수 질문 설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">필수 질문 설정</h1>
            <p className="text-gray-600 mt-2">
              모든 설문에 자동으로 포함될 필수 질문들을 관리합니다.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />새 필수 질문 추가
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                필수 질문이란?
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                필수 질문은 모든 설문에 자동으로 포함되며, 삭제할 수 없습니다.
                재방문의사, 추천의사 등 통계 분석에 필수적인 질문들을
                설정하세요.
              </p>
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
                                <option value="service_quality">
                                  서비스 품질
                                </option>
                                <option value="value_for_money">
                                  가격 대비 만족도
                                </option>
                                <option value="customer_service">
                                  고객 서비스
                                </option>
                                <option value="product_quality">
                                  제품 품질
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
                            {question.question_type === "rating" && (
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
                                    rating_min_label: "",
                                    rating_max_label: "",
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
                                  : "텍스트"}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                  userQuestion.is_enabled
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {question.category}
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
                        <button
                          onClick={() => confirmDelete(question)}
                          className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="질문 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* 새 질문 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  새 필수 질문 추가
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 *{" "}
                  <span className="text-xs text-gray-500">
                    (선택하면 적합한 질문이 자동으로 설정됩니다)
                  </span>
                </label>
                <select
                  value={newQuestionForm.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">카테고리를 선택해주세요</option>
                  <option value="revisit_intention">재방문의사</option>
                  <option value="recommendation">추천의사</option>
                  <option value="overall_satisfaction">전반적 만족도</option>
                  <option value="service_quality">서비스 품질</option>
                  <option value="value_for_money">가격 대비 만족도</option>
                  <option value="customer_service">고객 서비스</option>
                  <option value="product_quality">제품 품질</option>
                  <option value="custom">기타 (직접 입력)</option>
                </select>

                {/* {newQuestionForm.category &&
                  newQuestionForm.category !== "custom" && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start">
                        <CheckSquare className="h-4 w-4 text-green-600 mt-0.5 mr-2" />
                        <div className="text-sm">
                          <p className="text-green-800 font-medium">
                            자동 설정된 내용:
                          </p>
                          <p className="text-green-700 mt-1">
                            <strong>질문:</strong>{" "}
                            {
                              categoryDefaults[
                                newQuestionForm.category as keyof typeof categoryDefaults
                              ]?.question_text
                            }
                          </p>
                          <p className="text-green-700 mt-1">
                            <strong>척도:</strong>{" "}
                            {
                              categoryDefaults[
                                newQuestionForm.category as keyof typeof categoryDefaults
                              ]?.rating_min_label
                            }{" "}
                            →{" "}
                            {
                              categoryDefaults[
                                newQuestionForm.category as keyof typeof categoryDefaults
                              ]?.rating_max_label
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )} */}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  질문 내용 *
                </label>
                <input
                  type="text"
                  value={newQuestionForm.question_text}
                  onChange={(e) =>
                    setNewQuestionForm({
                      ...newQuestionForm,
                      question_text: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="예: 서비스에 얼마나 만족하셨나요?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  value={newQuestionForm.description}
                  onChange={(e) =>
                    setNewQuestionForm({
                      ...newQuestionForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="이 질문이 측정하는 내용을 설명해주세요."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  질문 유형
                </label>
                <select
                  value={newQuestionForm.question_type}
                  onChange={(e) =>
                    setNewQuestionForm({
                      ...newQuestionForm,
                      question_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="rating">별점 평가 (1-5점)</option>
                  <option value="text">주관식 (텍스트)</option>
                </select>
              </div>

              {newQuestionForm.question_type === "rating" && (
                <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700">
                    별점 척도 라벨 설정
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        1점 기준 (최소값)
                      </label>
                      <input
                        type="text"
                        value={newQuestionForm.rating_min_label}
                        onChange={(e) =>
                          setNewQuestionForm({
                            ...newQuestionForm,
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
                        value={newQuestionForm.rating_max_label}
                        onChange={(e) =>
                          setNewQuestionForm({
                            ...newQuestionForm,
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
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestionForm({
                    question_text: "",
                    description: "",
                    category: "",
                    question_type: "rating",
                    rating_min_label: "",
                    rating_max_label: "",
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={addNewQuestion}
                disabled={
                  saving ||
                  !newQuestionForm.question_text ||
                  !newQuestionForm.category
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "추가 중..." : "질문 추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && questionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  질문 삭제 확인
                </h3>
              </div>

              <p className="text-gray-600 mb-4">
                "<strong>{questionToDelete.question_text}</strong>" 질문을
                삭제하시겠습니까?
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>주의:</strong> 이 질문을 사용하는 기존 설문의 응답
                  데이터는 유지되지만, 새로운 설문에는 포함되지 않습니다.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setQuestionToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={deleteQuestion}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
