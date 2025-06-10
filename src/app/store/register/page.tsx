"use client";

import { useState, FormEvent } from "react";
import { supabase } from '@/lib/supabaseClient';

// Helper function to create an initial survey for a new store
async function createInitialSurvey(userId: string, storeId: string) {
  const defaultSurvey = {
    title: "고객 만족도 설문 (기본)",
    description: "저희 매장을 이용해주셔서 감사합니다. 더 나은 서비스를 위해 잠시 시간을 내어 설문에 참여해주시면 감사하겠습니다.",
  };

  const defaultQuestions = [
    {
      text: "오늘 저희 매장의 전반적인 만족도는 어떠셨나요?",
      type: "rating_scale", // 예: 1~5점 척도
      options: { min: 1, max: 5, labels: { 1: "매우 불만족", 3: "보통", 5: "매우 만족" } }, // JSONB 형태
      question_order: 1,
      is_required: true,
    },
    {
      text: "가장 만족스러웠던 점은 무엇인가요? (선택)",
      type: "open_text",
      options: null,
      question_order: 2,
      is_required: false,
    },
    {
      text: "개선했으면 하는 점이 있다면 알려주세요. (선택)",
      type: "open_text",
      options: null,
      question_order: 3,
      is_required: false,
    },
    {
      text: "다음에 또 방문하실 의향이 있으신가요?",
      type: "single_choice",
      options: ["네, 꼭 다시 올 거예요", "글쎄요, 잘 모르겠어요", "아니요, 다시 오지 않을 것 같아요"], // JSONB 배열 형태
      question_order: 4,
      is_required: true,
    },
  ];

  try {
    console.log(`Attempting to create initial survey for user: ${userId}, store: ${storeId}`);
    // 1. Create the survey
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        user_id: userId,
        store_id: storeId,
        title: defaultSurvey.title,
        description: defaultSurvey.description,
      })
      .select('id') // Get the ID of the newly created survey
      .single();

    if (surveyError) {
      console.error('Error creating initial survey:', surveyError.message);
      return { success: false, error: `설문지 생성 실패: ${surveyError.message}` };
    }
    if (!surveyData || !surveyData.id) {
      console.error('Failed to create initial survey or retrieve its ID.');
      return { success: false, error: '설문지는 생성되었으나 ID를 가져오지 못했습니다.' };
    }
    const surveyId = surveyData.id;
    console.log(`Initial survey created with ID: ${surveyId}`);

    // 2. Create the questions for the survey
    const questionsToInsert = defaultQuestions.map(q => ({
      survey_id: surveyId,
      text: q.text,
      type: q.type,
      options: q.options,
      question_order: q.question_order,
      is_required: q.is_required,
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Error creating initial questions:', questionsError.message);
      // 설문은 생성되었지만 질문 생성에 실패한 경우입니다.
      // 사용자는 대시보드에서 이 빈 설문지를 수정하거나 삭제할 수 있어야 합니다.
      return { success: false, error: `질문 생성 실패: ${questionsError.message}`, surveyIdCreated: surveyId };
    }

    console.log('Initial questions created successfully for survey ID:', surveyId);
    return { success: true, surveyId };

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Unexpected error in createInitialSurvey:', err.message);
    return { success: false, error: err.message || '초기 설문 생성 중 예상치 못한 오류가 발생했습니다.' };
  }
}

import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Store,
  Key,
  Mail,
  User,
  Phone,
  Tag,
  Building,
} from "lucide-react";

const STORE_TYPES_BROAD = [
  "선택해주세요",
  "한식",
  "중식",
  "일식",
  "양식",
  "카페",
  "주점",
  "기타",
];

