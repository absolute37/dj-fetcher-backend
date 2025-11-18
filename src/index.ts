import { Elysia, t } from "elysia";
// @ts-ignore
import { FlacParser, FlacBuilder } from "flac-metadata";

export default new Elysia()
  .get("/", () => "Hello Vercel Function")
  .post("/api/patch-flac", async ({ body, set }) => {
    const { trackFileUrl, title, artist, album, releaseDate } = body;

    if (!trackFileUrl) {
      set.status = 400;
      return { error: "Missing apiUrl in body" };
    }

    try {
      // 1) ดาวน์โหลดไฟล์ต้นฉบับ
      const res = await fetch(trackFileUrl);
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // 2) ตรวจว่าเป็น FLAC
      if (!(uint8[0] === 0x66 && uint8[1] === 0x4c && uint8[2] === 0x61)) {
        set.status = 400;
        return { error: "File is not FLAC" };
      }

      // 3) ปรับ Vorbis Comment
      const parser = new FlacParser();
      parser.parse(uint8);

      const builder = new FlacBuilder();
      builder.setVorbisComment({
        TITLE: title || "",
        ARTIST: artist || "",
        ALBUM: album || "",
        DATE: releaseDate || "",
      });

      const finalFile = builder.build(uint8);

      // 4) ส่งกลับเป็น response
      set.headers = {
        "Content-Type": "audio/flac",
        "Content-Disposition": `attachment; filename="${
          title || "track"
        }.flac"`,
      };

      return new Response(finalFile);
    } catch (err: any) {
      console.error(err);
      set.status = 500;
      return { error: "Failed to process FLAC file" };
    }
  });
