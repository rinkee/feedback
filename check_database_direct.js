require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseDirect() {
  try {
    // 1. Raw SQL로 방문빈도 필수 질문 조회
    const { data: visitFreqData, error: visitFreqError } = await supabase.rpc(
      "sql",
      {
        query: `SELECT id, category, question_text, choices FROM required_questions WHERE category = 'visit_frequency';`,
      }
    );

    if (visitFreqError) {
      console.log("RPC 방법 실패, 일반 조회 시도...");

      // 일반 조회 방식
      const { data: altData, error: altError } = await supabase
        .from("required_questions")
        .select("id, category, question_text, choices")
        .eq("category", "visit_frequency")
        .single();

      if (altError) {
        console.error("방문빈도 조회 오류:", altError);
        return;
      }

      console.log("=== 방문빈도 필수 질문 (일반 조회) ===");
      console.log("ID:", altData.id);
      console.log("질문:", altData.question_text);
      console.log("선택지 원본:", altData.choices);
      console.log("선택지 타입:", typeof altData.choices);

      if (altData.choices) {
        console.log("선택지 파싱:");
        Object.entries(altData.choices).forEach(([key, value]) => {
          console.log(`${key}: "${value}"`);
        });
      }
    } else {
      console.log("=== 방문빈도 필수 질문 (RPC) ===");
      console.log(visitFreqData);
    }

    // 2. 설문의 방문빈도 질문 확인
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";

    const { data: surveyQuestions, error: surveyError } = await supabase
      .from("questions")
      .select("*")
      .eq("survey_id", surveyId);

    if (surveyError) {
      console.error("설문 질문 조회 오류:", surveyError);
      return;
    }

    console.log("\n=== 설문의 모든 질문 ===");
    surveyQuestions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.question_text}`);
      console.log(`   ID: ${q.id}`);
      console.log(`   Required ID: ${q.required_question_id}`);
      console.log(`   타입: ${q.question_type}`);
      if (q.choices) {
        console.log(`   선택지:`, q.choices);
      }
      console.log("");
    });

    // 3. 방문빈도 응답 샘플 확인
    const { data: sampleResponses, error: sampleError } = await supabase
      .from("responses")
      .select("*")
      .eq("survey_id", surveyId)
      .eq("required_question_category", "visit_frequency")
      .limit(5);

    if (sampleError) {
      console.error("샘플 응답 조회 오류:", sampleError);
      return;
    }

    console.log("=== 방문빈도 응답 샘플 ===");
    sampleResponses.forEach((r, i) => {
      console.log(
        `${i + 1}. 선택지: ${r.selected_option}, 질문ID: ${r.question_id}`
      );
    });
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

checkDatabaseDirect();
