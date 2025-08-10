// netlify/functions/assignments.js

// This function persists assignments using Netlify Blobs if available.
// If Blobs are not enabled, it falls back to a temporary JSON file in /tmp,
// which is good enough for demos but not durable across cold starts.

const fs = require("fs");
const path = require("path");

const TMP_FILE = "/tmp/assignments.json";

/** Helper: read from /tmp if blobs not used */
function readTmp() {
  try { return JSON.parse(fs.readFileSync(TMP_FILE, "utf8")); }
  catch { return { assignments: {} }; }
}
function writeTmp(obj) {
  try { fs.writeFileSync(TMP_FILE, JSON.stringify(obj)); } catch {}
}

/** Try Netlify Blobs (if available) */
async function readFromBlobs() {
  try {
    const { createClient } = await import("@netlify/blobs");
    const client = createClient();               // Works on Netlify without token
    const store = client.store("ntt-assignments");
    const txt = await store.get("data");
    return txt ? JSON.parse(txt) : { assignments: {} };
  } catch (e) {
    return null; // not available
  }
}
async function writeToBlobs(data) {
  try {
    const { createClient } = await import("@netlify/blobs");
    const client = createClient();
    const store = client.store("ntt-assignments");
    await store.set("data", JSON.stringify(data), { addRandomSuffix:false, contentType: "application/json" });
    return true;
  } catch (e) {
    return false;
  }
}

exports.handler = async (event) => {
  // CORS for browser calls
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "ok" };
  }

  // Load current data (prefer Blobs)
  let data = await readFromBlobs();
  let usingBlobs = true;
  if (!data) { data = readTmp(); usingBlobs = false; }

  if (event.httpMethod === "GET") {
    return { statusCode: 200, headers: { "Content-Type": "application/json", ...cors }, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const updates = body.assignments || {};
      data.assignments = { ...data.assignments, ...updates };

      // Persist
      if (usingBlobs) {
        await writeToBlobs(data);
      } else {
        writeTmp(data);
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...cors },
        body: JSON.stringify({ ok: true, assignments: data.assignments, storage: usingBlobs ? "blobs" : "tmp" })
      };
    } catch (e) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
    }
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};
