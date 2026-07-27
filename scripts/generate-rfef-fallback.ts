import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RfefPdfCalendarProvider } from "../src/providers/rfef-pdf-calendar-provider";
import { ResponsibleHttpClient } from "../src/services/responsible-http-client";

const http = new ResponsibleHttpClient();
const result = await new RfefPdfCalendarProvider(http).getCalendar();
const outputPath = join(
  process.cwd(),
  "src",
  "data",
  "rfef-group-2-2026-27.json",
);

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      version: 1,
      generatedAt: result.diagnostic.checkedAt,
      sourceUrl: result.diagnostic.url,
      sourceHash: result.diagnostic.hash,
      matches: result.matches,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `[rfef-fallback] ${result.matches.length} partidos, ${result.zaragozaMatches.length} del Real Zaragoza, ${http.requestCount} solicitudes`,
);

