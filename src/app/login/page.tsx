"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, Mail, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError, data } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message === "Email not confirmed") {
          setError("이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.");
        } else if (signInError.message === "Invalid login credentials") {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setError(`로그인 중 오류가 발생했습니다: ${signInError.message}`);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        setMessage("로그인 성공! 잠시 후 대시보드로 이동합니다.");
        // 로그인 성공 후 리디렉션 (예: 대시보드 또는 메인 페이지)
        // 우선 메인 페이지('/')로 이동하도록 설정합니다.
        // 추후 사장님 대시보드 페이지가 생기면 그쪽으로 변경할 수 있습니다.
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh(); // 페이지 새로고침으로 세션 변경사항 반영
        }, 2000);
      } else {
        // 세션이 없지만 오류도 없는 경우는 드물지만, 대비합니다.
        setError("로그인에 실패했습니다. 세션 정보를 가져올 수 없습니다.");
      }
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-xl">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
            사장님 로그인
          </h2>
        </div>

        {error && (
          <div className="flex items-center p-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="flex items-center p-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-md">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>{message}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin} noValidate>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일 주소
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
                  placeholder="이메일 주소"
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
                  autoComplete="current-password"
                  required
                  className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                "로그인"
              )}
            </button>
          </div>
          <div className="text-sm text-center">
            <Link href="/store/register" legacyBehavior>
              <a className="font-medium text-blue-600 hover:text-blue-500">
                아직 계정이 없으신가요? 사장님 회원가입
              </a>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
