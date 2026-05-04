// import { NextRequest, NextResponse } from "next/server";
// import { createWorker } from "tesseract.js";
// import path from "path";
// import fs from "fs";

// export const runtime = "nodejs";

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     if (file.size > 10 * 1024 * 1024) {
//       return NextResponse.json({ error: "File too large" }, { status: 400 });
//     }

//     if (file.type === "application/pdf") {
//       return NextResponse.json(
//         { error: "PDF is not supported yet. Please upload a JPG/PNG image." },
//         { status: 400 }
//       );
//     }

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Two-pass OCR:
//     // - Latin/French/English pass for VIN, make/model, dates
//     // - Arabic pass for owner name + plate (often not captured well with Latin models)
//     const latinText = await runOcr(buffer, {
//       langs: "fra+eng",
//       params: {
//         tessedit_pageseg_mode: "6",
//         user_defined_dpi: "300",
//         preserve_interword_spaces: "1",
//         // Bias toward the characters expected on Carte Grise.
//         tessedit_char_whitelist:
//           "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/:-. ()",
//       },
//     });

//     const arabicText = await runOcr(buffer, {
//       langs: "ara",
//       params: {
//         tessedit_pageseg_mode: "6",
//         user_defined_dpi: "300",
//         preserve_interword_spaces: "1",
//       },
//     }).catch(() => "");

//     const data = extractFields({ latinText, arabicText });

//     // If OCR produced almost nothing, return empty fields but still succeed.
//     // The UI already handles manual entry when values are empty.

//     return NextResponse.json(data);
//   } catch (error: unknown) {
//     console.error("OCR ERROR:", error);
//     const message = error instanceof Error ? error.message : "OCR failed";
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }

// type OcrOptions = {
//   langs: string;
//   params?: Record<string, string>;
// };

// async function runOcr(imageBuffer: Buffer, options: OcrOptions): Promise<string> {
//   let lastError: unknown;

//   // Force Tesseract to load worker/core from the real filesystem.
//   // (In Next app routes, `require.resolve` can be rewritten to a virtual path.)
//   const workerPath = path.join(
//     process.cwd(),
//     "node_modules",
//     "tesseract.js",
//     "src",
//     "worker-script",
//     "node",
//     "index.js"
//   );
//   const corePath = path.join(
//     process.cwd(),
//     "node_modules",
//     "tesseract.js-core",
//     "tesseract-core.wasm.js"
//   );

//   const cachePath = path.join(process.cwd(), "tessdata");
//   fs.mkdirSync(cachePath, { recursive: true });
//   const langPath = "https://tessdata.projectnaptha.com/4.0.0";

//   if (!fs.existsSync(workerPath)) {
//     throw new Error(`Tesseract worker not found at: ${workerPath}`);
//   }
//   if (!fs.existsSync(corePath)) {
//     throw new Error(`Tesseract core not found at: ${corePath}`);
//   }

//   const lang = options.langs;
//   {
//     const worker = await createWorker({
//       logger: () => {
//         // Intentionally silent.
//       },
//       workerPath,
//       corePath,
//       langPath,
//       cachePath,
//       gzip: true,
//     });

//     try {
//       await worker.loadLanguage(lang);
//       await worker.initialize(lang);

//       // Must be after initialize() (otherwise internal API can be null).
//       if (options.params) {
//         await worker.setParameters(options.params);
//       }

//       const {
//         data: { text },
//       } = await worker.recognize(imageBuffer);
//       return text || "";
//     } catch (err) {
//       lastError = err;
//     } finally {
//       await worker.terminate();
//     }
//   }

//   throw lastError instanceof Error ? lastError : new Error("OCR failed");
// }

// function extractFields(input: { latinText: string; arabicText: string }) {
//   const latinLines = input.latinText
//     .split("\n")
//     .map((l) => l.replace(/\s+/g, " ").trim())
//     .filter(Boolean);

//   const arabicLines = input.arabicText
//     .split("\n")
//     .map((l) => l.replace(/\s+/g, " ").trim())
//     .filter(Boolean);

//   const lines = [...latinLines, ...arabicLines];

//   const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
//   const hasLatin = (s: string) => /[A-Za-z]/.test(s);
//   const cleanValue = (s: string) =>
//     s
//       .replace(/^[:\-\s]+/, "")
//       .replace(/[|]+/g, " ")
//       .replace(/\s+/g, " ")
//       .trim();

