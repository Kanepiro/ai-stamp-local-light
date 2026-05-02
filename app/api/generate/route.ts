import { NextRequest, NextResponse } from "next/server";
import iconv from "iconv-lite";

export const runtime = "nodejs";

const PROMPT_BASE = `CONTEXT ISOLATION (HIGHEST PRIORITY):
This request is fully standalone. Use ONLY the instructions in this prompt. Ignore any prior conversation, images, attempts, or external context. Create a fresh independent sticker design unrelated to previous outputs unless explicitly described here.

Generate a single LINE-style Japanese sticker illustration.

STYLE:
Soft, cute chibi character. Clean, crisp lineart with smooth shading for a sticker-style finish. Solid, fully opaque colors only.
NO watercolor, NO textured paper, NO grain, NO pastel/crayon, NO faded or washed-out look.
Keep edges sharp and clean. Use the 1024x1024 canvas broadly; do not make the illustration small and centered. Fill the available area and crop boldly when helpful.
Keep the subject visually large and intimate like a sticker, not tiny on an empty canvas.

TEXT RULES (STRICT):
The ONLY text allowed in the image is the provided message.
Do NOT add any extra Japanese or English text, glyphs, numbers, symbols, or punctuation beyond the exact message.
No sound effects, captions, background writing, watermark, signature, logo, or UI text.
Render the message EXACTLY as provided, character-for-character: no typos, no omissions, no substitutions, no paraphrasing.
Prioritize text correctness over decoration. If needed, reduce ornament but keep every character exact.
SPECIAL CASE: if the message is exactly "poi-!poi-!", render it perfectly as "poi-!poi-!" with the same letters, hyphen, and exclamation marks.

TEXT STYLE:
Make the text very large, thick, bold, and highly readable.
Rounded pop/comic lettering with bright colors, thick outline, slight 3D feel, subtle glow, and small sparkles/hearts for a flashy kira-kira LINE sticker look.
The text should feel energetic and decorative, but every character must still read clearly at small size.
Never sacrifice legibility: do not cover, distort, or break character shapes.

OPACITY RULE (CRITICAL):
Character, text, decorations, and white sticker backing must be fully opaque (alpha 255) everywhere inside the sticker area.
No transparency holes, no see-through areas, no glass/jelly/ghost/watery/low-opacity effects.
Never use transparency for highlights, shading, glow, or sparkles; render all effects as opaque colors.
Only the outside background may be transparent.
If the theme implies mochi/rice cake, it must still be fully opaque with no refraction or transparency.
Even when white parts overlap the white backing, keep all white areas fully opaque and separate edges with a thin light-gray outline or tiny soft shadow, also fully opaque.

STICKER BACKING:
Create a solid white backing that follows the combined silhouette of the character, text, and allowed decorations.
The white backing must be fully opaque pure white with no holes.
Everything outside this white sticker backing must be transparent.
Do not add any background panels, gradients, or patterns beyond the white sticker backing.
Motion lines and sparkles are allowed only if they stay inside the white backing and remain fully opaque.
The backing should read clearly as a clean die-cut sticker silhouette.

EXPRESSION:
Make the character's reaction VERY exaggerated and over-the-top: big facial expression, big mouth, bold eyebrows, tears, sweat drops, and motion lines are allowed.

CHARACTER REFERENCE GLOSSARY:
「僕」: original chibi boy whose body is mochi; simple rounded mochi blob, smooth soft slightly squishy, fully opaque white.
「らむちゃん」: original chibi woman, age 23, slightly chubby, brown hair with red mesh highlights, wholesome depiction only, NEVER draw horns or antennae, and MUST NOT resemble any existing anime or manga character.
「むぎちゃん」: 7-month-old female kitten with LIGHT wheat-colored fur, pale golden-beige, NOT chestnut.
Do NOT depict, imitate, or reference any third-party copyrighted or trademarked characters, brands, logos, or recognizable IP. All designs must be original.

GENERAL SAFETY:
Keep the sticker appropriate for general audiences: no nudity, no explicit sexual content, no extreme violence, no self-harm, no illegal drugs, and no hate.

COMPOSITION VARIATION (REQUIRED):
Layout for this image: {{LAYOUT}}
Camera for this image: {{CAMERA}}
The character's eyes or gaze must look directly at the viewer. If the angle is from above, below, behind, or extreme, rotate the head or pose so the face remains visible and maintains eye contact.
Do not reuse the same composition repeatedly.

THEME:
{{THEME}}

MESSAGE:
{{MESSAGE}}`;

