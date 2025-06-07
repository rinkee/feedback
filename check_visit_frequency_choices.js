require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkVisitFrequencyChoices() {
  try {
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";

    console.log("=== 방문빈도 질문 및 선택지 분석 ===");

    // 1. 필수 질문들 조회
    const { data: requiredQuestions, error: reqError } = await supabase
      .from("required_questions")
      .select("*");

    if (reqError) {
      console.error("필수 질문 조회 오류:", reqError);
      return;
    }

    console.log("=== 필수 질문들 ===");
    requiredQuestions.forEach((q) => {
      console.log(`${q.category}: ${q.question_text}`);
    });

    const visitFreqQuestion = requiredQuestions.find(
      (q) => q.category === "visit_frequency"
    );

    if (visitFreqQuestion) {
      console.log("\n=== 방문빈도 필수 질문 ===");
      console.log(`ID: ${visitFreqQuestion.id}`);
      console.log(`질문: ${visitFreqQuestion.question_text}`);
      console.log(
        `선택지:`,
        JSON.stringify(visitFreqQuestion.choices, null, 2)
      );
    }

    // 2. 실제 설문의 방문빈도 관련 질문 조회
    const { data: surveyQuestions, error: surveyError } = await supabase
      .from("questions")
      .select("*")
      .eq("survey_id", surveyId);

    if (surveyError) {
      console.error("설문 질문 조회 오류:", surveyError);
      return;
    }

    console.log(`\n=== 설문의 모든 질문 (${surveyQuestions.length}개) ===`);

    // 방문빈도 관련 질문 찾기
    const visitFreqSurveyQuestion = surveyQuestions.find(
      (q) =>
        q.required_question_id === visitFreqQuestion?.id ||
        q.question_text?.includes("방문") ||
        q.question_text?.includes("빈도")
    );

    if (visitFreqSurveyQuestion) {
      console.log("\n=== 설문의 방문빈도 질문 ===");
      console.log(`ID: ${visitFreqSurveyQuestion.id}`);
      console.log(`질문: ${visitFreqSurveyQuestion.question_text}`);
      console.log(
        `선택지:`,
        JSON.stringify(visitFreqSurveyQuestion.choices, null, 2)
      );
    }

    // 3. 방문빈도 응답 분포 확인
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("selected_option, question_id")
      .eq("survey_id", surveyId)
      .eq("required_question_category", "visit_frequency");

    if (responsesError) {
      console.error("응답 조회 오류:", responsesError);
      return;
    }

    console.log("\n=== 방문빈도 응답 분포 ===");
    console.log(`총 응답 수: ${responses.length}`);

    const choiceCount = {};
    responses.forEach((r) => {
      if (r.selected_option) {
        choiceCount[r.selected_option] =
          (choiceCount[r.selected_option] || 0) + 1;
      }
    });

    console.log("\n선택지별 분포:");
    Object.entries(choiceCount).forEach(([choice, count]) => {
      console.log(`${choice}: ${count}개`);
    });

    // 4. 선택지 텍스트 매핑
    const question = visitFreqSurveyQuestion || visitFreqQuestion;
    if (question && question.choices) {
      console.log("\n=== 선택지 텍스트 매핑 ===");
      Object.entries(choiceCount).forEach(([choiceId, count]) => {
        const choiceText = question.choices[choiceId] || "알 수 없음";
        console.log(`${choiceId} → "${choiceText}": ${count}개`);
      });
    }
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

checkVisitFrequencyChoices();
