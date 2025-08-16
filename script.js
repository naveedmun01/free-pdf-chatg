document.getElementById("year").textContent = new Date().getFullYear();
const { PDFDocument } = PDFLib;

function downloadBytes(bytes, filename = "file.pdf") {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* JPG → PDF */
document.getElementById("btnJpg").addEventListener("click", async () => {
  const files = [...document.getElementById("jpgFiles").files];
  const msg = document.getElementById("jpgMsg");
  if (!files.length) { msg.textContent = "Please select one or more JPG files."; return; }
  msg.textContent = "Processing…";
  try {
    const pdf = await PDFDocument.create();
    for (const f of files) {
      const bytes = await f.arrayBuffer();
      const img = await pdf.embedJpg(bytes);
      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const out = await pdf.save({ useObjectStreams: true });
    downloadBytes(out, "images.pdf");
    msg.textContent = "Done!";
  } catch (e) { console.error(e); msg.textContent = "Failed to convert images."; }
});

/* Merge PDFs */
document.getElementById("btnMerge").addEventListener("click", async () => {
  const files = [...document.getElementById("mergeFiles").files];
  const msg = document.getElementById("mergeMsg");
  if (files.length < 2) { msg.textContent = "Add at least 2 PDFs."; return; }
  msg.textContent = "Merging…";
  try {
    const outPdf = await PDFDocument.create();
    for (const f of files) {
      const ab = await f.arrayBuffer();
      const src = await PDFDocument.load(ab);
      const pages = await outPdf.copyPages(src, src.getPageIndices());
      pages.forEach(p => outPdf.addPage(p));
    }
    const out = await outPdf.save({ addDefaultPage: false, useObjectStreams: true });
    downloadBytes(out, "merged.pdf");
    msg.textContent = "Done!";
  } catch (e) { console.error(e); msg.textContent = "Failed to merge (maybe encrypted PDF)."; }
});

/* Split / Extract */
function parseRanges(text, total) {
  const parts = text.split(",").map(s => s.trim()).filter(Boolean);
  const idx = new Set();
  for (const p of parts) {
    if (p.includes("-")) {
      const [a,b] = p.split("-").map(n => parseInt(n,10));
      const s = Math.max(1, Math.min(a,b));
      const e = Math.min(total, Math.max(a,b));
      for (let i=s;i<=e;i++) idx.add(i-1);
    } else {
      const n = parseInt(p,10);
      if (!isNaN(n) && n>=1 && n<=total) idx.add(n-1);
    }
  }
  return [...idx].sort((x,y)=>x-y);
}

document.getElementById("btnSplit").addEventListener("click", async () => {
  const file = document.getElementById("splitFile").files[0];
  const ranges = document.getElementById("splitRanges").value || "1-1";
  const msg = document.getElementById("splitMsg");
  if (!file) { msg.textContent = "Please select a PDF."; return; }
  msg.textContent = "Reading PDF…";
  try {
    const ab = await file.arrayBuffer();
    const src = await PDFDocument.load(ab);
    const picks = parseRanges(ranges, src.getPageCount());
    if (!picks.length) { msg.textContent = "Invalid ranges."; return; }
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, picks);
    pages.forEach(p => out.addPage(p));
    const bytes = await out.save({ useObjectStreams: true });
    downloadBytes(bytes, "extracted.pdf");
    msg.textContent = `Done! Extracted ${picks.length} page(s).`;
  } catch (e) { console.error(e); msg.textContent = "Failed to split (maybe encrypted PDF)."; }
});

/* Compress (simple re-save) */
document.getElementById("btnCompress").addEventListener("click", async () => {
  const file = document.getElementById("compFile").files[0];
  const msg = document.getElementById("compMsg");
  if (!file) { msg.textContent = "Please select a PDF."; return; }
  msg.textContent = "Compressing…";
  try {
    const inBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(inBytes);
    const out = await pdf.save({ useObjectStreams: true });
    downloadBytes(out, "compressed.pdf");
    msg.textContent = "Done.";
  } catch (e) { console.error(e); msg.textContent = "Compression failed."; }
});
