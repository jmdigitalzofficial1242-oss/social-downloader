import { execFile, execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export let pythonCmd = "python";
try {
  execSync("python --version", { stdio: "ignore" });
} catch {
  try {
    execSync("python3 --version", { stdio: "ignore" });
    pythonCmd = "python3";
  } catch {
    // fallback
  }
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_OPTIONS_PER_ENTRY = 24;
const BRAND_SUFFIX = "getintodevice.com";
const downloadCache = new Map();

const PLATFORM_DEFINITIONS = [
  {
    key: "youtube",
    label: "YouTube",
    icon: "YT",
    match: ["youtube", "youtu.be", "youtube.com", "youtube shorts"]
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "TT",
    match: ["tiktok", "douyin"]
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "IG",
    match: ["instagram", "instagr.am", "reels"]
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "FB",
    match: ["facebook", "fb.watch", "fb.com"]
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: "X",
    match: ["twitter", "x.com", "tweet"]
  },
  {
    key: "vimeo",
    label: "Vimeo",
    icon: "VI",
    match: ["vimeo"]
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: "RD",
    match: ["reddit"]
  },
  {
    key: "soundcloud",
    label: "SoundCloud",
    icon: "SC",
    match: ["soundcloud"]
  },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: "PI",
    match: ["pinterest", "pin.it"]
  }
];

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const pick = (source, keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return undefined;
};

const numberLabel = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  if (number >= 1000000000) return `${(number / 1000000000).toFixed(1)}B`;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
};

const detectPlatform = (data, entries, sourceUrl) => {
  const haystack = [
    data.extractor,
    data.extractor_key,
    data.webpage_url_domain,
    data.webpage_url,
    sourceUrl,
    ...entries.flatMap((entry) => [entry.extractor, entry.extractor_key, entry.webpage_url_domain, entry.webpage_url])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const platform = PLATFORM_DEFINITIONS.find((item) => item.match.some((match) => haystack.includes(match)));
  return platform || { key: "generic", label: String(pick(data, ["extractor", "webpage_url_domain"]) || "Social video"), icon: "SD" };
};

const buildCreator = (data, entries) => {
  const first = entries[0] || {};
  const avatar =
    String(
      pick(data, ["uploader_avatar", "channel_avatar", "creator_avatar", "avatar_url"]) ||
        pick(first, ["uploader_avatar", "channel_avatar", "creator_avatar", "avatar_url", "profile_image_url"]) ||
        ""
    );
  const profileUrl =
    String(
      pick(data, ["uploader_url", "channel_url", "creator_url"]) ||
        pick(first, ["uploader_url", "channel_url", "creator_url"]) ||
        ""
    );
  const followers =
    numberLabel(pick(data, ["channel_follower_count", "uploader_follower_count", "followers"]) || pick(first, ["channel_follower_count", "uploader_follower_count", "followers"]));

  return {
    name: String(pick(data, ["uploader", "channel", "creator"]) || pick(first, ["uploader", "channel", "creator"]) || ""),
    handle: String(pick(data, ["uploader_id", "channel_id", "creator_id"]) || pick(first, ["uploader_id", "channel_id", "creator_id"]) || ""),
    avatar: isHttpUrl(avatar) ? avatar : "",
    profile_url: isHttpUrl(profileUrl) ? profileUrl : "",
    followers,
    video_count: numberLabel(pick(data, ["playlist_count", "n_entries"]) || pick(first, ["playlist_count", "n_entries"])),
    verified: Boolean(pick(data, ["uploader_verified", "channel_is_verified"]) || pick(first, ["uploader_verified", "channel_is_verified"]))
  };
};

const cleanupCache = () => {
  const now = Date.now();
  for (const [id, item] of downloadCache) {
    if (item.expiresAt <= now) downloadCache.delete(id);
  }
};

const formatBytes = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
};

const formatDuration = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  const hours = Math.floor(mins / 60);
  const restMins = mins % 60;
  if (hours) return `${hours}:${String(restMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${restMins}:${String(secs).padStart(2, "0")}`;
};

const safeFileName = (name) =>
  String(name || "social-download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "social-download";

const brandedFileName = (name, extension) => {
  const cleanExtension = String(extension || "mp4").replace(/^\./, "") || "mp4";
  const baseName = String(name || "social-download")
    .replace(new RegExp(`\\s*-\\s*${BRAND_SUFFIX.replace(".", "\\.")}\\s*$`, "i"), "")
    .replace(/\.[a-z0-9]{2,5}$/i, "");
  return safeFileName(`${baseName} - ${BRAND_SUFFIX}.${cleanExtension}`);
};

const cookieHeaderFromYtDlp = (cookies) => {
  if (!cookies) return "";
  return String(cookies)
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const lower = part.toLowerCase();
      return part.includes("=") && !lower.startsWith("domain=") && !lower.startsWith("path=") && !lower.startsWith("expires=");
    })
    .join("; ");
};

