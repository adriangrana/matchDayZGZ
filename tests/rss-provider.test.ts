import assert from "node:assert/strict";
import test from "node:test";
import { RssNewsProvider } from "../src/providers/rss-news-provider";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <title><![CDATA[El Real Zaragoza prepara el próximo partido]]></title>
      <link>https://example.com/real-zaragoza/noticia?utm_source=rss</link>
      <pubDate>Mon, 27 Jul 2026 10:00:00 +0200</pubDate>
      <dc:creator><![CDATA[Redacción Deportes]]></dc:creator>
      <description><![CDATA[<p>La plantilla trabaja antes de la jornada.</p>]]></description>
      <enclosure url="https://example.com/foto.jpg" length="50000" type="image/jpeg" />
    </item>
    <item>
      <title>Una noticia de baloncesto</title>
      <link>https://example.com/baloncesto/noticia</link>
      <pubDate>Mon, 27 Jul 2026 09:00:00 +0200</pubDate>
      <description>Contenido ajeno al club.</description>
    </item>
  </channel>
</rss>`;

test("parsea RSS y filtra elementos ajenos en feeds generales", async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(xml, {
      status: 200,
      headers: { "content-type": "application/rss+xml" },
    });
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const provider = new RssNewsProvider({
    id: "fixture",
    name: "Fuente fixture",
    siteUrl: "https://example.com",
    feedUrl: "https://example.com/rss",
    official: false,
    specificToClub: false,
  });
  const articles = await provider.getNews({
    now: new Date("2026-07-27T10:30:00.000Z"),
  });

  assert.equal(articles.length, 1);
  assert.equal(articles[0]?.author, "Redacción Deportes");
  assert.equal(articles[0]?.canonicalUrl, "https://example.com/real-zaragoza/noticia");
});