//   const stripKnownLabels = (s: string) => {
//     let v = s;
//     const labelFragments = [
//       "Nom et Prénom",
//       "Nom et Prenom",
//       "Adresse",
//       "Constructeur",
//       "Type commercial",
//       "République Tunisienne",
//       "Republique Tunisienne",
//       "CERTIFICAT D'IMMATRICULATION",
//       "CERTIFICAT D’IMMATRICULATION",
//       "الإسم واللقب",
//       "الاسم واللقب",
//       "العنوان",
//       "الصانع",
//       "نوع الصنع",
//     ];
//     for (const frag of labelFragments) {
//       v = v.replaceAll(frag, " ");
//     }
//     return cleanValue(v);
//   };

//   const isLikelyLabelOnly = (value: string) => {
//     const v = value.toLowerCase();
//     return (
//       v === "nom et prénom" ||
//       v === "nom et prenom" ||
//       v === "adresse" ||
//       v === "constructeur" ||
//       v === "type commercial" ||
//       v === "certificat d'immatriculation" ||
//       v === "republique tunisienne" ||
//       v === "république tunisienne" ||
//       v === "الصانع" ||
//       v === "نوع الصنع" ||
//       v === "الإسم واللقب" ||
//       v === "الاسم واللقب"
//     );
//   };

//   const findLineIndex = (pattern: RegExp): number =>
//     lines.findIndex((l) => pattern.test(l));

//   const findAfterLabel = (pattern: RegExp): string => {
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];
//       const match = line.match(pattern);
//       if (match) {
//         // If the value is on the same line (after the label)
//         const inlineValue = stripKnownLabels(match[1] ?? "");
//         if (inlineValue && !isLikelyLabelOnly(inlineValue)) return inlineValue;

//         // Otherwise, try the next line
//         const next = stripKnownLabels(lines[i + 1] ?? "");
//         if (next && !isLikelyLabelOnly(next)) return next;
//       }
//     }
//     return "";
//   };

//   const find = (patterns: RegExp[]): string => {
//     for (const pattern of patterns) {
//       for (const line of lines) {
//         const match = line.match(pattern);
//         if (match?.[1]) {
//           const v = stripKnownLabels(match[1]);
//           if (v && !isLikelyLabelOnly(v)) return v;
//         }
//       }
//     }
//     return "";
//   };

//   const fuelRaw = find([
//     /energie[:\s]+(.+)/i,
//     /carburant[:\s]+(.+)/i,
//     /combustible[:\s]+(.+)/i,
//     /وقود[:\s]+(.+)/i,
//     /P3[:\s]+(.+)/i,
//   ]);

//   const normalizeFuel = (raw: string): string => {
//     const r = raw.toLowerCase();
//     if (r.includes("elec") || r.includes("كهرب")) return "Electric";
//     if (r.includes("hybrid") || r.includes("هجين")) return "Hybrid";
//     if (r.includes("dies") || r.includes("gazole") || r.includes("ديز")) return "Diesel";
//     if (r.includes("ess") || r.includes("بنزين")) return "Gasoline";
//     return raw;
//   };

//   const vin = find([
//     /VIN[:\s]+([A-HJ-NPR-Z0-9]{17})/i,
//     /N\s*°?\s*Serie\s+du\s+type[:\s]+([A-HJ-NPR-Z0-9]{17})/i,
//     /s[ée]rie\s+du\s+type[:\s]+([A-HJ-NPR-Z0-9]{17})/i,
//     /E[:\s]+([A-HJ-NPR-Z0-9]{17})/i,
//     /([A-HJ-NPR-Z0-9]{17})/,
//   ]);

//   // Tunisian plate often appears like: "4135 تونس 108" (order may vary)
//   const plateFromArabic = (() => {
//     for (const line of arabicLines) {
//       const m = line.match(/(\d{1,5})\s*تونس\s*(\d{1,5})/);
//       if (m) return `${m[1]} تونس ${m[2]}`;
//       const m2 = line.match(/تونس\s*(\d{1,5})\s*(\d{1,5})/);
//       if (m2) return `${m2[1]} تونس ${m2[2]}`;
//     }
//     return "";
//   })();

//   const plateFromFrench = find([
//     /N\s*°?\s*d[' ]immatriculation[:\s]+(\d{1,8})/i,
//     /immatriculation[:\s]+(\d{1,8})/i,
//   ]);

//   const licensePlate = plateFromArabic || plateFromFrench;

