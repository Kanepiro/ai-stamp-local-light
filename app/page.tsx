"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleGenerate() {
    setStatus("生成中…");
    setLoading(true);

    try {
      const params = new URLSearchParams({
        message: message ?? "",
        keyword: keyword ?? "",
      });

      const res = await fetch(`/api/generate?${params.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        const raw = await res.text();
        console.error("Generate error raw:", raw);
        let msg = `生成に失敗しました (status ${res.status})`;
        if (raw) {
          try {
            const body = JSON.parse(raw);
            if (body && typeof (body as any).error === "string") {
              msg = `エラー: ${(body as any).error}`;
            } else {
              msg = msg + ": " + raw.slice(0, 80);
            }
          } catch {
            msg = msg + ": " + raw.slice(0, 80);
          }
        }
        setStatus(msg);
        return;
      }

      // IMPORTANT: keep response bytes as-is (Shift_JIS/CP932) instead of decoding as UTF-8
      const blob = await res.blob();
      const filename = "prompt.txt";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setStatus("プロンプトをファイルに出力しました");
    } catch (e) {
      console.error(e);
      setStatus("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-root">
      <div className="card">
        <div className="header">
          <div className="title">AI-Stamp Local</div>
          <div className="version">v4.0.012</div>
        </div>

        <div className="row">
          <label>Message</label>
          <input
            maxLength={20}
            placeholder="PayPay銀行へ入金よろしく"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="row">
          <label>Keyword</label>
          <textarea
            rows={2}
            placeholder="麦色の毛の猫 など"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="buttons">
          <button className="primary-btn" onClick={handleGenerate} disabled={loading}>
            {loading ? "生成中…" : "プロンプト生成"}
          </button>
        </div>

        <div className="status">{status}</div>
      </div>
    </div>
  );
}
