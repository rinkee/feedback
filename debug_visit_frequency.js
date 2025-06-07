require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugVisitFrequency() {
  try {
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";

    console.log("=== 방문빈도 선택지 매핑 테스트 ===");

    // 1. 필수 질문에서 방문빈도 정보 조회
    const { data: requiredQuestions, error: reqError } = await supabase
      .from("required_questions")
      .select("*")
      .eq("category", "visit_frequency")
      .single();

    if (reqError) {
      console.error("필수 질문 조회 오류:", reqError);
      return;
    }

    console.log("=== 방문빈도 필수 질문 ===");
    console.log("카테고리:", requiredQuestions.category);
    console.log("질문 텍스트:", requiredQuestions.question_text);
    console.log("질문 타입:", requiredQuestions.question_type);
    console.log(
      "선택지 옵션:",
      JSON.stringify(requiredQuestions.options, null, 2)
    );

    // 2. 방문빈도 응답 샘플 조회
    const { data: responses, error: respError } = await supabase
      .from("responses")
      .select("selected_option")
      .eq("survey_id", surveyId)
      .eq("required_question_category", "visit_frequency")
      .limit(10);

    if (respError) {
      console.error("응답 조회 오류:", respError);
      return;
    }

    console.log("\n=== 응답 샘플 ===");
    responses.forEach((r, i) => {
      console.log(`${i + 1}. ${r.selected_option}`);
    });

    // 3. 선택지 매핑 테스트
    console.log("\n=== 선택지 매핑 테스트 ===");

    if (requiredQuestions.options?.choices_text) {
      console.log("선택지 배열:", requiredQuestions.options.choices_text);

      responses.forEach((r, i) => {
        const choiceId = r.selected_option;
        const choiceIndex = parseInt(choiceId.replace("choice_", "")) - 1;

        console.log(`\n응답 ${i + 1}:`);
        console.log(`  선택지 ID: ${choiceId}`);
        console.log(`  인덱스: ${choiceIndex}`);

        if (
          choiceIndex >= 0 &&
          choiceIndex < requiredQuestions.options.choices_text.length
        ) {
          const choiceText =
            requiredQuestions.options.choices_text[choiceIndex];
          console.log(`  매핑된 텍스트: "${choiceText}"`);
        } else {
          console.log(`  매핑 실패: 인덱스 범위 벗어남`);
        }
      });

      // 4. 모든 선택지를 0으로 초기화하는 분포 생성 테스트
      console.log("\n=== 분포 초기화 테스트 ===");
      const distribution = {};

      requiredQuestions.options.choices_text.forEach((choice) => {
        distribution[choice] = 0;
      });

      console.log("초기화된 분포:", distribution);

      // 응답 카운트 추가
      responses.forEach((r) => {
        const choiceIndex =
          parseInt(r.selected_option.replace("choice_", "")) - 1;
        if (
          choiceIndex >= 0 &&
          choiceIndex < requiredQuestions.options.choices_text.length
        ) {
          const choiceText =
            requiredQuestions.options.choices_text[choiceIndex];
          distribution[choiceText] = (distribution[choiceText] || 0) + 1;
        }
      });

      console.log("응답 반영 후 분포:", distribution);
    }
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

debugVisitFrequency();
