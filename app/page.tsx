"use client";
import { useState } from "react";

export default function Home() {
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState([""]);
  const [created, setCreated] = useState(false);

  const addDate = () => setDates([...dates, ""]);

  const updateDate = (index: number, value: string) => {
    const newDates = [...dates];
    newDates[index] = value;
    setDates(newDates);
  };

  const handleCreate = () => {
    if (title && dates.some((d) => d)) {
      setCreated(true);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        {!created ? (
          <>
            <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">
              📅 日程調整
            </h1>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                イベント名
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：飲み会、会議"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                候補日程
              </label>
              {dates.map((date, index) => (
                <input
                  key={index}
                  type="date"
                  value={date}
                  onChange={(e) => updateDate(index, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ))}
              <button
                onClick={addDate}
                className="text-blue-500 text-sm mt-1 hover:underline"
              >
                ＋ 日程を追加する
              </button>
            </div>
            <button
              onClick={handleCreate}
              className="w-full bg-blue-500 text-white rounded-lg py-2 font-bold hover:bg-blue-600 transition"
            >
              作成する
            </button>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold text-blue-600 mb-4">
              🎉 作成完了！
            </h2>
            <p className="text-gray-700 mb-2">イベント名：{title}</p>
            <p className="text-gray-500 text-sm mb-6">
              候補日：{dates.filter((d) => d).join("、")}
            </p>
            <button
              onClick={() => { setCreated(false); setTitle(""); setDates([""]); }}
              className="text-blue-500 hover:underline text-sm"
            >
              最初からやり直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}