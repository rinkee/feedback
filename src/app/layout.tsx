"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
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
                    className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5a2 2 0 012-2h4a2 2 0 012 2v3H8V5z"
                      />
                    </svg>
                    대시보드
                  </Link>
                  <Link
                    href="/dashboard/surveys"
                    className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    설문 관리
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
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