const getHeaders = (format, entry) => {
  const headers = {
    ...(entry.http_headers || {}),
    ...(format.http_headers || {})
  };
  const cookies = cookieHeaderFromYtDlp(format.cookies || entry.cookies);
  if (cookies) headers.Cookie = cookies;
  if (!headers["User-Agent"]) {
    headers["User-Agent"] =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
  }
  if (!headers.Accept) headers.Accept = "*/*";
  return headers;
};

const mediaTypeFor = (format) => {
  const ext = String(format.ext || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (format.vcodec === "none" && format.acodec && format.acodec !== "none") return "audio";
  return "video";
};

const optionLabel = (format, entryIndex) => {
  const type = mediaTypeFor(format);
  const parts = [];
  if (entryIndex > 0) parts.push(`Item ${entryIndex + 1}`);
  parts.push(type === "audio" ? "Audio" : type === "image" ? "Image" : "Video");
  if (format.resolution && format.resolution !== "audio only") parts.push(format.resolution);
  else if (format.height) parts.push(`${format.height}p`);
  if (format.format_note && !String(format.format_note).includes("unknown")) parts.push(format.format_note);
  if (format.ext) parts.push(String(format.ext).toUpperCase());
  return parts.join(" ");
};

const isWatermarked = (format) =>
  /watermark|watermarked/i.test(
    [format.format_id, format.format_note, format.format, format.url].filter(Boolean).join(" ")
  );

const qualityScore = (format) =>
  Number(format.height || 0) * 1000000 +
  Number(format.width || 0) * 1000 +
  Number(format.tbr || 0) +
  Number(format.filesize || format.filesize_approx || 0) / 1000000;

const hasAudio = (format) => Boolean(format.acodec && format.acodec !== "none");
const hasVideo = (format) => Boolean(format.vcodec && format.vcodec !== "none");

const cacheDownload = ({ format, entry = {}, title, entryIndex = 0 }) => {
  cleanupCache();
  const id = randomUUID();
  const type = mediaTypeFor(format);
  const sourceUrl = entry.webpage_url || entry.original_url || entry.url;
  const shouldMergeAudio = type === "video" && hasVideo(format) && !hasAudio(format) && format.format_id && sourceUrl;
  const mergeExt = String(format.ext || "").toLowerCase() === "webm" ? "webm" : "mp4";
  const mergeAudioSelector =
    mergeExt === "webm" ? "ba[ext=webm]/ba[acodec=opus]/ba" : "ba[ext=m4a]/ba[ext=mp4]/ba";
  const ext = String(
    shouldMergeAudio ? mergeExt : format.ext || (type === "audio" ? "mp3" : type === "image" ? "jpg" : "mp4")
  ).replace(/^\./, "");
  const filename = brandedFileName(`${title}${entryIndex > 0 ? `-${entryIndex + 1}` : ""}`, ext);

  downloadCache.set(id, {
    id,
    url: shouldMergeAudio ? "" : format.url,
    sourceUrl,
    formatId: format.format_id,
    formatSelector: shouldMergeAudio
      ? `${format.format_id}+${mergeAudioSelector}/${format.format_id}+bestaudio/${format.format_id}`
      : "",
    headers: getHeaders(format, entry),
    filename,
    ext,
    type,
    requiresYtDlp: shouldMergeAudio,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return id;
};

const cacheMergedDownload = ({ sourceUrl, title, quality = "high" }) => {
  cleanupCache();
  const id = randomUUID();
  const suffix = quality === "normal" ? "normal" : "high";
  const filename = brandedFileName(`${title}-${suffix}`, "mp4");
  const formatSelector =
    quality === "normal"
      ? "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720]/best[height<=720]/best"
      : "bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/best";

  downloadCache.set(id, {
    id,
    url: "",
    sourceUrl,
    formatSelector,
    filename,
    ext: "mp4",
    type: "video",
    requiresYtDlp: true,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return {
    id,
    label: quality === "normal" ? "Normal quality MP4 with audio" : "High quality MP4 with audio",
    resolution: quality === "normal" ? "Normal MP4" : "Best MP4",
    type: "video",
    has_audio: true,
    has_video: true,
    badge: "Audio included",
    extension: "mp4",
    format_id: formatSelector,
    size: "",
    download_url: `/api/download?id=${encodeURIComponent(id)}`,
    preview_url: ""
  };
};

const normalizeFormat = (format, entry, title, entryIndex, optionIndex) => {
  if (!isHttpUrl(format.url)) return null;
  const type = mediaTypeFor(format);
  const id = cacheDownload({ format, entry, title, entryIndex });
  const mergedAudio = Boolean(type === "video" && hasVideo(format) && !hasAudio(format) && format.format_id);
  const mergedExtension = String(format.ext || "").toLowerCase() === "webm" ? "webm" : "mp4";
  const resolution =
    format.resolution ||
    (format.width && format.height ? `${format.width}x${format.height}` : type === "audio" ? "Audio only" : "Original");

  return {
    id,
    label: optionLabel(format, entryIndex) || `Option ${optionIndex + 1}`,
    resolution,
    type,
    has_audio: mergedAudio || hasAudio(format),
    has_video: hasVideo(format),
    badge: isWatermarked(format)
      ? "Watermarked"
      : mergedAudio
        ? "Audio included"
        : optionIndex === 0 && type === "video"
          ? "Best no watermark"
          : "",
    is_watermarked: isWatermarked(format),
    extension: mergedAudio ? mergedExtension : format.ext || "",
    format_id: format.format_id || "",
    size: mergedAudio ? "" : formatBytes(format.filesize || format.filesize_approx),
    download_url: `/api/download?id=${encodeURIComponent(id)}`,
    preview_url: `/api/download?id=${encodeURIComponent(id)}&preview=1`
  };
};

const normalizeThumbnail = (thumbnail, title) => {
  if (!isHttpUrl(thumbnail)) return null;
  const id = cacheDownload({
    format: {
      url: thumbnail,
      ext: new URL(thumbnail).pathname.match(/\.(png|jpe?g|webp|gif)$/i)?.[1] || "jpg"
    },
    title: `${title}-thumbnail`
  });

  return {
    id,
    label: "Thumbnail download",
    resolution: "Preview image",
    type: "image",
    badge: "Thumbnail",
    extension: "jpg",
    size: "",
    download_url: `/api/download?id=${encodeURIComponent(id)}`,
    preview_url: `/api/download?id=${encodeURIComponent(id)}&preview=1`
  };
};

const collectFormats = (entry) => {
  const formats = [];
  if (Array.isArray(entry.requested_downloads)) formats.push(...entry.requested_downloads);
  if (entry.url) formats.push(entry);
  if (Array.isArray(entry.formats)) formats.push(...entry.formats);

  const seen = new Set();
  return formats
    .filter((format) => format && isHttpUrl(format.url))
    .filter((format) => !String(format.protocol || "").includes("m3u8"))
    .filter((format) => {
      const ext = String(format.ext || "").toLowerCase();
      if (["mhtml", "json", "srv1", "srv2", "srv3", "ttml", "vtt"].includes(ext)) return false;
      return mediaTypeFor(format) !== "video" || hasVideo(format) || hasAudio(format);
    })
    .filter((format) => {
      const key = [
        format.format_id,
        format.ext,
        format.resolution || `${format.width || ""}x${format.height || ""}`,
        format.filesize || format.filesize_approx || "",
        format.vcodec || "",
        format.acodec || "",
        format.format_note || ""
      ].join("|").replace(/-\d+\|/, "|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aWatermark = isWatermarked(a) ? 1 : 0;
      const bWatermark = isWatermarked(b) ? 1 : 0;
      if (aWatermark !== bWatermark) return aWatermark - bWatermark;
      return qualityScore(b) - qualityScore(a);
    })
    .slice(0, MAX_OPTIONS_PER_ENTRY);
};

const buildPrimaryActions = (downloads, { sourceUrl, title }) => {
  const videos = downloads.filter((item) => item.type === "video");
  const completeVideos = videos.filter((item) => item.has_audio !== false);
  const images = downloads.filter((item) => item.type === "image");
  const maxResolutionSide = (item) => {
    const values = String(item?.resolution || "")
      .match(/\d+/g)
      ?.map(Number)
      .filter(Number.isFinite);
    return values?.length ? Math.max(...values) : Number.POSITIVE_INFINITY;
  };
  const mergedHigh = sourceUrl ? cacheMergedDownload({ sourceUrl, title, quality: "high" }) : null;
  const mergedNormal = sourceUrl ? cacheMergedDownload({ sourceUrl, title, quality: "normal" }) : null;
  const highQuality = mergedHigh || completeVideos[0] || videos[0] || downloads.find((item) => item.type !== "audio") || downloads[0] || null;
  const normalQuality =
    mergedNormal ||
    completeVideos.find((item) => item !== highQuality && maxResolutionSide(item) <= 720 && item.extension === "mp4") ||
    completeVideos.find((item) => item !== highQuality && maxResolutionSide(item) <= 720) ||
    completeVideos.find((item) => item !== highQuality && /360|480|540|normal|medium/i.test([item.label, item.resolution].join(" "))) ||
    videos.find((item) => item !== highQuality && maxResolutionSide(item) <= 720 && item.extension === "mp4") ||
    videos.find((item) => item !== highQuality && maxResolutionSide(item) <= 720) ||
    highQuality;
  const thumbnailHd = images.find((item) => /thumbnail|preview/i.test([item.label, item.badge].join(" "))) || images[0] || null;

  return {
    high_quality: highQuality,
    normal_quality: normalQuality,
    thumbnail_hd: thumbnailHd
  };
};

const runYtDlp = async (url) => {
  try {
    const { stdout } = await execFileAsync(
      pythonCmd,
      ["-m", "yt_dlp", "--dump-single-json", "--skip-download", "--no-warnings", url],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PYTHONPATH: [process.env.YTDLP_PYTHON_PATH, process.env.PYTHONPATH].filter(Boolean).join(process.platform === "win32" ? ";" : ":")
        },
        maxBuffer: 80 * 1024 * 1024,
        timeout: 120000,
        windowsHide: true
      }
    );
    return JSON.parse(stdout);
  } catch (error) {
    const stderr = String(error.stderr || error.message || "");
    if (stderr.includes("No module named yt_dlp")) {
      throw new Error("yt-dlp is not installed. Run: python -m pip install -U yt-dlp");
    }
    if (/WinError 10013|forbidden by its access permissions|TransportError/i.test(stderr)) {
      throw new Error(
        "Network permission blocked yt-dlp. Allow Python/Node through Windows Firewall or run the app outside the restricted sandbox."
      );
    }
    if (/private|login|cookies|not available|unsupported|unable to extract|unable to download webpage|http error 404/i.test(stderr)) {
      throw new Error("This video is private, unsupported, unavailable, or needs cookies/login access.");
    }
    throw new Error(stderr.split("\n").find(Boolean) || "Could not extract media from this URL.");
  }
};

export const fetchVideoDetails = async (url) => {
  if (!isHttpUrl(url)) {
    throw new Error("Please enter a valid public video URL.");
  }

  const data = await runYtDlp(url);
  const entries = Array.isArray(data.entries) && data.entries.length ? data.entries.filter(Boolean) : [data];
  const title = String(pick(data, ["title", "fulltitle", "playlist_title"]) || "Social media download");
  const thumbnail =
    String(pick(data, ["thumbnail"]) || pick(entries[0], ["thumbnail"]) || pick(entries[0]?.thumbnails?.at?.(-1), ["url"]) || "");
  const platform = detectPlatform(data, entries, url);
  const creator = buildCreator(data, entries);

  const videos = entries.flatMap((entry, entryIndex) => {
    const entryTitle = String(pick(entry, ["title", "fulltitle"]) || title);
    return collectFormats(entry)
      .map((format, optionIndex) => normalizeFormat(format, entry, entryTitle, entryIndex, optionIndex))
      .filter(Boolean);
  });
  const thumbnailOption = normalizeThumbnail(thumbnail, title);
  if (thumbnailOption) videos.push(thumbnailOption);

  if (!videos.length) {
    throw new Error("No downloadable media links were found for this URL.");
  }
  const sourceUrl = String(pick(data, ["webpage_url", "original_url"]) || pick(entries[0], ["webpage_url", "original_url", "url"]) || url);
  const primaryActions = buildPrimaryActions(videos, { sourceUrl, title });

  return {
    title,
    thumbnail,
    platform: platform.label,
    platform_key: platform.key,
    platform_label: platform.label,
    platform_icon: platform.icon,
    uploader: creator.name,
    duration: formatDuration(pick(data, ["duration"]) || pick(entries[0], ["duration"])),
    source_url: url,
    media: {
      title,
      thumbnail,
      duration: formatDuration(pick(data, ["duration"]) || pick(entries[0], ["duration"])),
      view_count: numberLabel(pick(data, ["view_count"]) || pick(entries[0], ["view_count"])),
      like_count: numberLabel(pick(data, ["like_count"]) || pick(entries[0], ["like_count"])),
      upload_date: String(pick(data, ["upload_date"]) || pick(entries[0], ["upload_date"]) || "")
    },
    creator,
    primary_actions: primaryActions,
    downloads: videos,
    videos
  };
};

export const getCachedDownload = (id) => {
  cleanupCache();
  return downloadCache.get(id) || null;
};
