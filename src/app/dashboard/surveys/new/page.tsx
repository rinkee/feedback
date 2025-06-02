"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Sparkles,
  Users,
  Clock,
  BarChart3,
  Zap,
  Target,
  CheckCircle,
} from "lucide-react";

export default function NewSurveyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/surveys"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
          >
            <ArrowLeft
              size={20}
              className="mr-2 group-hover:-translate-x-1 transition-transform"
            />
            설문 목록으로 돌아가기
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              새 설문 만들기
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              당신의 비즈니스에 맞는 완벽한 설문을 만들어보세요
            </p>
          </div>
        </div>

        {/* 설문 생성 방식 선택 */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 직접 만들기 */}
          <div className="group bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-8">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Edit3 className="h-10 w-10 text-blue-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">
                직접 만들기
              </h3>

              <p className="text-gray-600 text-center mb-8 leading-relaxed">
                질문을 하나씩 직접 추가하고 설정하여
                <br />
                <strong>완전히 맞춤형</strong> 설문을 생성하세요
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="h-5 w-5 mr-3 text-blue-600" />
                  완전한 커스터마이징 가능
                </div>
                <div className="flex items-center text-gray-700">
                  <Target className="h-5 w-5 mr-3 text-blue-600" />
                  다양한 질문 유형 지원
                </div>
                <div className="flex items-center text-gray-700">
                  <BarChart3 className="h-5 w-5 mr-3 text-blue-600" />
                  정밀한 설문 설계
                </div>
              </div>

              <Link
                href="/dashboard/surveys/new/manual"
                className="w-full inline-flex items-center justify-center px-8 py-4 text-base font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Edit3 className="h-5 w-5 mr-2" />
                직접 만들기 시작
              </Link>
            </div>
          </div>

          {/* AI로 생성하기 */}
          <div className="group bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative">
            {/* 추천 배지 */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
              추천!
            </div>

            <div className="p-8">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="h-10 w-10 text-purple-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">
                AI로 생성하기
                <span className="inline-block ml-2 px-3 py-1 text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full">
                  NEW
                </span>
              </h3>

              <p className="text-gray-600 text-center mb-8 leading-relaxed">
                원하는 내용을 자연어로 설명하면
                <br />
                <strong>AI가 자동으로</strong> 전문적인 설문을 생성해드립니다
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-700">
                  <Zap className="h-5 w-5 mr-3 text-purple-600" />
                  빠른 설문 생성 (1분 내)
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="h-5 w-5 mr-3 text-purple-600" />
                  전문적인 질문 구성
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="h-5 w-5 mr-3 text-purple-600" />
                  즉시 사용 가능
                </div>
              </div>

              <Link
                href="/dashboard/surveys/new/ai"
                className="w-full inline-flex items-center justify-center px-8 py-4 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                AI로 생성하기
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 도움말 */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              어떤 방식을 선택해야 할까요?
            </h4>
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div className="text-left">
                <h5 className="font-medium text-blue-600 mb-2">
                  직접 만들기가 좋은 경우:
                </h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 특별한 질문 형태가 필요한 경우</li>
                  <li>• 브랜딩에 맞는 맞춤 설문이 필요한 경우</li>
                  <li>• 복잡한 로직이 있는 설문인 경우</li>
                </ul>
              </div>
              <div className="text-left">
                <h5 className="font-medium text-purple-600 mb-2">
                  AI 생성이 좋은 경우:
                </h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 빠르게 설문을 만들고 싶은 경우</li>
                  <li>• 전문적인 질문 구성이 필요한 경우</li>
                  <li>• 설문 작성 경험이 적은 경우</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
