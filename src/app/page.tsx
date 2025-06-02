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
