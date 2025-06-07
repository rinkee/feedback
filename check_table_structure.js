require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTableStructure() {
  try {
    // 1. required_questions 테이블의 모든 컬럼 조회
    const { data: reqQuestions, error: reqError } = await supabase
      .from("required_questions")
      .select("*")
      .limit(1);

    if (reqError) {
      console.error("required_questions 조회 오류:", reqError);
    } else {
      console.log("=== required_questions 테이블 구조 ===");
      if (reqQuestions.length > 0) {
        console.log("컬럼들:", Object.keys(reqQuestions[0]));
        console.log("샘플 데이터:", reqQuestions[0]);
      }
    }

    // 2. questions 테이블 구조 확인
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("survey_id", surveyId)
      .limit(1);

    if (qError) {
      console.error("questions 조회 오류:", qError);
    } else {
      console.log("\n=== questions 테이블 구조 ===");
      if (questions.length > 0) {
        console.log("컬럼들:", Object.keys(questions[0]));
        console.log("샘플 데이터:", questions[0]);
      }
    }

    // 3. responses 테이블 구조 확인
    const { data: responses, error: rError } = await supabase
      .from("responses")
      .select("*")
      .eq("survey_id", surveyId)
      .eq("required_question_category", "visit_frequency")
      .limit(1);

    if (rError) {
      console.error("responses 조회 오류:", rError);
    } else {
      console.log("\n=== responses 테이블 구조 ===");
      if (responses.length > 0) {
        console.log("컬럼들:", Object.keys(responses[0]));
        console.log("샘플 데이터:", responses[0]);
      }
    }

    // 4. 방문빈도 관련 질문들 전체 조회
    console.log("\n=== 방문빈도 관련 모든 데이터 ===");

    const { data: allRequiredQuestions, error: allReqError } = await supabase
      .from("required_questions")
      .select("*");

    if (!allReqError) {
      const visitFreqQuestions = allRequiredQuestions.filter(
        (q) =>
          q.category === "visit_frequency" ||
          q.question_text?.includes("방문") ||
          q.question_text?.includes("빈도") ||
          q.question_text?.includes("자주")
      );

      console.log("방문빈도 관련 필수 질문들:");
      visitFreqQuestions.forEach((q) => {
        console.log(q);
      });
    }

    // 5. 실제 설문에서 방문빈도 관련 질문 찾기
    const { data: allSurveyQuestions, error: allSurveyError } = await supabase
      .from("questions")
      .select("*")
      .eq("survey_id", surveyId);

    if (!allSurveyError) {
      console.log("\n=== 설문의 모든 질문 상세 ===");
      allSurveyQuestions.forEach((q, i) => {
        console.log(`\n질문 ${i + 1}:`);
        console.log(`ID: ${q.id}`);
        console.log(`텍스트: ${q.question_text}`);
        console.log(`타입: ${q.question_type}`);
        console.log(`Required ID: ${q.required_question_id}`);
        console.log(`선택지 존재: ${q.choices ? "Yes" : "No"}`);
        if (q.choices) {
          console.log(`선택지:`, q.choices);
        }
      });
    }
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

checkTableStructure();