const COMPOSITIONS = [
  {
    layout:
      "text at the top; character centered; camera distance close-up.",
    camera: "front view.",
  },
  {
    layout:
      "text at the bottom; character centered; camera distance close-up.",
    camera: "three-quarter view (left).",
  },
  {
    layout:
      "text diagonally from top-left to bottom-right; character centered; camera distance extreme close-up.",
    camera: "profile view (right).",
  },
  {
    layout:
      "text diagonally from top-right to bottom-left; character on the left side; camera distance half-body.",
    camera: "three-quarter view (right).",
  },
  {
    layout:
      "text at the top; character on the right side; camera distance half-body.",
    camera: "low angle from below (worm's-eye).",
  },
  {
    layout:
      "text at the bottom; character on the left side; camera distance full-body.",
    camera: "high angle from above.",
  },
  {
    layout:
      "text diagonally from top-left to bottom-right; character on the right side; camera distance close-up.",
    camera: "top-down view (bird's-eye).",
  },
  {
    layout:
      "text diagonally from top-right to bottom-left; character centered; camera distance extreme close-up.",
    camera: "rear three-quarter view with the character turning the head to the camera.",
  },
] as const;

const RECENT_COMPOSITION_HISTORY_LIMIT = 3;
const recentCompositionIndexes: number[] = [];

function pickComposition() {
  const availableIndexes = COMPOSITIONS
    .map((_, index) => index)
    .filter((index) => !recentCompositionIndexes.includes(index));

  const pool = availableIndexes.length > 0 ? availableIndexes : COMPOSITIONS.map((_, index) => index);
  const selectedIndex = pool[Math.floor(Math.random() * pool.length)];

  recentCompositionIndexes.push(selectedIndex);
  if (recentCompositionIndexes.length > RECENT_COMPOSITION_HISTORY_LIMIT) {
    recentCompositionIndexes.shift();
  }

  return COMPOSITIONS[selectedIndex];
}

/**
 * NOTE:
 * This endpoint used to call OpenAI Images API.
 * It now only builds the prompt and returns it as a downloadable text file.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const message = searchParams.get("message") ?? "";
    const keyword = searchParams.get("keyword") ?? "";

    const text =
      message.trim().length > 0 ? message.trim() : "PayPay銀行へ入金よろしく";
    const theme =
      keyword.trim().length > 0 ? keyword.trim() : "麦色の毛の猫";

    const isMochi = /餅|もち|mochi/i.test(theme);
    const mochiConstraints = isMochi
      ? `\n\nMOCHI-SPECIFIC RULES:\nFor a mochi character, keep the entire body and head pure opaque white (#FFFFFF), soft, smooth, rounded, and slightly squishy. No stripes, wrappers, plates, packaging, toppings, fillings, or large gray shading panels.`
      : "";

    const composition = pickComposition();

    const prompt = PROMPT_BASE.replace("{{LAYOUT}}", composition.layout)
      .replace("{{CAMERA}}", composition.camera)
      .replace("{{THEME}}", theme + mochiConstraints)
      .replace("{{MESSAGE}}", text);

    // Return as a downloadable Shift_JIS (CP932) encoded text file.
    const sjisBuf = iconv.encode(prompt, "cp932");

    return new NextResponse(sjisBuf, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=shift_jis",
        "Content-Disposition": 'attachment; filename="prompt.txt"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to build prompt." },
      { status: 500 }
    );
  }
}
