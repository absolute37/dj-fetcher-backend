import { Elysia } from "elysia";
// @ts-ignore
import { FlacParser, FlacBuilder } from "flac-metadata";

export async function fetchWithRetry(apiUrl: string, title: string) {
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // ตรวจว่า FLAC หรือไม่
  const isFlac = uint8[0] === 0x66 && uint8[1] === 0x4c && uint8[2] === 0x61;

  let finalFile: Uint8Array;

  if (isFlac) {
    const parser = new FlacParser();
    parser.parse(uint8);
    const builder = new FlacBuilder();
    builder.setVorbisComment({ TITLE: title });
    finalFile = builder.build(uint8);
  } else {
    // สำหรับไฟล์อื่น ๆ ส่งกลับดิบเลย
    finalFile = uint8;
  }

  return { success: true, file: finalFile, isFlac };
}
