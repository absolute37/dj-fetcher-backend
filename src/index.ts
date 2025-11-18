import { Elysia, t } from "elysia";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

type PatchFlacBody = {
  trackFileUrl?: string;
  title?: string;
  artist?: string;
  album?: string;
  releaseDate?: string;
};

export default new Elysia()
  .get("/", () => "Hello Vercel Function")
  .post("/api/patch-flac", async ({ body, set }) => {
    const { trackFileUrl, title, artist, album, releaseDate } =
      body as PatchFlacBody;

    if (!trackFileUrl) {
      set.status = 400;
      return { error: "Missing trackFileUrl in body" };
    }
    console.log("trackFileUrl", trackFileUrl);
    console.log("title", title);
    console.log("artist", artist);
    console.log("album", album);
    console.log("releaseDate", releaseDate);

    try {
      // 1) ดาวน์โหลดไฟล์ต้นฉบับไปเป็น temp
      const tempInput = path.join("/tmp", `input-${Date.now()}.flac`);
      const tempOutput = path.join("/tmp", `output-${Date.now()}.flac`);

      const res = await fetch(trackFileUrl);
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tempInput, buffer);

      // 2) ใช้ ffmpeg set Vorbis Comment
      const metadataArgs: string[] = [];
      if (title) metadataArgs.push("-metadata", `TITLE=${title}`);
      if (artist) metadataArgs.push("-metadata", `ARTIST=${artist}`);
      if (album) metadataArgs.push("-metadata", `ALBUM=${album}`);
      if (releaseDate) metadataArgs.push("-metadata", `DATE=${releaseDate}`);
      // แปลง execFile เป็น promise-based function
      const execFileAsync = promisify(execFile);
      await execFileAsync(ffmpegPath as string, [
        "-i",
        tempInput,
        ...metadataArgs,
        "-y", // overwrite
        tempOutput,
      ]);

      // 3) อ่านไฟล์ output
      const finalFile = fs.readFileSync(tempOutput);

      // 4) ส่งกลับ response
      set.headers = {
        "Content-Type": "audio/flac",
        "Content-Disposition": `attachment; filename="${
          title || "track"
        }.flac"`,
      };

      // 5) ลบ temp files
      fs.unlinkSync(tempInput);
      fs.unlinkSync(tempOutput);

      return finalFile;
    } catch (err: any) {
      console.error(err);
      set.status = 500;
      return { error: "Failed to process FLAC file" };
    }
  });
