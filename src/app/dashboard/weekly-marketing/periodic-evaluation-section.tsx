import React from "react";
import { PeriodicEvaluation } from "@/lib/periodic-marketing-types";

interface PeriodicEvaluationSectionProps {
  evaluation: PeriodicEvaluation;
  isEditing: boolean;
  onChange?: (updated: PeriodicEvaluation) => void;
}

export function PeriodicEvaluationSection({
  evaluation,
  isEditing,
  onChange,
}: PeriodicEvaluationSectionProps) {
  const handleChange = (field: keyof PeriodicEvaluation, val: string) => {
    if (onChange) {
      onChange({
        ...evaluation,
        [field]: val,
      });
    }
  };

  const sections = [
    {
      key: "highlightedResults" as const,
      title: "1. Kết quả nổi bật",
      subtitle: "Những hoạt động đã triển khai tốt, nội dung hoặc chiến dịch có hiệu quả, kết quả đáng chú ý.",
      placeholder:
        "- Đạt chỉ tiêu lượt xem video ngắn trên TikTok...\n- Chiến dịch quảng cáo Facebook miền Nam duy trì CPL tốt...\n- Lượng khách chuyển đổi tại chi nhánh Đồng Nai tăng...",
      icon: "🌟",
      borderCol: "border-emerald-200",
      bgCol: "bg-emerald-50/30",
    },
    {
      key: "issuesAndDifficulties" as const,
      title: "2. Tồn tại và khó khăn",
      subtitle: "Những vấn đề đang gặp phải, các chiến dịch chưa đạt kết quả, nguyên nhân cần cải thiện.",
      placeholder:
        "- Chi phí quảng cáo trên TikTok tăng nhẹ do CPM cạnh tranh...\n- Lượt tương tác bài viết Website còn thấp, cần tối ưu SEO bài viết...\n- Tỷ lệ chốt đơn từ tư vấn online ở một số chi nhánh còn chậm...",
      icon: "⚠️",
      borderCol: "border-amber-200",
      bgCol: "bg-amber-50/30",
    },
    {
      key: "proposalsAndRecommendations" as const,
      title: "3. Đề xuất và kiến nghị",
      subtitle: "Những đề xuất cần ban giám đốc hỗ trợ, các thay đổi cần triển khai trong kỳ tới.",
      placeholder:
        "- Đề xuất duyệt ngân sách bổ sung cho chiến dịch quảng cáo mooc ben cuối năm...\n- Đề nghị phòng kinh doanh phản hồi khách hàng trong vòng 15 phút từ khi nhận lead...\n- Hỗ trợ thêm tư liệu quay chụp thực tế từ các tổng kho...",
      icon: "💡",
      borderCol: "border-sky-200",
      bgCol: "bg-sky-50/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {sections.map((sec) => {
        const textVal = evaluation[sec.key] || "";

        return (
          <div
            key={sec.key}
            className={`p-3.5 border rounded-[4px] bg-white flex flex-col justify-between ${sec.borderCol} shadow-2xs print:border-slate-300 print:shadow-none`}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span>{sec.icon}</span>
                <h4 className="text-xs font-bold text-slate-900">{sec.title}</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-2.5 leading-snug">
                {sec.subtitle}
              </p>

              {isEditing ? (
                <textarea
                  rows={6}
                  value={textVal}
                  onChange={(e) => handleChange(sec.key, e.target.value)}
                  placeholder={sec.placeholder}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-[4px] bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                />
              ) : (
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[5rem] p-2.5 bg-slate-50/60 rounded-[4px] border border-slate-100">
                  {textVal.trim() ? (
                    textVal
                  ) : (
                    <span className="text-slate-400 italic">
                      Chưa có nội dung ghi nhận. Bấm &quot;Chỉnh sửa&quot; để bổ sung đánh giá.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