export default function StoreRegistrationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] =
    useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [storeTypeBroad, setStoreTypeBroad] = useState(STORE_TYPES_BROAD[0]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    setSuccessMessage("");

    if (!email || !password || !storeName || !businessRegistrationNumber) {
      setError(
        "필수 항목을 모두 입력해주세요: 이메일, 비밀번호, 가게 이름, 사업자 등록번호"
      );
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log("Auth Sign Up Data:", authData);
      console.log("Auth Sign Up Error:", authError);

      if (authError) {
        throw new Error(
          authError.message === "User already registered"
            ? "이미 등록된 이메일입니다."
            : authError.message
        );
      }

      if (!authData.user) {
        throw new Error("사용자 생성에 실패했습니다. 다시 시도해주세요.");
      }

      const userIdFromAuth = authData.user.id;

      // 2. Insert store information into the 'stores' table
      const { data: storeData, error: storeError } = await supabase.from("stores").insert([
        {
          user_id: userIdFromAuth,
          name: storeName,
          business_registration_number: businessRegistrationNumber,
          owner_contact: ownerContact || null,
          store_type_broad:
            storeTypeBroad === STORE_TYPES_BROAD[0] ? null : storeTypeBroad,
        },
      ]).select('id').single();

      if (storeError) {
        // 전체 오류 객체를 콘솔에 JSON 형태로 기록하여 상세 분석
        console.error(
          "Full store insertion error object:",
          JSON.stringify(storeError, null, 2)
        );

        // 사용자에게 보여줄 오류 메시지 (storeError.message가 없으면 기본 메시지 사용)
        const detailMessage =
          storeError.message ||
          "데이터베이스 처리 중 오류가 발생했습니다. 자세한 내용은 개발자 콘솔을 확인해주세요.";

        setError(
          `가게 정보 저장에 실패했습니다: ${detailMessage}. 사용자 계정(${email})은 생성되었으나, 가게 정보가 연결되지 않았습니다. 관리자에게 문의하여 계정 정리를 요청하세요.`
        );
        setLoading(false);
        return;
      }

      if (storeData && storeData.id) {
        setSuccessMessage('가게 정보 등록 완료. 초기 설문지를 생성 중입니다...');
        setLoading(true); // 설문 생성 중에도 로딩 상태 유지

        const initialSurveyResult = await createInitialSurvey(userIdFromAuth, storeData.id);

        if (initialSurveyResult.success) {
          setSuccessMessage('가게 정보와 초기 설문지가 성공적으로 등록 및 생성되었습니다! 이메일 인증 후 로그인해주세요.');
        } else {
          console.error(
            "Failed to create initial survey:",
            initialSurveyResult.error
          );
          setError(
            `가게 정보는 등록되었습니다. 하지만 초기 설문지 생성에 실패했습니다: ${initialSurveyResult.error}. 이메일 인증 후 로그인하여 대시보드에서 설문지를 확인하거나 새로 만들어주세요.`
          );
          setSuccessMessage("");
        }
        
        // 공통 리디렉션 로직
        setTimeout(() => {
          setLoading(false); // 모든 작업 완료 후 로딩 해제
          router.push('/login');
        }, 4000); // 메시지 확인 및 처리 시간을 위해 4초로 늘림
        } else if (storeData && !storeData.id) {
            console.error('Store possibly created but ID not returned from Supabase.');
            setError('가게 정보는 등록된 것 같으나, ID를 가져오지 못했습니다. 잠시 후 다시 시도하거나 지원팀에 문의하세요.');
            setLoading(false);
        } else if (!storeData && !storeError) {
            // storeError도 없고 storeData도 없는 경우 (이론적으로 .single() 사용 시 드묾)
            console.error('Store creation failed silently or did not return data.');
            setError('가게 정보 등록에 실패했습니다 (데이터 반환 없음). 잠시 후 다시 시도해주세요.');
            setLoading(false);
        }
      // storeError가 있는 경우는 이 블록 이전에 이미 처리됨 (기존 로직)
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Store className="w-auto h-12 mx-auto text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
            사장님 회원가입
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            솔직한 고객 피드백으로 가게를 성장시키세요.
          </p>
        </div>

        {message && (
          <div className="flex items-center p-4 text-sm text-green-700 bg-green-100 border border-green-200 rounded-md">
            <CheckCircle className="w-5 h-5 mr-3 text-green-500 shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="flex items-center p-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
            <AlertCircle className="w-5 h-5 mr-3 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일 주소 (아이디)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="이메일 주소 (아이디)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Key className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="storeName" className="sr-only">
                가게 이름
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="storeName"
                  name="storeName"
                  type="text"
                  required
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="가게 이름"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="businessRegistrationNumber" className="sr-only">
                사업자 등록번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Tag className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="businessRegistrationNumber"
                  name="businessRegistrationNumber"
                  type="text"
                  required
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="사업자 등록번호 ('-' 제외하고 입력)"
                  value={businessRegistrationNumber}
                  onChange={(e) =>
                    setBusinessRegistrationNumber(
                      e.target.value.replace(/[^0-9]/g, "")
                    )
                  }
                />
              </div>
            </div>
            <div>
              <label htmlFor="ownerContact" className="sr-only">
                가게 대표 연락처 (선택)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="ownerContact"
                  name="ownerContact"
                  type="tel"
                  autoComplete="tel"
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="가게 대표 연락처 (선택, '-' 제외하고 입력)"
                  value={ownerContact}
                  onChange={(e) =>
                    setOwnerContact(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>
            </div>
            <div>
              <label htmlFor="storeTypeBroad" className="sr-only">
                가게 유형 (대분류, 선택)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />{" "}
                  {/* Icon might need adjustment for context */}
                </div>
                <select
                  id="storeTypeBroad"
                  name="storeTypeBroad"
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  value={storeTypeBroad}
                  onChange={(e) => setStoreTypeBroad(e.target.value)}
                >
                  {STORE_TYPES_BROAD.map((type) => (
                    <option
                      key={type}
                      value={type}
                      disabled={
                        type === "선택해주세요" &&
                        storeTypeBroad !== "선택해주세요"
                      }
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? (
                <svg
                  className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
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
              ) : (
                "동의하고 회원가입"
              )}
            </button>
          </div>
          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => router.push("/login")} // Navigate to general login or a specific store login
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
