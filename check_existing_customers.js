require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkExistingCustomers() {
  try {
    console.log("=== 기존 고객들의 연령대 확인 ===");

    const { data: customers, error } = await supabase
      .from("customer_info")
      .select("id, name, age_group, gender")
      .limit(20);

    if (error) {
      console.error("오류:", error);
      return;
    }

    console.log("기존 고객 샘플:");
    customers.forEach((c, i) => {
      console.log(
        `${i + 1}. ${c.name} - 연령대: "${c.age_group}", 성별: "${c.gender}"`
      );
    });

    // 연령대 종류 확인
    const ageGroups = [...new Set(customers.map((c) => c.age_group))];
    console.log("\n사용된 연령대 종류:", ageGroups);
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

checkExistingCustomers();
