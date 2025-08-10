// netlify/functions/notify-telegram.js
// Sends a private Telegram message when an NTT is resolved.
// Requires env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Optional env var: TELEGRAM_THREAD_ID (for forum topics in supergroups)

export async function handler(event) {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_THREAD_ID } = process.env;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" }),
      };
    }

    // Basic sanitization for HTML mode
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const payload = JSON.parse(event.body || "{}");
    const nttNumber  = esc(payload.nttNumber || "NTT-UNKNOWN");
    const team       = esc(payload.team || "-");
    const node       = esc(payload.node || "-");
    const networkId  = esc(payload.networkId || "-");
    const aging      = esc(payload.aging || "-");
    const viewUrl    = String(payload.viewUrl || "").trim();

    // Build message (HTML parse mode for clean formatting)
    const parts = [
      "✅ <b>NTT RESOLVED</b>",
      `<b>NTT:</b> ${nttNumber}`,
      `<b>Team:</b> ${team}`,
      `<b>Node:</b> ${node}`,
      `<b>Network ID:</b> ${networkId}`,
      `<b>Aging:</b> ${aging}`,
    ];
    if (viewUrl) parts.push(`\n<a href="${esc(viewUrl)}">View</a>`);

    const text = parts.join("\n");

    // Telegram API call
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    // Optional: send to a specific topic/thread inside a forum supergroup
    if (TELEGRAM_THREAD_ID) {
      body.message_thread_id = Number(TELEGRAM_THREAD_ID);
    }

    const resp = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok || !data?.ok) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Telegram API failed", detail: data }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        message_id: data.result?.message_id,
        chat: data.result?.chat?.id,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || String(err) }),
    };
  }
}
