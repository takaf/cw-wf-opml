// content_script.js  v2.1 – bullet + block-quote 形式

console.log("[CW→WF] script injected ✅", location.href);

/* ------- 最新の選択をキャッシュ ------- */
let cache = { text: null, node: null };

document.addEventListener("selectionchange", () => {
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed) {
    cache.text = sel.toString().trim();
    cache.node = sel.anchorNode;
  }
});

function escXml(str) {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

function escXmlNote(str) {
  // XMLエスケープ → 改行を &#10; に（順番重要）
  return escXml(str).replace(/\r?\n/g, "&#10;");
}

/* ------- 部屋 ID 取得 ------- */
function getRoomId() {
  const h = /rid(\d+)/.exec(location.hash);
  if (h) return h[1];
  const q = /room_id=(\d+)/.exec(location.search);
  if (q) return q[1];
  const meta = document.querySelector('meta[name="cw-room-id"]');
  return meta?.content || null;
}

/* ------- メッセージ ID 取得 (Shadow DOM 対応) ------- */
function findMsgId(node) {
  const seen = new Set();
  while (node && !seen.has(node)) {
    seen.add(node);

    const idAttr = node.dataset?.mid || node.dataset?.msgid;
    if (idAttr) return idAttr;

    if (node.id?.startsWith("message-")) return node.id.split("-").pop();

    const cls = node.className?.toString();
    const m   = cls && cls.match(/(?:msg|chatMessage)-(\d+)/);
    if (m) return m[1];

    node = node.parentNode || node.host || null; // ShadowRoot 対応
  }
  return null;
}

/* ------- クリップボード書き込み ------- */
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity  = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/* --- OPML 文字列を生成 --- */
function buildOPML() {
  if (!cache.text || !cache.node) return null;

  const msgId = findMsgId(cache.node);
  const rid   = getRoomId();
  if (!msgId || !rid) return null;

  const url = `${location.origin}/#!rid${rid}-${msgId}`;

  // aid/time は “最小改修” でフォールバック（必要なら後で本物を取りに行く）
  const aid  = "0";
  const time = String(Math.floor(Date.now() / 1000));

  const bulletText = `Chatwork引用: <a href="${url}">◎</a>`;
  const noteRaw = `[引用 aid=${aid} time=${time}]` + cache.text + "\n";

  return `<?xml version="1.0"?>
<opml version="2.0">
  <head>
    <ownerEmail>
      soundphile@me.com
    </ownerEmail>
  </head>
  <body>
    <outline text="${escXml(bulletText)}" _note="${escXmlNote(noteRaw)}" />
  </body>
</opml>`;
}
/* ------- BG からコピー指示を受ける ------- */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "CW_DO_COPY") return;

  const opml = buildOPML();
  if (!opml) {
    alert("コピー失敗：メッセージ ID 取得不可、または選択が空です。");
    return;
  }
  copy(opml);
});
