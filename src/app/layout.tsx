"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  User,
  BarChart3,
  FileText,
  Store,
  Settings,
  CheckSquare,
} from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 사이드바를 표시하지 않을 경로들
  const noSidebarPaths = ["/auth", "/view"];
  const shouldShowSidebar =
    !noSidebarPaths.some((path) => pathname.startsWith(path)) &&
    pathname !== "/";

  // 활성 메뉴 확인 함수
  const isActiveMenu = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (
      path === "/dashboard/surveys" &&
      pathname.startsWith("/dashboard/surveys")
    )
      return true;
    if (
      path === "/dashboard/required-questions" &&
      pathname.startsWith("/dashboard/required-questions")
    )
      return true;
    if (path === "/dashboard/store" && pathname.startsWith("/dashboard/store"))
      return true;
    if (path === "/settings" && pathname.startsWith("/settings")) return true;
    return false;
  };

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50`}>
        {shouldShowSidebar && user ? (
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden md:flex md:flex-shrink-0">
              <div className="flex flex-col w-64 bg-white border-r border-gray-200">
                {/* Logo */}
                <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
                  <Link href="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">F</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      Feedback
                    </span>
                  </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                  <Link
                    href="/dashboard"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isActiveMenu("/dashboard")
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 mr-3" />
                    대시보드
                  </Link>
                  <Link
                    href="/dashboard/surveys"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isActiveMenu("/dashboard/surveys")
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <FileText className="w-5 h-5 mr-3" />
                    설문 관리
                  </Link>
                  <Link
                    href="/dashboard/required-questions"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isActiveMenu("/dashboard/required-questions")
                        ? "bg-green-50 text-green-700 border-r-2 border-green-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <CheckSquare className="w-5 h-5 mr-3" />
                    필수 질문 설정
                  </Link>
                  <Link
                    href="/dashboard/store"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isActiveMenu("/dashboard/store")
                        ? "bg-purple-50 text-purple-700 border-r-2 border-purple-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Store className="w-5 h-5 mr-3" />내 가게 정보
                  </Link>
                  <Link
                    href="/settings"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isActiveMenu("/settings")
                        ? "bg-gray-50 text-gray-700 border-r-2 border-gray-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Settings className="w-5 h-5 mr-3" />
                    설정
                  </Link>
                </nav>

                {/* User Profile */}
                <div className="px-4 py-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="text-white h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.email || "사용자"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">관리자</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
              {/* Top Bar for Mobile */}
              <header className="bg-white border-b border-gray-200 md:hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <Link href="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">F</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      Feedback
                    </span>
                  </Link>
                  {/* Mobile menu button */}
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </header>

              <main className="flex-1">{children}</main>
            </div>
          </div>
        ) : (
          // 사이드바가 없는 페이지들 (인증, 설문 조회, 메인 페이지)
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}
