"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function Calendar({
  selectedDates,
  onToggle,
}: {
  selectedDates: string[];
  onToggle: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const toKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const isPast = (d: number) => {
    const date = new Date(year, month, d);
    return date < today;
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="border border-gray-200 rounded-xl p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-gray-500 hover:text-green-500 px-2 text-sm">＜</button>
        <span className="font-bold text-gray-700 text-sm">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="text-gray-500 hover:text-green-500 px-2 text-sm">＞</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {DAYS.map((d, i) => (
          <div key={d} className={i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-xs gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = toKey(d);
          const selected = selectedDates.some(s => s.startsWith(key));
          const past = isPast(d);
          const dow = (firstDay + d - 1) % 7;
          return (
            <button
              key={i}
              onClick={() => !past && onToggle(key)}
              disabled={past}
              className={`w-7 h-7 mx-auto rounded-full font-medium transition ${
                past ? "text-gray-300 cursor-not-allowed"
                : selected ? "bg-green-500 text-white"
                : dow === 0 ? "text-red-400 hover:bg-red-50"
                : dow === 6 ? "text-blue-400 hover:bg-blue-50"
                : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Event = {
  id: number;
  title: string;
  slug: string;
  dates: string;
  created_at: string;
};

const formatEventDates = (datesJson: string) => {
  try {
    const dates: string[] = JSON.parse(datesJson);
    if (dates.length === 0) return "";
    const first = dates[0].split(" ")[0];
    const last = dates[dates.length - 1].split(" ")[0];
    const [, fm, fd] = first.split("-").map(Number);
    const [, lm, ld] = last.split("-").map(Number);
    if (first === last) return `${fm}月${fd}日`;
    if (fm === lm) return `${fm}月${fd}日〜${ld}日`;
    return `${fm}月${fd}日〜${lm}月${ld}日`;
  } catch {
    return "";
  }
};

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [useTime, setUseTime] = useState(false);
  const [time, setTime] = useState("19:00〜");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("chosei_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);
    setEvents(data || []);
  };

  const toggleDate = (dateKey: string) => {
    setSelectedDates((prev) => {
      const exists = prev.some(d => d.startsWith(dateKey));
      if (exists) return prev.filter(d => !d.startsWith(dateKey));
      const value = useTime ? `${dateKey} ${time}` : dateKey;
      return [...prev, value].sort();
    });
  };

  const handleTimeToggle = (checked: boolean) => {
    setUseTime(checked);
    if (checked) {
      setSelectedDates(prev => prev.map(d => {
        const dateKey = d.split(" ")[0];
        return `${dateKey} ${time}`;
      }));
    } else {
      setSelectedDates(prev => prev.map(d => d.split(" ")[0]));
    }
  };

  const handleCreate = async () => {
    if (!title || selectedDates.length === 0) return;
    setLoading(true);
    const slug = Math.random().toString(36).substring(2, 10);
    const { error } = await supabase.from("chosei_events").insert({
      title,
      dates: JSON.stringify(selectedDates),
      slug,
    });
    if (!error) {
      router.push(`/event/${slug}`);
    } else {
      console.error("エラー:", error);
    }
    setLoading(false);
  };

  const handleCopyTopLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-green-600">📅 調整くん</h1>
            <button
              onClick={handleCopyTopLink}
              className="text-sm text-green-500 border border-green-300 rounded-lg px-3 py-1 hover:bg-green-50 transition"
            >
              {copied ? "✅ コピーしました！" : "🔗 リンクをコピー"}
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">イベント名</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：飲み会、会議"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="useTime"
                checked={useTime}
                onChange={(e) => handleTimeToggle(e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              <label htmlFor="useTime" className="text-sm font-medium text-gray-700">日付の後に時刻を追加する</label>
            </div>
            {useTime && (
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="例：19:00〜"
                className="w-40 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-2"
              />
            )}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">候補日程（クリックで選択）</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-auto">
                <Calendar selectedDates={selectedDates} onToggle={toggleDate} />
              </div>
              {events.length > 0 && (
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2">直近のイベント</p>
                  <div className="flex flex-col gap-2">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => router.push(`/event/${event.slug}`)}
                        className="text-left border border-gray-200 rounded-xl px-3 py-2 hover:border-green-400 hover:bg-green-50 transition"
                      >
                        <div className="font-medium text-gray-800 text-sm">{event.title}</div>
                        <div className="text-xs text-gray-400">{formatEventDates(event.dates)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!title || selectedDates.length === 0 || loading}
            className="w-full bg-green-500 text-white rounded-lg py-3 font-bold hover:bg-green-600 transition disabled:opacity-40"
          >
            {loading ? "作成中..." : "出欠表をつくる"}
          </button>
        </div>
      </div>
    </div>
  );
}
