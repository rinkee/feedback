'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, User, Cake, VenetianMask, Send, MessageSquare, Star, Check } from 'lucide-react';

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'select' | 'textarea';
  required: boolean;
  maxRating?: number;
  labels?: { [key: number]: string };
  options?: string[];
  isMultiSelect?: boolean;
  placeholder?: string;
}

// Sample questions - this could eventually come from a database or props
const surveyQuestionsData: SurveyQuestion[] = [
  {
    id: 'q_taste',
    text: '음식의 맛은 만족스러우셨나요?',
    type: 'rating',
    maxRating: 5,
    required: true,
  },
  {
    id: 'q_service',
    text: '직원들의 서비스는 어떠셨나요?',
    type: 'rating',
    maxRating: 5,
    required: true,
  },
  {
    id: 'q_atmosphere',
    text: '매장의 분위기는 어떠셨나요?',
    type: 'select',
    options: ['선택해주세요', '매우 좋음', '좋음', '보통', '개선 필요', '매우 개선 필요'],
    required: false,
  },
  {
    id: 'q_comment',
    text: '기타 의견이나 제안사항이 있다면 자유롭게 작성해주세요.',
    type: 'textarea',
    required: false,
  },
];

type Props = {
  params: { storeId: string };
};

export default function StoreSurveyPage({ params }: Props) {
  const { storeId } = params;

  const [currentOverallStep, setCurrentOverallStep] = useState(1); // 1: UserInfo, 2: Survey, 3: ThankYou

  // User Info States
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState(''); // Stores string like "20대"

  // Survey States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({}); // Allow number for rating

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Changed type to string | null and initial value to null
  const [message, setMessage] = useState('');

  const handleUserInfoSubmit = () => {
    setCurrentOverallStep(2); // Move to survey questions
    setError(null); // Clear any previous errors
  };

  const handleAnswerChange = (questionId: string, value: string | number, questionType?: 'select', isMulti?: boolean, optionIndex?: number) => {
    setError(null); // Clear error on new answer

    if (questionType === 'select') {
      // When questionType is 'select', 'value' is derived from 'effectiveValue',
      // which is always a string (an option text or '' for placeholder).
      const currentOptionValue = value as string;

      if (isMulti) {
        const currentSelections = (answers[questionId] as string[] || []);
        let newSelections;
        if (currentSelections.includes(currentOptionValue)) {
          newSelections = currentSelections.filter(item => item !== currentOptionValue);
        } else {
          newSelections = [...currentSelections, currentOptionValue];
        }
        setAnswers(prev => ({ ...prev, [questionId]: newSelections }));
      } else { // Single select
        setAnswers(prev => ({ ...prev, [questionId]: currentOptionValue }));
      }
    } else { 
      // For 'rating', value is number. For 'textarea', value is string.
      // The Answers type [key: string]: string | number | string[] handles this.
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const handleNextQuestion = async () => {
    const currentQuestion = surveyQuestionsData[currentQuestionIndex];
    if (currentQuestion.required && (answers[currentQuestion.id] === undefined || answers[currentQuestion.id] === '' || (currentQuestion.type === 'select' && answers[currentQuestion.id] === currentQuestion.options?.[0]))) {
      setError(`필수 질문입니다. 답변을 선택해주세요.`);
      return;
    }
    setError('');

    if (currentQuestionIndex < surveyQuestionsData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // This is the last question, pressing next means ready to submit
      submitSurvey();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setError('');
    }
  };

  const submitSurvey = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    const surveyData = {
      store_id: storeId,
      nickname: nickname || null,
      gender: gender || null,
      age: age || null,
      answers: answers, // Submit the whole answers object
    };

    try {
      const { error: insertError } = await supabase
        .from('survey_responses')
        .insert([surveyData]);

      if (insertError) {
        throw insertError;
      }
      setMessage('설문이 성공적으로 제출되었습니다! 참여해주셔서 감사합니다.');
      setCurrentOverallStep(3); // Show thank you page
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Submission error:', error);
      setError(error.message || '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Render Thank You Step
  if (currentOverallStep === 3) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen p-4 mx-auto text-center bg-gray-100">
        <CheckCircle className="w-20 h-20 mb-6 text-green-500" />
        <h1 className="mb-4 text-3xl font-bold text-green-700">제출 완료!</h1>
        <p className="text-lg text-gray-700">{message}</p>
        <button 
          onClick={() => { /* Reset or navigate home */ setCurrentOverallStep(1); setAnswers({}); setCurrentQuestionIndex(0); setNickname(''); setGender(''); setAge(''); }}
          className="mt-8 px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          새로운 설문 시작
        </button>
      </div>
    );
  }

  // User Info Step (maintains its card and centered title)
  if (currentOverallStep === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 sm:p-6 md:p-8">
        <div className="w-full max-w-xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800">
                {storeId}점 설문
            </h1>
          </div>
          {error && (
            <div className="p-3 my-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="p-6 bg-white rounded-lg shadow-lg sm:p-8">
            <form onSubmit={(e) => { e.preventDefault(); handleUserInfoSubmit(); }} className="space-y-6">
              <p className="mb-6 text-center text-gray-600">
                더 나은 서비스를 위해, 괜찮으시다면 몇 가지 정보를 알려주시겠어요? (선택 사항)
              </p>
              <div>
                <label htmlFor="nickname" className="block mb-1.5 text-sm font-medium text-gray-700">
                  <User className="inline w-4 h-4 mr-1.5 text-gray-500" /> 닉네임
                </label>
                <input type="text" id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="예: 행복한 미식가"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  <VenetianMask className="inline w-4 h-4 mr-1.5 text-gray-500" /> 성별
                </label>
                <div className="flex space-x-2">
                  {['남성', '여성', '선택 안함'].map((option) => (
                    <button key={option} type="button" onClick={() => setGender(option === '선택 안함' ? '' : option)}
                      className={`flex-1 px-4 py-2.5 border rounded-md text-sm font-medium transition-colors ${gender === option || (option === '선택 안함' && gender === '') ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  <Cake className="inline w-4 h-4 mr-1.5 text-gray-500" /> 나이대
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {['10대', '20대', '30대', '40대', '50대', '60대 이상', '선택 안함'].map((option) => (
                    <button key={option} type="button" onClick={() => setAge(option === '선택 안함' ? '' : option)}
                      className={`px-3 py-2.5 border rounded-md text-sm font-medium transition-colors text-center ${age === option || (option === '선택 안함' && age === '') ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col space-y-3 pt-4">
                <button type="submit"
                  className="flex items-center justify-center w-full px-6 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-sm">
                  설문 시작하기 <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button type="button" onClick={handleUserInfoSubmit} 
                  className="w-full text-sm text-center text-gray-600 hover:text-blue-600 hover:underline">
                  (정보 입력 없이) 바로 설문 시작
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Survey Questions Step
  if (currentOverallStep === 2) {
    const question = surveyQuestionsData[currentQuestionIndex];
    const questionText = question.text.replace('[서비스/매장]', storeId);
    const questionNumber = currentQuestionIndex + 1;

    const renderQuestionContent = () => {
      // Card wrapper for select and textarea types
      if (question.type === 'select' || question.type === 'textarea') {
        return (
          <div className="w-full max-w-xl p-6 mx-auto bg-white rounded-lg shadow-lg sm:p-8">
            <h2 className="mb-1 text-sm font-semibold text-gray-500">Q{questionNumber}.</h2>
            <label htmlFor={question.id} className="block mb-6 text-xl font-medium text-gray-800 leading-tight">
              {questionText}
              {question.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            
            {question.type === 'select' && (
              <div className="space-y-3">
                {question.options?.map((opt, index) => {
                  // For single-select, the first option '선택해주세요' acts as a placeholder and should not be visually selected if its value is empty.
                  // For multi-select, '선택해주세요' is usually not an option. If it were, it would be treated as a regular option.
                  if (question.isMultiSelect && opt === '선택해주세요') return null; // Don't render '선택해주세요' for multi-select
                  
                  const isSelected = question.isMultiSelect 
                    ? (answers[question.id] as string[] || []).includes(opt)
                    : (answers[question.id] === opt && !(index === 0 && opt === '선택해주세요'));
                  
                  // For single select, if '선택해주세요' is the option, its effective value for submission is empty string.
                  const effectiveValue = (index === 0 && opt === '선택해주세요' && !question.isMultiSelect) ? '' : opt;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAnswerChange(question.id, effectiveValue, 'select', question.isMultiSelect, index)}
                      className={`flex items-center justify-between w-full p-4 text-left border rounded-lg transition-colors duration-150 ease-in-out 
                        ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                    >
                      <span className={`text-base ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>{opt}</span>
                      <div className={`flex items-center justify-center w-6 h-6 border rounded-full transition-all duration-150 ease-in-out 
                        ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'}`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === 'textarea' && (
              <textarea 
                id={question.id} 
                rows={5} 
                value={(answers[question.id] as string || '')}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                className="block w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 shadow-sm"
                placeholder={question.placeholder || '자유롭게 의견을 작성해주세요...'}
                maxLength={200}
              />
            )}
          </div>
        );
      }

      // Rating type (no card, existing style)
      if (question.type === 'rating') {
        return (
          <div className="w-full max-w-xl mx-auto">
            <div key={question.id} className="mb-8 text-center">
              <label htmlFor={question.id} className="block text-2xl font-semibold text-gray-800 md:text-3xl leading-tight">
                Q{questionNumber}. {questionText}
                {question.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              {question.labels && (
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>{question.labels[question.maxRating === 5 ? 1 : 0]}</span>
                  <span>{question.labels[question.maxRating || (question.maxRating === 10 ? 10 : 5)]}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                {[...Array(question.maxRating || 5)].map((_, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => handleAnswerChange(question.id, i + 1)}
                    className={`p-1 sm:p-2 rounded-full transition-transform transform hover:scale-110 
                      ${(answers[question.id] as number) >= i + 1 ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                  >
                    <Star className="w-8 h-8 sm:w-10 sm:h-10 fill-current md:w-12 md:h-12" />
                  </button>
                ))}
              </div>
              {answers[question.id] && (
                <div className="mt-3 text-xl font-semibold text-yellow-500">
                  {answers[question.id]}점!
                </div>
              )}
            </div>
          </div>
        );
      }
      return null; // Should not happen
    };

    return (
      <div className="flex flex-col min-h-screen p-4 bg-gray-100 sm:p-6 md:p-8">
        {/* Top-left Title */}
        <div className="w-full mb-6">
          <h1 className="text-base font-medium text-gray-500">
            {storeId}점 설문
          </h1>
        </div>

        {error && (
            <div className="w-full max-w-xl p-3 mx-auto my-2 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
        )}

        {/* Main content area: Takes remaining space and centers content */}
        <div className="flex flex-col items-center justify-center flex-grow w-full">
          <div className="w-full max-w-xl">
            {renderQuestionContent()}
          </div>
        </div>

        {/* Progress Bar (at the bottom of the content, above nav buttons) */}
        <div className="w-full max-w-md mx-auto mb-6"> 
          <div className="mb-2 text-sm text-center text-gray-500"> 
            질문 {currentQuestionIndex + 1} / {surveyQuestionsData.length}
          </div>
          <div className="w-full p-1 bg-gray-300 rounded-full">
            <div 
              className="h-2 bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${((currentQuestionIndex + 1) / surveyQuestionsData.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Navigation Buttons (at the very bottom of the screen area) */}
        <div className="w-full max-w-xl px-4 pb-4 mx-auto border-t border-gray-300 pt-6 sm:px-0"> 
          <div className="flex items-center justify-between">
            <button 
              type="button" 
              onClick={handlePreviousQuestion} 
              disabled={currentQuestionIndex === 0 || loading}
              className="flex items-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> 이전
            </button>
            <button 
              type="button" 
              onClick={handleNextQuestion} 
              disabled={loading}
              className="flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 transition-colors"
            >
              {loading ? (
                <svg className="w-5 h-5 mr-2 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : currentQuestionIndex === surveyQuestionsData.length - 1 ? <Send className="w-5 h-5 mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
              {loading ? '제출 중...' : currentQuestionIndex === surveyQuestionsData.length - 1 ? '최종 제출' : '다음'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback or loading state if needed, though current logic covers all steps
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-700">
      로딩 중이거나 알 수 없는 단계입니다...
    </div>
  );
}