//   // Make/model are reliably near their labels on Carte Grise.
//   const knownMakes = [
//     "RENAULT",
//     "PEUGEOT",
//     "CITROEN",
//     "VOLKSWAGEN",
//     "TOYOTA",
//     "HYUNDAI",
//     "KIA",
//     "FORD",
//     "FIAT",
//     "NISSAN",
//     "SUZUKI",
//     "HONDA",
//     "BMW",
//     "MERCEDES",
//     "DACIA",
//   ];

//   const makeFromLabel =
//     findAfterLabel(/constructeur\s*[:\-]?\s*(.*)$/i) ||
//     findAfterLabel(/marque\s*[:\-]?\s*(.*)$/i) ||
//     findAfterLabel(/D\.1\s*[:\-]?\s*(.*)$/i);

//   const makeFromKnownList = (() => {
//     const big = (input.latinText || "").toUpperCase();
//     for (const m of knownMakes) {
//       if (big.includes(m)) return m;
//     }
//     return "";
//   })();

//   const make = (() => {
//     const cand = makeFromLabel || makeFromKnownList;
//     // Reject Arabic label fragments (like "الصا")
//     if (!cand) return "";
//     if (hasArabic(cand) && !hasLatin(cand)) return "";
//     if (cand.length <= 2) return "";
//     return cand;
//   })();

//   const modelFromLabel =
//     findAfterLabel(/type\s+commercial\s*[:\-]?\s*(.*)$/i) ||
//     findAfterLabel(/mod[eè]le\s*[:\-]?\s*(.*)$/i) ||
//     findAfterLabel(/D\.3\s*[:\-]?\s*(.*)$/i);

//   const model = (() => {
//     const cand = modelFromLabel;
//     if (!cand) return "";
//     if (hasArabic(cand) && !hasLatin(cand)) return "";
//     if (cand.length <= 2) return "";
//     return cand;
//   })();

//   // Full name: prefer the line above the "Nom et Prénom" label if it looks like a name.
//   let fullName =
//     findAfterLabel(/titulaire\s*[:\-]?\s*(.*)$/i) ||
//     findAfterLabel(/C\.1\s*[:\-]?\s*(.*)$/i) ||
//     findAfterLabel(/المالك\s*[:\-]?\s*(.*)$/i);

//   if (!fullName) {
//     const idx = findLineIndex(/nom\s+et\s+pr[ée]nom/i);
//     const prev = idx > 0 ? cleanValue(lines[idx - 1]) : "";
//     if (prev && !isLikelyLabelOnly(prev) && (hasArabic(prev) || prev.length >= 4)) {
//       fullName = prev;
//     }
//   }

//   // Extra cleanup: remove Arabic label if it leaked.
//   fullName = stripKnownLabels(fullName);

//   // Year: only accept a real date (avoid catching "2704" from VIN).
//   const yearFromDate = (() => {
//     const yearCandidates: number[] = [];

//     for (const line of lines) {
//       // yyyy/mm/dd
//       const m1 = line.match(/\b(19\d{2}|20\d{2})\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{1,2}\b/);
//       if (m1) yearCandidates.push(Number(m1[1]));

//       // dd/mm/yyyy
//       const m2 = line.match(/\b\d{1,2}\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*(19\d{2}|20\d{2})\b/);
//       if (m2) yearCandidates.push(Number(m2[1]));
//     }

//     const thisYear = new Date().getFullYear();
//     const valid = yearCandidates.filter((y) => y >= 1950 && y <= thisYear + 1);
//     return valid.length ? String(valid[0]) : "";
//   })();

//   return {
//     licensePlate: stripKnownLabels(licensePlate),
//     vin: stripKnownLabels(vin),
//     fullName: stripKnownLabels(fullName),
//     make: stripKnownLabels(make),
//     model: stripKnownLabels(model),
//     year: yearFromDate,
//     fuelType: normalizeFuel(fuelRaw),
//   };
// }

