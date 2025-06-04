import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Feedback</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link
              href="/auth"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/auth"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative px-6 py-24 mx-auto max-w-7xl sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              고객의 목소리로
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                비즈니스를 성장시키세요
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              QR 코드 기반의 스마트한 피드백 수집 시스템으로 실시간 고객
              인사이트를 확보하고 데이터 기반의 의사결정을 내리세요.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                무료로 시작하기
              </Link>
              <Link
                href="#features"
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors"
              >
                더 알아보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <dt className="text-base font-semibold leading-6 text-gray-600">
                활성 사용자
              </dt>
              <dd className="text-3xl font-bold leading-10 tracking-tight text-gray-900">
                2,350+
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-base font-semibold leading-6 text-gray-600">
                수집된 피드백
              </dt>
              <dd className="text-3xl font-bold leading-10 tracking-tight text-gray-900">
                45,000+
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-base font-semibold leading-6 text-gray-600">
                평균 응답률
              </dt>
              <dd className="text-3xl font-bold leading-10 tracking-tight text-gray-900">
                85%
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-base font-semibold leading-6 text-gray-600">
                만족도 개선
              </dt>
              <dd className="text-3xl font-bold leading-10 tracking-tight text-gray-900">
                23%
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">
              더 나은 서비스를 위해
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              모든 피드백을 한 곳에서 관리하세요
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  </div>
                  실시간 데이터 수집
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  QR 코드 스캔 즉시 피드백이 수집되어 실시간으로 분석할 수
                  있습니다.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-teal-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 010 5.814l-5.518 2.207a8.25 8.25 0 01-1.34.135L3.5 19.5A1.5 1.5 0 012.25 18z"
                      />
                    </svg>
                  </div>
                  스마트 분석 대시보드
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  AI 기반 분석으로 고객 만족도 트렌드와 개선점을 자동으로
                  도출합니다.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  안전한 데이터 보호
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  엔터프라이즈급 보안으로 고객 정보와 피드백 데이터를 안전하게
                  보호합니다.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                      />
                    </svg>
                  </div>
                  맞춤형 설문 설계
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  브랜드와 비즈니스에 맞춘 개인화된 설문을 쉽게 만들고 수정할 수
                  있습니다.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* How It Works - Real Examples Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-blue-600">
              실제 사용 예시
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              이런 식으로 활용할 수 있어요
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              실제 카페에서 사용되는 질문과 고객 응답, AI 분석 결과를
              확인해보세요
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* 설문 질문 예시 카드 */}
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
              <div className="absolute top-4 right-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  설문 질문 설계하기
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  고객에게 물어볼 질문을 간단하게 만들어보세요
                </p>
              </div>

              {/* 실제 질문 예시 */}
              <div className="bg-white rounded-xl p-4 mb-4 border border-blue-200">
                <div className="flex items-center mb-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    커피 맛은 어떠셨나요?
                  </span>
                </div>
                <div className="flex space-x-1 ml-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-4 h-4 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center mb-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    다시 방문하실 의향이 있나요?
                  </span>
                </div>
                <div className="ml-8">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      매우 그렇다
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      그렇다
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      보통이다
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Question Design
                </span>
              </div>
            </div>

            {/* 고객 응답 예시 카드 */}
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
              <div className="absolute top-4 right-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-2-2v-2M9 4h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V6a2 2 0 012-2z"
                    />
                  </svg>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  실시간 고객 응답
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  고객들의 솔직한 피드백이 즉시 수집됩니다
                </p>
              </div>

              {/* 실제 응답 예시 */}
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">김</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        김민지님
                      </p>
                      <p className="text-xs text-gray-500">
                        20대 여성 • 5분 전
                      </p>
                    </div>
                  </div>
                  <div className="ml-11">
                    <div className="flex items-center mb-1">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-3 h-3 ${
                              star <= 5
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-xs text-gray-600">5/5</span>
                    </div>
                    <p className="text-xs text-gray-700">
                      "커피가 정말 맛있어요! 매우 그렇다"
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">박</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        박철수님
                      </p>
                      <p className="text-xs text-gray-500">
                        30대 남성 • 12분 전
                      </p>
                    </div>
                  </div>
                  <div className="ml-11">
                    <div className="flex items-center mb-1">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-3 h-3 ${
                              star <= 4
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-xs text-gray-600">4/5</span>
                    </div>
                    <p className="text-xs text-gray-700">
                      "분위기 좋아요. 그렇다"
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Real Feedback
                </span>
              </div>
            </div>

            {/* AI 분석 결과 예시 카드 */}
            <div className="relative bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100">
              <div className="absolute top-4 right-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  스마트 AI 분석
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  수집된 피드백을 자동으로 분석해 인사이트를 제공합니다
                </p>
              </div>

              {/* AI 분석 결과 예시 */}
              <div className="bg-white rounded-xl p-4 mb-4 border border-purple-200">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <span className="ml-2 text-sm font-semibold text-gray-900">
                    AI 인사이트
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed mb-3">
                  "최근 1주일간 커피 맛 만족도가 15% 상승했습니다. 고객들은 특히
                  신메뉴 '바닐라 라떼'에 높은 평가를 주고 있어요."
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">평균 만족도</span>
                    <span className="text-xs font-bold text-green-600">
                      4.6/5
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-1.5 rounded-full"
                      style={{ width: "92%" }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-purple-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <svg
                        className="w-3 h-3 text-green-600 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-medium text-green-800">
                        강점
                      </span>
                    </div>
                    <p className="text-xs text-green-700">
                      • 커피 맛 우수
                      <br />• 친절한 서비스
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <svg
                        className="w-3 h-3 text-orange-600 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-medium text-orange-800">
                        개선점
                      </span>
                    </div>
                    <p className="text-xs text-orange-700">
                      • 대기시간 단축
                      <br />• 음악 볼륨 조절
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  AI Analysis
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/auth"
              className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              지금 바로 시작하기
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              지금 바로 시작해보세요
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              설정은 5분, 첫 번째 피드백 수집은 그 다음 5분이면 완료됩니다.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth"
                className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-blue-600 shadow-lg hover:bg-blue-50 transform hover:scale-105 transition-all duration-300"
              >
                무료 체험 시작
              </Link>
              <Link
                href="#"
                className="text-sm font-semibold leading-6 text-white hover:text-blue-100 transition-colors"
              >
                데모 보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <p className="text-sm leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} Feedback App. All rights
              reserved.
            </p>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              Silicon Valley, California.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
