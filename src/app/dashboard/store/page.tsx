"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  MapPin,
  Phone,
  Users,
  DollarSign,
  Clock,
  FileText,
  Tags,
  Save,
  ArrowLeft,
  Plus,
  X,
  ChefHat,
  Activity,
} from "lucide-react";

interface StoreInfo {
  id?: string;
  store_name: string;
  store_type_broad: string;
  location: string;
  address: string;
  phone: string;
  target_audience: string;
  menu: MenuItem[];
  business_hours: BusinessHours;
  description: string;
  features: string[];
  price_range: string;
}

interface MenuItem {
  name: string;
  price: number;
  category: string;
  description?: string;
}

interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

const defaultBusinessHours: BusinessHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "18:00", closed: false },
  sunday: { open: "09:00", close: "18:00", closed: true },
};

export default function StorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    store_name: "",
    store_type_broad: "",
    location: "",
    address: "",
    phone: "",
    target_audience: "",
    menu: [],
    business_hours: defaultBusinessHours,
    description: "",
    features: [],
    price_range: "",
  });
  const [newFeature, setNewFeature] = useState("");
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({
    name: "",
    price: 0,
    category: "",
    description: "",
  });

  const fetchStoreInfo = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (storeError && storeError.code !== "PGRST116") {
        console.error("Error fetching store:", storeError);
      } else if (storeData) {
        setStoreInfo({
          id: storeData.id,
          store_name: storeData.store_name || "",
          store_type_broad: storeData.store_type_broad || "",
          location: storeData.location || "",
          address: storeData.address || "",
          phone: storeData.phone || "",
          target_audience: storeData.target_audience || "",
          menu: storeData.menu || [],
          business_hours: storeData.business_hours || defaultBusinessHours,
          description: storeData.description || "",
          features: storeData.features || [],
          price_range: storeData.price_range || "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStoreInfo();
  }, [fetchStoreInfo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const storeData = {
        user_id: session.user.id,
        store_name: storeInfo.store_name,
        store_type_broad: storeInfo.store_type_broad,
        location: storeInfo.location,
        address: storeInfo.address,
        phone: storeInfo.phone,
        target_audience: storeInfo.target_audience,
        menu: storeInfo.menu,
        business_hours: storeInfo.business_hours,
        description: storeInfo.description,
        features: storeInfo.features,
        price_range: storeInfo.price_range,
        business_registration_number: "temp", // 필수 필드이므로 임시값
      };

      let result;
      if (storeInfo.id) {
        result = await supabase
          .from("stores")
          .update(storeData)
          .eq("id", storeInfo.id);
      } else {
        result = await supabase.from("stores").insert([storeData]);
      }

      if (result.error) {
        throw result.error;
      }

      alert("가게 정보가 성공적으로 저장되었습니다!");
      if (!storeInfo.id) {
        fetchStoreInfo(); // 새로 생성된 경우 ID를 가져오기 위해 다시 조회
      }
    } catch (error) {
      console.error("Error saving store:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setStoreInfo({
        ...storeInfo,
        features: [...storeInfo.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setStoreInfo({
      ...storeInfo,
      features: storeInfo.features.filter((_, i) => i !== index),
    });
  };

  const addMenuItem = () => {
    if (newMenuItem.name && newMenuItem.price > 0) {
      setStoreInfo({
        ...storeInfo,
        menu: [...storeInfo.menu, newMenuItem],
      });
      setNewMenuItem({ name: "", price: 0, category: "", description: "" });
    }
  };

  const removeMenuItem = (index: number) => {
    setStoreInfo({
      ...storeInfo,
      menu: storeInfo.menu.filter((_, i) => i !== index),
    });
  };

  const updateBusinessHours = (
    day: keyof BusinessHours,
    field: string,
    value: string | boolean
  ) => {
    setStoreInfo({
      ...storeInfo,
      business_hours: {
        ...storeInfo.business_hours,
        [day]: {
          ...storeInfo.business_hours[day],
          [field]: value,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">가게 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              대시보드로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">내 가게 정보</h1>
            <p className="text-gray-600 mt-1">
              가게 정보를 입력하여 맞춤형 설문과 AI 분석을 받아보세요
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <Activity className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Store className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가게 이름 *
                </label>
                <input
                  type="text"
                  value={storeInfo.store_name}
                  onChange={(e) =>
                    setStoreInfo({ ...storeInfo, store_name: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 맛있는 카페"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업종 *
                </label>
                <select
                  value={storeInfo.store_type_broad}
                  onChange={(e) =>
                    setStoreInfo({
                      ...storeInfo,
                      store_type_broad: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">업종을 선택하세요</option>
                  <option value="restaurant">식당</option>
                  <option value="cafe">카페</option>
                  <option value="retail">소매점</option>
                  <option value="service">서비스업</option>
                  <option value="beauty">미용업</option>
                  <option value="healthcare">의료업</option>
                  <option value="education">교육업</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  위치 *
                </label>
                <input
                  type="text"
                  value={storeInfo.location}
                  onChange={(e) =>
                    setStoreInfo({ ...storeInfo, location: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 서울시 강남구"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  전화번호
                </label>
                <input
                  type="tel"
                  value={storeInfo.phone}
                  onChange={(e) =>
                    setStoreInfo({ ...storeInfo, phone: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 02-1234-5678"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상세 주소
                </label>
                <input
                  type="text"
                  value={storeInfo.address}
                  onChange={(e) =>
                    setStoreInfo({ ...storeInfo, address: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 테헤란로 123길 45 1층"
                />
              </div>
            </div>
          </div>

          {/* 타겟층 & 가격대 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                타겟층 & 가격대
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주 타겟층
                </label>
                <input
                  type="text"
                  value={storeInfo.target_audience}
                  onChange={(e) =>
                    setStoreInfo({
                      ...storeInfo,
                      target_audience: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 20-30대 직장인, 대학생, 가족 단위 고객"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  가격대
                </label>
                <select
                  value={storeInfo.price_range}
                  onChange={(e) =>
                    setStoreInfo({ ...storeInfo, price_range: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">가격대를 선택하세요</option>
                  <option value="저가">저가 (1만원 이하)</option>
                  <option value="중저가">중저가 (1-2만원)</option>
                  <option value="중가">중가 (2-4만원)</option>
                  <option value="중고가">중고가 (4-6만원)</option>
                  <option value="고가">고가 (6만원 이상)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 메뉴 정보 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <ChefHat className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">메뉴 정보</h2>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">새 메뉴 추가</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="메뉴명"
                    value={newMenuItem.name}
                    onChange={(e) =>
                      setNewMenuItem({ ...newMenuItem, name: e.target.value })
                    }
                    className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="가격"
                    value={newMenuItem.price || ""}
                    onChange={(e) =>
                      setNewMenuItem({
                        ...newMenuItem,
                        price: parseInt(e.target.value) || 0,
                      })
                    }
                    className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="카테고리"
                    value={newMenuItem.category}
                    onChange={(e) =>
                      setNewMenuItem({
                        ...newMenuItem,
                        category: e.target.value,
                      })
                    }
                    className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addMenuItem}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {storeInfo.menu.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">등록된 메뉴</h3>
                  {storeInfo.menu.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 ml-2">
                          {item.price.toLocaleString()}원
                        </span>
                        {item.category && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded ml-2">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeMenuItem(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 가게 특징 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Tags className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">가게 특징</h2>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="가게의 특징이나 장점을 입력하세요"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addFeature()}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addFeature}
                  className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {storeInfo.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {storeInfo.features.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                    >
                      <span>{feature}</span>
                      <button
                        onClick={() => removeFeature(index)}
                        className="text-orange-500 hover:text-orange-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 가게 소개 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">가게 소개</h2>
            </div>

            <textarea
              value={storeInfo.description}
              onChange={(e) =>
                setStoreInfo({ ...storeInfo, description: e.target.value })
              }
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="가게에 대한 자세한 소개를 작성해주세요. 분위기, 특별한 점, 자랑거리 등을 포함하면 더욱 맞춤형 설문을 받을 수 있습니다."
            />
          </div>

          {/* 영업시간 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Clock className="h-5 w-5 text-teal-600" />
              <h2 className="text-xl font-semibold text-gray-900">영업시간</h2>
            </div>

            <div className="space-y-3">
              {Object.entries(storeInfo.business_hours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-700 capitalize">
                    {day === "monday" && "월"}
                    {day === "tuesday" && "화"}
                    {day === "wednesday" && "수"}
                    {day === "thursday" && "목"}
                    {day === "friday" && "금"}
                    {day === "saturday" && "토"}
                    {day === "sunday" && "일"}
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!hours.closed}
                      onChange={(e) =>
                        updateBusinessHours(
                          day as keyof BusinessHours,
                          "closed",
                          !e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">영업</span>
                  </label>
                  {!hours.closed && (
                    <>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) =>
                          updateBusinessHours(
                            day as keyof BusinessHours,
                            "open",
                            e.target.value
                          )
                        }
                        className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-500">~</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) =>
                          updateBusinessHours(
                            day as keyof BusinessHours,
                            "close",
                            e.target.value
                          )
                        }
                        className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </>
                  )}
                  {hours.closed && (
                    <span className="text-gray-500 text-sm">휴무</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