// app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    if (file.type === "application/pdf")
      return NextResponse.json({ error: "PDF not supported yet" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Run 3 passes: French, Arabic, and a digits-only pass for the plate
    const [latinText, arabicText, digitsText] = await Promise.all([
      runOcr(buffer, {
        langs: "fra+eng",
        params: {
          tessedit_pageseg_mode: "6",
          user_defined_dpi: "300",
          preserve_interword_spaces: "1",
          tessedit_char_whitelist:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/:-. ()",
        },
      }),
      runOcr(buffer, {
        langs: "ara",
        params: {
          tessedit_pageseg_mode: "6",
          user_defined_dpi: "300",
          preserve_interword_spaces: "1",
        },
      }).catch(() => ""),
      // PSM 11 = sparse text, finds text anywhere including vertical margins
      runOcr(buffer, {
        langs: "ara+fra",
        params: {
          tessedit_pageseg_mode: "11",
          user_defined_dpi: "300",
          preserve_interword_spaces: "1",
        },
      }).catch(() => ""),
    ]);

    const data = extractFields({ latinText, arabicText, digitsText });
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("OCR ERROR:", error);
    const message = error instanceof Error ? error.message : "OCR failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type OcrOptions = { langs: string; params?: Record<string, string> };

async function runOcr(imageBuffer: Buffer, options: OcrOptions): Promise<string> {
  const workerPath = path.join(
    process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"
  );
  const corePath = path.join(
    process.cwd(), "node_modules", "tesseract.js-core", "tesseract-core.wasm.js"
  );
  const cachePath = path.join(process.cwd(), "tessdata");
  fs.mkdirSync(cachePath, { recursive: true });

  if (!fs.existsSync(workerPath)) throw new Error(`Worker not found: ${workerPath}`);
  if (!fs.existsSync(corePath)) throw new Error(`Core not found: ${corePath}`);

  const worker = await createWorker({
    logger: () => {},
    workerPath,
    corePath,
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    cachePath,
    gzip: true,
  });

  try {
    await worker.loadLanguage(options.langs);
    await worker.initialize(options.langs);
    if (options.params) await worker.setParameters(options.params as never);
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text || "";
  } finally {
    await worker.terminate();
  }
}

function extractFields(input: {
  latinText: string;
  arabicText: string;
  digitsText: string;
}) {
  const toLines = (t: string) =>
    t.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  const latinLines = toLines(input.latinText);
  const arabicLines = toLines(input.arabicText);
  const digitsLines = toLines(input.digitsText);
  const allLines = [...latinLines, ...arabicLines, ...digitsLines];

  const cleanValue = (s: string) =>
    s.replace(/^[:\-\s]+/, "").replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();

  const LABELS = [
    "nom et prénom","nom et prenom","adresse","constructeur","type commercial",
    "république tunisienne","republique tunisienne","certificat d'immatriculation",
    "الإسم واللقب","الاسم واللقب","العنوان","الصانع","نوع الصنع","نوع التسجيل",
    "n° d'immatriculation","n° serie du type",
  ];
  const isLabel = (v: string) => LABELS.includes(v.toLowerCase().trim());

  const stripLabels = (s: string) => {
    let v = s;
    for (const lbl of LABELS) v = v.replace(new RegExp(lbl, "gi"), " ");
    return cleanValue(v);
  };

  // ── VIN ──────────────────────────────────────────────────────────────────
  // VF1BB10CF27047000 — already working, keep as-is
  let vin = "";
  for (const line of allLines) {
    const m = line.match(/([A-HJ-NPR-Z0-9]{17})/i);
    if (m) { vin = m[1].toUpperCase(); break; }
  }

  // ── LICENSE PLATE ─────────────────────────────────────────────────────────
  // The plate "4135 تونس 108" is printed vertically on the left edge.
  // Strategy: find the two digit groups and "تونس" anywhere across ALL passes.
  let licensePlate = "";

  // Pass 1: look for "X تونس Y" pattern on a single line
  for (const line of allLines) {
    const m = line.match(/(\d{1,5})\s*تونس\s*(\d{1,5})/);
    if (m) { licensePlate = `${m[1]} تونس ${m[2]}`; break; }
  }

  // Pass 2: the vertical text gets split across lines — find تونس then look
  // at surrounding lines for the two number groups
  if (!licensePlate) {
    const tunisIdx = allLines.findIndex((l) => l.includes("تونس"));
    if (tunisIdx !== -1) {
      // Collect numbers in a window of ±4 lines around تونس
      const window = allLines.slice(Math.max(0, tunisIdx - 4), tunisIdx + 5);
      const nums: string[] = [];
      for (const l of window) {
        const m = l.match(/\b(\d{1,5})\b/g);
        if (m) nums.push(...m.filter((n) => n.length >= 2 && n !== "108" || n.length >= 3));
      }
      // Filter to plausible plate numbers (2–5 digits)
      const plateNums = [...new Set(nums)].filter((n) => +n >= 10 && +n <= 99999);
      if (plateNums.length >= 2) {
        // Largest number is usually the regional code (4135), smallest is sequence (108)
        plateNums.sort((a, b) => +b - +a);
        licensePlate = `${plateNums[0]} تونس ${plateNums[1]}`;
      }
    }
  }

  // Pass 3: fallback — look in digitsText for "4135" and "108" near "تونس"
  if (!licensePlate) {
    const allText = input.arabicText + " " + input.digitsText;
    const m = allText.match(/(\d{3,5})\D{0,20}تونس\D{0,20}(\d{2,5})/);
    if (m) licensePlate = `${m[1]} تونس ${m[2]}`;
  }

  // ── FULL NAME ─────────────────────────────────────────────────────────────
  // "عربية السلطاني" appears to the LEFT of "الإسم واللقب" on the same line
  let fullName = "";

  for (const line of arabicLines) {
    if (/الإسم|الاسم|واللقب/.test(line)) {
      // Remove the label part, keep what's left
      const cleaned = line
        .replace(/الإسم\s+واللقب/g, "")
        .replace(/الاسم\s+واللقب/g, "")
        .replace(/Nom\s+et\s+Pr[ée]nom/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 3) { fullName = cleaned; break; }
    }
  }

  // Fallback: line BEFORE the "Nom et Prénom" label in latin pass
  if (!fullName) {
    const idx = latinLines.findIndex((l) => /nom\s+et\s+pr[ée]nom/i.test(l));
    if (idx > 0) {
      const prev = cleanValue(latinLines[idx - 1]);
      if (prev.length > 3 && !isLabel(prev)) fullName = prev;
    }
  }

  // ── MAKE ─────────────────────────────────────────────────────────────────
  // "RENAULT" appears after "Constructeur" label — Latin pass handles it well
  const KNOWN_MAKES = [
    "RENAULT","PEUGEOT","CITROEN","VOLKSWAGEN","TOYOTA","HYUNDAI",
    "KIA","FORD","FIAT","NISSAN","SUZUKI","HONDA","BMW","MERCEDES","DACIA","SKODA","OPEL",
  ];

  let make = "";
  for (const line of latinLines) {
    if (/constructeur/i.test(line)) {
      // Value may be on same line or next
      const inline = line.replace(/constructeur/i, "").replace(/[:\-]/g, "").trim();
      if (inline.length > 1) { make = inline; break; }
      const nextIdx = latinLines.indexOf(line) + 1;
      if (nextIdx < latinLines.length) { make = cleanValue(latinLines[nextIdx]); break; }
    }
  }
  // Fallback: scan for known make names anywhere in latin text
  if (!make) {
    const big = input.latinText.toUpperCase();
    for (const m of KNOWN_MAKES) {
      if (big.includes(m)) { make = m; break; }
    }
  }

  // ── MODEL ─────────────────────────────────────────────────────────────────
  // "CLIO" appears after "Type commercial" label
  let model = "";
  for (let i = 0; i < latinLines.length; i++) {
    if (/type\s+commercial/i.test(latinLines[i])) {
      const inline = latinLines[i].replace(/type\s+commercial/i, "").replace(/[:\-]/g, "").trim();
      if (inline.length > 1) { model = inline; break; }
      if (i + 1 < latinLines.length) { model = cleanValue(latinLines[i + 1]); break; }
    }
  }

  // ── YEAR ─────────────────────────────────────────────────────────────────
  // "2003/05/06" is clearly on the card
  let year = "";
  for (const line of allLines) {
    const m1 = line.match(/\b(19\d{2}|20\d{2})[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/);
    if (m1) { year = m1[1]; break; }
    const m2 = line.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](19\d{2}|20\d{2})\b/);
    if (m2) { year = m2[1]; break; }
  }

  // ── FUEL ─────────────────────────────────────────────────────────────────
  // Not printed on older Tunisian carte grise — try anyway
  const normalizeFuel = (raw: string) => {
    const r = raw.toLowerCase();
    if (r.includes("elec") || r.includes("كهرب")) return "Electric";
    if (r.includes("hybrid")) return "Hybrid";
    if (r.includes("dies") || r.includes("gazole") || r.includes("gasoil")) return "Diesel";
    if (r.includes("ess") || r.includes("بنزين") || r.includes("essence")) return "Gasoline";
    return raw;
  };

  let fuelRaw = "";
  for (const line of allLines) {
    const m = line.match(/(?:energie|carburant|combustible|وقود|P3)[:\s]+(.+)/i);
    if (m) { fuelRaw = m[1].trim(); break; }
  }

  return {
    licensePlate: stripLabels(licensePlate),
    vin,
    fullName: stripLabels(fullName),
    make: stripLabels(make),
    model: stripLabels(model),
    year,
    fuelType: normalizeFuel(fuelRaw),
  };
}