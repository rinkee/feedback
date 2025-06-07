require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDataDates() {
  try {
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";

    console.log("=== 응답 데이터 날짜 분석 ===");

    // 1. 응답 날짜 분포 확인
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(
        "id, created_at, required_question_category, rating, selected_option"
      )
      .eq("survey_id", surveyId)
      .order("created_at", { ascending: false });

    if (responsesError) {
      console.error("응답 조회 오류:", responsesError);
      return;
    }

    console.log(`총 응답 수: ${responses.length}`);

    // 날짜별 응답 수 계산
    const dateCount = {};
    responses.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString("ko-KR");
      dateCount[date] = (dateCount[date] || 0) + 1;
    });

    console.log("\n날짜별 응답 수:");
    Object.entries(dateCount)
      .sort()
      .forEach(([date, count]) => {
        console.log(`${date}: ${count}개`);
      });

    // 최신/최오래된 응답 확인
    const latestResponse = responses[0];
    const oldestResponse = responses[responses.length - 1];

    console.log(
      `\n최신 응답: ${new Date(latestResponse.created_at).toLocaleString(
        "ko-KR"
      )}`
    );
    console.log(
      `가장 오래된 응답: ${new Date(oldestResponse.created_at).toLocaleString(
        "ko-KR"
      )}`
    );

    // 2. 방문빈도 응답 확인
    console.log("\n=== 방문빈도 응답 분석 ===");
    const visitFrequencyResponses = responses.filter(
      (r) => r.required_question_category === "visit_frequency"
    );

    console.log(`방문빈도 응답 수: ${visitFrequencyResponses.length}`);

    // 선택지별 분포
    const choiceCount = {};
    visitFrequencyResponses.forEach((r) => {
      if (r.selected_option) {
        choiceCount[r.selected_option] =
          (choiceCount[r.selected_option] || 0) + 1;
      }
    });

    console.log("\n선택지별 분포:");
    Object.entries(choiceCount).forEach(([choice, count]) => {
      console.log(`${choice}: ${count}개`);
    });

    // 3. 현재 날짜와 비교
    const now = new Date();
    const today = now.toLocaleDateString("ko-KR");
    const yesterday = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toLocaleDateString("ko-KR");
    const lastWeek = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toLocaleDateString("ko-KR");

    console.log(`\n=== 날짜 비교 ===`);
    console.log(`오늘: ${today}`);
    console.log(`어제: ${yesterday}`);
    console.log(`일주일 전: ${lastWeek}`);

    // 최근 7일 데이터 확인
    const recentResponses = responses.filter((r) => {
      const responseDate = new Date(r.created_at);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return responseDate >= weekAgo;
    });

    console.log(`최근 7일 응답 수: ${recentResponses.length}`);
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

checkDataDates();
