require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function generateMoreCustomers() {
  try {
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";
    const userId = "5e1f5903-b48d-4502-95cb-838df25fbf48";

    console.log("=== 추가 고객 및 응답 데이터 생성 시작 ===");

    // 필수질문 정보
    const requiredQuestions = [
      {
        id: "5b4e8d9d-58f2-4aa3-a4b0-7d37c1b5d84a", // 재방문 의사
        type: "rating",
        category: "revisit_intention",
      },
      {
        id: "e2adf729-a02b-49e3-ab41-c1f930bac291", // 추천 의사
        type: "rating",
        category: "recommendation",
      },
      {
        id: "53ce0d38-e0e6-4584-905f-e16b22896fc9", // 전반적 만족도
        type: "rating",
        category: "overall_satisfaction",
      },
      {
        id: "6e04bb7c-043e-420b-8d83-983ab4e81b2b", // 방문빈도
        type: "single_choice",
        category: "visit_frequency",
      },
    ];

    // 2. 신규 고객 200명 생성
    const names = [
      "김민지",
      "박지유",
      "이서연",
      "최예린",
      "정수빈",
      "조하늘",
      "윤채영",
      "한소희",
      "임나연",
      "송가은",
      "신혜원",
      "권나영",
      "오유진",
      "배서현",
      "홍지아",
    ];
    const ageGroups = ["20대", "30대"];
    const genders = ["여성", "남성"];

    console.log("200명의 신규 고객 생성 중...");

    const newCustomers = [];
    for (let i = 0; i < 200; i++) {
      newCustomers.push({
        name: names[Math.floor(Math.random() * names.length)] + `_${i + 110}`,
        age_group: ageGroups[Math.floor(Math.random() * ageGroups.length)],
        gender: Math.random() > 0.25 ? "여성" : "남성", // 20대 여대생 타겟이므로 여성 비율 75%
        phone: `010${String(Math.floor(Math.random() * 100000000)).padStart(
          8,
          "0"
        )}`,
        survey_id: surveyId,
        user_id: userId,
      });
    }

    // 배치로 고객 생성 (50명씩)
    const allNewCustomerIds = [];
    for (let i = 0; i < newCustomers.length; i += 50) {
      const batch = newCustomers.slice(i, i + 50);
      const { data: createdCustomers, error: createError } = await supabase
        .from("customer_info")
        .insert(batch)
        .select("id, name");

      if (createError) {
        console.error(
          `고객 생성 오류 (배치 ${Math.floor(i / 50) + 1}):`,
          createError
        );
        continue;
      }

      allNewCustomerIds.push(...createdCustomers.map((c) => c.id));
      console.log(
        `${createdCustomers.length}명 고객 생성 완료 (배치 ${
          Math.floor(i / 50) + 1
        })`
      );
    }

    console.log(`총 ${allNewCustomerIds.length}명의 신규 고객 생성 완료`);

    // 3. 응답 생성 함수들
    function getRandomDateBetween(start, end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return new Date(
        startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime())
      );
    }

    function generateRatingResponse() {
      // 4-5점 비율을 높여서 좋은 평가 많이 생성 (평균 4.2점 정도)
      const rand = Math.random();
      if (rand < 0.45) return 5;
      if (rand < 0.75) return 4;
      if (rand < 0.92) return 3;
      if (rand < 0.98) return 2;
      return 1;
    }

    function generateVisitFrequencyChoice() {
      // 방문빈도 선택지 분산 (실제 돼지고기집 방문 패턴 반영)
      const choices = [
        "choice_1",
        "choice_2",
        "choice_3",
        "choice_4",
        "choice_5",
        "choice_6",
      ];
      const weights = [0.15, 0.25, 0.35, 0.2, 0.04, 0.01]; // 이번이 처음부터 거의 매일까지

      const rand = Math.random();
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
          return choices[i];
        }
      }
      return choices[2]; // 기본값은 '몇 달에 한 번'
    }

    // 4. 각 신규 고객에 대해 응답 생성
    console.log("=== 설문 응답 생성 중 ===");
    let totalResponsesCreated = 0;

    for (let i = 0; i < allNewCustomerIds.length; i++) {
      const customerId = allNewCustomerIds[i];
      const responseDate = getRandomDateBetween("2024-05-31", "2024-06-06");

      // 필수질문 응답 생성
      for (const question of requiredQuestions) {
        let responseData = {
          survey_id: surveyId,
          question_id: question.id,
          customer_info_id: customerId,
          user_id: userId,
          required_question_category: question.category,
          created_at: responseDate.toISOString(),
        };

        if (question.type === "rating") {
          responseData.rating = generateRatingResponse();
        } else if (
          question.type === "single_choice" &&
          question.category === "visit_frequency"
        ) {
          responseData.selected_option = generateVisitFrequencyChoice();
        }

        const { error: responseError } = await supabase
          .from("responses")
          .insert(responseData);

        if (responseError) {
          console.error(`응답 생성 오류 (고객 ${i + 1}):`, responseError);
        } else {
          totalResponsesCreated++;
        }
      }

      if ((i + 1) % 50 === 0) {
        console.log(`${i + 1}명 고객 응답 생성 완료`);
      }
    }

    console.log(`\n=== 데이터 생성 완료 ===`);
    console.log(`총 생성된 응답 수: ${totalResponsesCreated}개`);
    console.log(`신규 고객 수: ${allNewCustomerIds.length}명`);

    // 5. 최종 상황 확인
    const { data: finalResponses } = await supabase
      .from("responses")
      .select("id, required_question_category")
      .eq("survey_id", surveyId);

    const categoryCount = {};
    finalResponses?.forEach((r) => {
      const category = r.required_question_category || "null";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    console.log("\n=== 최종 카테고리별 응답 수 ===");
    console.log(categoryCount);
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

generateMoreCustomers();
