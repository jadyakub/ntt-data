// netlify/functions/notify-telegram.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID  = process.env.TELEGRAM_CHAT_ID;
  const TELEGRAM_THREAD_ID = process.env.TELEGRAM_THREAD_ID || undefined; // optional

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { statusCode: 500, body: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // escape untuk parse_mode: "HTML"
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const nttNumber = esc(payload.nttNumber || "NTT-UNKNOWN");
  const team      = esc(payload.team || "-");
  const node      = esc(payload.node || "-");
  const networkId = esc(payload.networkId || "-");
  const aging     = esc(payload.aging || "-");

  // === format mesej baharu (tanpa URL View) ===
  const text = [
    "✅ <b>NTT RESOLVED</b>",
    `<b>NTT:</b> ${nttNumber}`,
    `<b>Team:</b> <b>${team}</b>`,
    `<b>Node:</b> ${node}`,
    `<b>Network ID:</b> ${networkId}`,
    `<b>Aging:</b> ${aging}`
  ].join("\n");

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (TELEGRAM_THREAD_ID) body.message_thread_id = Number(TELEGRAM_THREAD_ID);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.text();
    if (!res.ok) {
      return { statusCode: res.status, body: `Telegram API failed: ${data}` };
    }
    return { statusCode: 200, body: data };
  } catch (err) {
    return { statusCode: 502, body: String(err) };
  }
};
