"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

type Event = {
  id: number;
  title: string;
  dates: string;
  slug: string;
};

type Response = {
  id: number;
  name: string;
  answers: string;
  comment: string;
};

const formatDate = (dateStr: string) => {
  const datePart = dateStr.split(" ")[0];
  const timePart = dateStr.includes(" ") ? " " + dateStr.split(" ")[1] : "";
  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const youbi = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${month}月${day}日（${youbi}）${timePart}`;
};

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingResponse, setEditingResponse] = useState<Response | null>(null);
  const [editAnswers, setEditAnswers] = useState<string[]>([]);
  const [editComment, setEditComment] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  const loadEvent = async () => {
    const { data: eventData } = await supabase
      .from("chosei_events")
      .select("*")
      .eq("slug", slug)
      .single();

    if (eventData) {
      setEvent(eventData);
      setAnswers(JSON.parse(eventData.dates).map(() => "×"));
      const { data: responseData } = await supabase
        .from("chosei_responses")
        .select("*")
        .eq("event_id", eventData.id);
      setResponses(responseData || []);
    }
  };

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!name || !event) return;
    await supabase.from("chosei_responses").insert({
      event_id: event.id,
      name,
      answers: JSON.stringify(answers),
      comment,
    });
    setName("");
    setComment("");
    setAnswers(JSON.parse(event.dates).map(() => "×"));
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 2000);
    loadEvent();
  };

  const handleDelete = async () => {
    if (!event) return;
    await supabase.from("chosei_responses").delete().eq("event_id", event.id);
    await supabase.from("chosei_events").delete().eq("id", event.id);
    router.push("/");
  };

  const startEdit = (response: Response) => {
    setEditingResponse(response);
    setEditAnswers(JSON.parse(response.answers));
    setEditComment(response.comment);
    setShowForm(false);
  };

  const handleEditSave = async () => {
    if (!editingResponse) return;
    await supabase.from("chosei_responses").update({
      answers: JSON.stringify(editAnswers),
      comment: editComment,
    }).eq("id", editingResponse.id);
    setEditingResponse(null);
    loadEvent();
  };

  const handleDeleteResponse = async (responseId: number) => {
    await supabase.from("chosei_responses").delete().eq("id", responseId);
    setEditingResponse(null);
    loadEvent();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!event) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  const dates: string[] = JSON.parse(event.dates);

  const getStats = (i: number) => {
    const maru = responses.filter((r) => JSON.parse(r.answers)[i] === "○").length;
    const sank = responses.filter((r) => JSON.parse(r.answers)[i] === "△").length;
    const batu = responses.filter((r) => JSON.parse(r.answers)[i] === "×").length;
    return { maru, sank, batu };
  };

  const getMaruBestIndices = () => {
    let best = 0;
    dates.forEach((_, i) => {
      const { maru } = getStats(i);
      if (maru > best) best = maru;
    });
    if (best === 0) return [];
    return dates.map((_, i) => getStats(i).maru === best ? i : -1).filter(i => i !== -1);
  };

  const getCombinedBestIndices = () => {
    let best = 0;
    dates.forEach((_, i) => {
      const { maru, sank } = getStats(i);
      if (maru + sank > best) best = maru + sank;
    });
    if (best === 0) return [];
    return dates.map((_, i) => {
      const { maru, sank } = getStats(i);
      return maru + sank === best ? i : -1;
    }).filter(i => i !== -1);
  };

  const maruBestIndices = responses.length > 0 ? getMaruBestIndices() : [];
  const combinedBestIndices = responses.length > 0 ? getCombinedBestIndices() : [];

  const getRowStyle = (i: number) => {
    if (maruBestIndices.includes(i)) return "bg-green-50";
    if (combinedBestIndices.includes(i)) return "bg-yellow-50";
    return "";
  };

  const getRowIcon = (i: number) => {
    if (maruBestIndices.includes(i)) return <span className="text-green-500 mr-1">★</span>;
    if (combinedBestIndices.includes(i)) return <span className="text-yellow-500 mr-1">☆</span>;
    return null;
  };

  const firstResponse = responses.length > 0 ? responses[0] : null;
  const hasMore = responses.length > 1;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <a href="/" className="text-sm text-green-500 hover:underline">← トップページに戻る</a>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-400 hover:text-red-600 border border-red-300 rounded-lg px-3 py-1 hover:bg-red-50 transition"
            >
              🗑 イベントを削除
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-600 font-medium mb-3">本当に削除しますか？この操作は元に戻せません。</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-red-600 transition"
                >
                  削除する
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-bold hover:bg-gray-300 transition"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-800">{event.title}</h2>
            <button
              onClick={handleCopyLink}
              className="text-sm text-green-500 border border-green-300 rounded-lg px-3 py-1 hover:bg-green-50 transition whitespace-nowrap ml-2"
            >
              {copied ? "✅ コピーしました！" : "🔗 リンクをコピー"}
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-2">回答者 {responses.length}名　<span className="text-xs text-gray-400">（名前をクリックで修正）</span></p>
          <div className="flex gap-4 text-xs text-gray-500 mb-4">
            <span><span className="text-green-500">★</span> ○が最多</span>
            <span><span className="text-yellow-500">☆</span> ○＋△が最多</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left text-gray-600 whitespace-nowrap">日程</th>
                  <th className="border border-gray-200 px-3 py-2 text-green-600">○</th>
                  <th className="border border-gray-200 px-3 py-2 text-yellow-500">△</th>
                  <th className="border border-gray-200 px-3 py-2 text-red-400">×</th>
                  {firstResponse && (
                    <th className="border border-gray-200 px-3 py-2 text-gray-600 whitespace-nowrap">
                      <button
                        onClick={() => startEdit(firstResponse)}
                        className="text-green-600 hover:underline font-medium"
                      >
                        {firstResponse.name}
                      </button>
                    </th>
                  )}
                  {hasMore && (
                    <th className="border border-gray-200 px-3 py-2 text-gray-400 whitespace-nowrap text-xs">
                      他{responses.length - 1}名 →
                    </th>
                  )}
                  {responses.slice(1).map((r, i) => (
                    <th key={i} className="border border-gray-200 px-3 py-2 text-gray-600 whitespace-nowrap">
                      <button
                        onClick={() => startEdit(r)}
                        className="text-green-600 hover:underline font-medium"
                      >
                        {r.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((date, i) => {
                  const { maru, sank, batu } = getStats(i);
                  return (
                    <tr key={i} className={getRowStyle(i)}>
                      <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                        {getRowIcon(i)}
                        {formatDate(date)}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-center text-green-600 font-bold">{maru}人</td>
                      <td className="border border-gray-200 px-3 py-2 text-center text-yellow-500 font-bold">{sank}人</td>
                      <td className="border border-gray-200 px-3 py-2 text-center text-red-400 font-bold">{batu}人</td>
                      {firstResponse && (
                        <td className={`border border-gray-200 px-3 py-2 text-center font-bold ${
                          JSON.parse(firstResponse.answers)[i] === "○" ? "text-green-500 bg-green-50"
                          : JSON.parse(firstResponse.answers)[i] === "△" ? "text-yellow-500 bg-yellow-50"
                          : "text-red-400 bg-red-50"
                        }`}>
                          {JSON.parse(firstResponse.answers)[i]}
                        </td>
                      )}
                      {hasMore && (
                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-300 text-xs">…</td>
                      )}
                      {responses.slice(1).map((r, j) => {
                        const a = JSON.parse(r.answers)[i];
                        return (
                          <td key={j} className={`border border-gray-200 px-3 py-2 text-center font-bold ${
                            a === "○" ? "text-green-500 bg-green-50"
                            : a === "△" ? "text-yellow-500 bg-yellow-50"
                            : "text-red-400 bg-red-50"
                          }`}>{a}</td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 text-gray-600 font-medium">コメント</td>
                  <td className="border border-gray-200 px-3 py-2" colSpan={3} />
                  {firstResponse && (
                    <td className="border border-gray-200 px-3 py-2 text-gray-500 text-xs">{firstResponse.comment}</td>
                  )}
                  {hasMore && (
                    <td className="border border-gray-200 px-3 py-2 text-gray-300 text-xs">…</td>
                  )}
                  {responses.slice(1).map((r, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-2 text-gray-500 text-xs">{r.comment}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {submitted && (
            <p className="text-green-500 text-center mt-3 font-medium">✅ 登録しました！</p>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => { setShowForm(!showForm); setEditingResponse(null); }}
              className="bg-green-500 text-white rounded-full w-32 h-32 text-lg font-bold hover:bg-green-600 transition shadow-lg"
            >
              出欠を
              <br />
              入力する
            </button>
          </div>
        </div>

        {editingResponse && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">✏️ {editingResponse.name} の回答を修正</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">日程候補</label>
              {dates.map((date, index) => (
                <div key={index} className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">{formatDate(date)}</span>
                  <div className="flex gap-2">
                    {["○", "△", "×"].map((mark) => (
                      <button
                        key={mark}
                        onClick={() => {
                          const newAnswers = [...editAnswers];
                          newAnswers[index] = mark;
                          setEditAnswers(newAnswers);
                        }}
                        className={`w-10 h-10 rounded-full font-bold border-2 transition ${
                          editAnswers[index] === mark
                            ? mark === "○" ? "bg-green-500 text-white border-green-500"
                            : mark === "△" ? "bg-yellow-400 text-white border-yellow-400"
                            : "bg-red-400 text-white border-red-400"
                            : "bg-white text-gray-400 border-gray-300"
                        }`}
                      >
                        {mark}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
              <input
                type="text"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                className="flex-1 bg-green-500 text-white rounded-lg py-3 font-bold hover:bg-green-600 transition"
              >
                保存する
              </button>
              <button
                onClick={() => handleDeleteResponse(editingResponse.id)}
                className="bg-red-400 text-white rounded-lg px-4 py-3 font-bold hover:bg-red-500 transition"
              >
                削除
              </button>
              <button
                onClick={() => setEditingResponse(null)}
                className="bg-gray-200 text-gray-700 rounded-lg px-4 py-3 font-bold hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">出欠を入力する</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田太郎"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">日程候補</label>
              {dates.map((date, index) => (
                <div key={index} className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">{formatDate(date)}</span>
                  <div className="flex gap-2">
                    {["○", "△", "×"].map((mark) => (
                      <button
                        key={mark}
                        onClick={() => updateAnswer(index, mark)}
                        className={`w-10 h-10 rounded-full font-bold border-2 transition ${
                          answers[index] === mark
                            ? mark === "○" ? "bg-green-500 text-white border-green-500"
                            : mark === "△" ? "bg-yellow-400 text-white border-yellow-400"
                            : "bg-red-400 text-white border-red-400"
                            : "bg-white text-gray-400 border-gray-300"
                        }`}
                      >
                        {mark}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="例：少し遅れるかもしれません"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!name}
              className="w-full bg-green-500 text-white rounded-lg py-3 font-bold hover:bg-green-600 transition disabled:opacity-40"
            >
              入力する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
