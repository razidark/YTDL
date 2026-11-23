import path from "path";
import os from "os";

const { isGeneratedOutputPath } = require("../security") as {
  isGeneratedOutputPath: (candidate: string, outputBasePath: string) => boolean;
};

describe("isGeneratedOutputPath", () => {
  const tempDir = os.tmpdir();
  const outputBasePath = path.join(tempDir, "ytdl_123_abc.mp4");

  it("accepts a file produced from this request's unique output base", () => {
    expect(isGeneratedOutputPath(`${outputBasePath}.webm`, outputBasePath)).toBe(true);
  });

  it("rejects another request's file even when it shares the generic ytdl prefix", () => {
    expect(isGeneratedOutputPath(path.join(tempDir, "ytdl_999_other.mp4.webm"), outputBasePath)).toBe(false);
  });

  it("rejects a matching-looking filename outside the temp directory", () => {
    expect(isGeneratedOutputPath(path.join(tempDir, "other", `${path.basename(outputBasePath)}.webm`), outputBasePath)).toBe(false);
  });
});
