import React from "react";
import { PeriodicActionPlanItem } from "@/lib/periodic-marketing-types";

interface PeriodicActionPlanSectionProps {
  actionPlan: PeriodicActionPlanItem[];
  isEditing: boolean;
  onChange?: (updated: PeriodicActionPlanItem[]) => void;
}

export function PeriodicActionPlanSection({
  actionPlan,
  isEditing,
  onChange,
}: PeriodicActionPlanSectionProps) {
  const handleItemChange = (id: string, field: keyof PeriodicActionPlanItem, val: string) => {
    if (!onChange) return;
    const updated = actionPlan.map((item) =>
      item.id === id ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  const handleAddItem = () => {
    if (!onChange) return;
    const newItem: PeriodicActionPlanItem = {
      id: crypto.randomUUID(),
      task: "",
      target: "",
      assignee: "Phòng Marketing",
      deadline: "",
    };
    onChange([...actionPlan, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (!onChange) return;
    onChange(actionPlan.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto border border-slate-200/90 rounded-[4px] bg-white shadow-2xs print:border-slate-300 print:shadow-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 w-2/5">Công việc / Nội dung dự kiến</th>
              <th className="py-2.5 px-3">Mục tiêu cụ thể</th>
              <th className="py-2.5 px-3 w-36">Người phụ trách</th>
              <th className="py-2.5 px-3 w-28 text-center">Thời hạn</th>
              {isEditing && <th className="py-2.5 px-2 w-12 text-center no-print">Xóa</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {actionPlan.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditing ? 6 : 5}
                  className="py-4 px-3 text-center text-xs text-slate-400 italic"
                >
                  Chưa có kế hoạch công việc nào được lập cho kỳ tiếp theo.
                </td>
              </tr>
            ) : (
              actionPlan.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-center text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.task}
                        onChange={(e) => handleItemChange(item.id, "task", e.target.value)}
                        placeholder="Nội dung bài viết, chiến dịch quảng cáo, sự kiện..."
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-[4px] bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{item.task || "—"}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.target}
                        onChange={(e) => handleItemChange(item.id, "target", e.target.value)}
                        placeholder="Số lượng video, lượt xem, mục tiêu khách QT, chốt đơn..."
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-[4px] bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-slate-700">{item.target || "—"}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.assignee}
                        onChange={(e) => handleItemChange(item.id, "assignee", e.target.value)}
                        placeholder="Nhân sự / Chi nhánh phụ trách"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-[4px] bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-slate-800 font-medium whitespace-nowrap">
                        {item.assignee || "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isEditing ? (
                      <input
                        type="date"
                        value={item.deadline}
                        onChange={(e) => handleItemChange(item.id, "deadline", e.target.value)}
                        className="w-full text-xs p-1 border border-slate-300 rounded-[4px] bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-slate-600 whitespace-nowrap">
                        {item.deadline || "—"}
                      </span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="py-2 px-2 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition-colors cursor-pointer"
                        title="Xóa đầu việc"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="flex justify-start no-print">
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-[4px] transition-colors cursor-pointer"
          >
            <span>+</span>
            <span>Thêm đầu việc kế hoạch</span>
          </button>
        </div>
      )}
    </div>
  );
}
