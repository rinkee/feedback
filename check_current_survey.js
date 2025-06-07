require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCurrentSurvey() {
  try {
    console.log("=== 현재 활성화된 설문 확인 ===");

    // 1. 활성화된 설문 조회
    const { data: activeSurvey, error: surveyError } = await supabase
      .from("surveys")
      .select("id, title, description, is_active")
      .eq("user_id", "5e1f5903-b48d-4502-95cb-838df25fbf48")
      .eq("is_active", true)
      .single();

    if (surveyError) {
      console.error("설문 조회 오류:", surveyError);
      return;
    }

    console.log("활성화된 설문:", activeSurvey);

    // 2. 설문의 모든 질문 조회
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select(
        `
        id,
        question_text,
        question_type,
        options,
        order_num,
        required_question_id,
        required_questions:required_question_id (
          id,
          category,
          question_text,
          question_type,
          options
        )
      `
      )
      .eq("survey_id", activeSurvey.id)
      .order("order_num");

    if (questionsError) {
      console.error("질문 조회 오류:", questionsError);
      return;
    }

    console.log(`\n=== 설문 질문 (총 ${questions.length}개) ===`);
    questions.forEach((q, i) => {
      console.log(`\n${i + 1}. ${q.question_text}`);
      console.log(`   - 타입: ${q.question_type}`);
      console.log(`   - required_question_id: ${q.required_question_id}`);
      if (q.required_questions) {
        console.log(`   - 필수질문 카테고리: ${q.required_questions.category}`);
      }
      if (q.options) {
        console.log(`   - 옵션:`, q.options);
      }
    });

    // 3. 현재 응답 수 확인
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("id, required_question_category")
      .eq("survey_id", activeSurvey.id);

    if (responsesError) {
      console.error("응답 조회 오류:", responsesError);
      return;
    }

    console.log(`\n=== 현재 응답 상황 ===`);
    console.log(`총 응답 수: ${responses.length}`);

    // 카테고리별 응답 수 계산
    const categoryCount = {};
    responses.forEach((r) => {
      const category = r.required_question_category || "null";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    console.log("카테고리별 응답 수:", categoryCount);

    // 4. 고객 수 확인
    const { data: customers, error: customersError } = await supabase
      .from("customer_info")
      .select("id, name")
      .limit(100);

    if (customersError) {
      console.error("고객 조회 오류:", customersError);
      return;
    }

    console.log(`\n=== 고객 정보 ===`);
    console.log(`총 고객 수: ${customers.length}`);
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

checkCurrentSurvey();
