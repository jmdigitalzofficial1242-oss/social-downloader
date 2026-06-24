import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
const publicDir = join(rootDir, "public");
const distDir = join(rootDir, "dist");
const siteUrl = (process.env.SITE_URL || "https://getintodevice.netlify.app").replace(/\/+$/, "");
const publicApiBase = (process.env.PUBLIC_API_BASE || "").replace(/\/+$/, "");

const seoPages = {
  "/": {
    title: "Social Downloader - HD Video Downloader for Creators",
    description:
      "Analyze public social media links, preview media, and download HD videos, thumbnails, and creator metadata from one clean workspace.",
    canonical: "/",
    pageKey: "home"
  },
  "/tiktok-video-downloader": {
    title: "TikTok Video Downloader No Watermark - Social Downloader",
    description:
      "Download TikTok videos, thumbnails, and public creator details with clean no-watermark options when available.",
    canonical: "/tiktok-video-downloader",
    pageKey: "tiktok"
  },
  "/instagram-reels-downloader": {
    title: "Instagram Reels Downloader - Save Reels in HD",
    description:
      "Paste an Instagram Reel link to analyze public media, view creator details, and download HD video or thumbnails.",
    canonical: "/instagram-reels-downloader",
    pageKey: "instagram"
  },
  "/youtube-shorts-downloader": {
    title: "YouTube Shorts Downloader - HD Shorts and Thumbnails",
    description:
      "Download YouTube Shorts, video thumbnails, and public channel metadata from a fast downloader workspace.",
    canonical: "/youtube-shorts-downloader",
    pageKey: "youtube"
  },
  "/facebook-video-downloader": {
    title: "Facebook Video Downloader - Save Public Videos",
    description:
      "Analyze public Facebook video links and download available MP4 video assets, thumbnails, and metadata.",
    canonical: "/facebook-video-downloader",
    pageKey: "facebook"
  },
  "/twitter-video-downloader": {
    title: "Twitter X Video Downloader - Save Public Videos",
    description:
      "Download public X and Twitter videos with platform detection, preview metadata, and polished download options.",
    canonical: "/twitter-video-downloader",
    pageKey: "twitter"
  },
  "/pinterest-video-downloader": {
    title: "Pinterest Video Downloader - Save Pins and Thumbnails",
    description:
      "Download public Pinterest videos and thumbnails while previewing available pin and creator metadata.",
    canonical: "/pinterest-video-downloader",
    pageKey: "pinterest"
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const absoluteUrl = (path) => `${siteUrl}${path}`;

const buildSchema = (page) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${absoluteUrl("/")}#website`,
      name: "Social Downloader",
      url: absoluteUrl("/")
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${absoluteUrl(page.canonical)}#app`,
      name: "Social Downloader",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description: page.description,
      url: absoluteUrl(page.canonical),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      }
    }
  ]
});

const renderPage = (template, page) =>
  template
    .replaceAll("__PAGE_TITLE__", escapeHtml(page.title))
    .replaceAll("__PAGE_DESCRIPTION__", escapeHtml(page.description))
    .replaceAll("__PAGE_CANONICAL__", escapeHtml(absoluteUrl(page.canonical)))
    .replaceAll("__PAGE_KEY__", escapeHtml(page.pageKey))
    .replaceAll("__APP_SCHEMA__", JSON.stringify(buildSchema(page)).replace(/</g, "\\u003c"))
    .replaceAll(
      "__API_BASE_SCRIPT__",
      publicApiBase
        ? `<script>window.SOCIAL_DOWNLOADER_API_BASE=${JSON.stringify(publicApiBase).replace(/</g, "\\u003c")};</script>`
        : ""
    );

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });

const template = await readFile(join(publicDir, "index.html"), "utf8");

for (const [route, page] of Object.entries(seoPages)) {
  const outputDir = route === "/" ? distDir : join(distDir, route.slice(1));
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "index.html"), renderPage(template, page));
}

const now = new Date().toISOString().slice(0, 10);
const sitemapUrls = Object.values(seoPages)
  .map(
    (page) => `  <url>
    <loc>${escapeHtml(absoluteUrl(page.canonical))}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.pageKey === "home" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n");

await writeFile(
  join(distDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`
);

await writeFile(
  join(distDir, "robots.txt"),
  `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${absoluteUrl("/sitemap.xml")}
`
);

console.log(`Built static site in ${distDir}`);
