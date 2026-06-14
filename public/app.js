const form = document.querySelector("#download-form");
const input = document.querySelector("#url-input");
const button = document.querySelector("#fetch-button");
const brandMark = document.querySelector(".brand-mark");
const statusEl = document.querySelector("#status");
const loader = document.querySelector("#loader");
const loaderTitle = document.querySelector("#loader-title");
const loaderDetail = document.querySelector("#loader-detail");
const loaderPercent = document.querySelector("#loader-percent");
const progressBar = document.querySelector("#progress-bar");
const processSteps = document.querySelectorAll("#process-steps span");
const result = document.querySelector("#result");
const smartPreview = document.querySelector("#smart-preview");
const thumbnail = document.querySelector("#thumbnail");
const title = document.querySelector("#title");
const count = document.querySelector("#count");
const options = document.querySelector("#options");
const resultBadges = document.querySelector("#result-badges");
const highDownload = document.querySelector("#high-download");
const normalDownload = document.querySelector("#normal-download");
const thumbnailDownload = document.querySelector("#thumbnail-download");
const highMeta = document.querySelector("#high-meta");
const normalMeta = document.querySelector("#normal-meta");
const thumbMeta = document.querySelector("#thumb-meta");
const sourceLink = document.querySelector("#source-link");
const platforms = document.querySelector("#platforms");
const platformIcon = document.querySelector("#platform-icon");
const creatorCard = document.querySelector("#creator-card");
const creatorAvatar = document.querySelector("#creator-avatar");
const creatorName = document.querySelector("#creator-name");
const creatorHandle = document.querySelector("#creator-handle");
const creatorStats = document.querySelector("#creator-stats");
const creatorLink = document.querySelector("#creator-link");
const outputSummary = document.querySelector("#output-summary");
const filterButtons = document.querySelectorAll(".filter-chip");
const bottomNavLinks = document.querySelectorAll(".bottom-app-nav a");

const pageKey = document.documentElement.dataset.pageKey?.includes("__") ? "home" : document.documentElement.dataset.pageKey || "home";
const configuredApiBase = String(window.SOCIAL_DOWNLOADER_API_BASE || "").replace(/\/+$/, "");
let loaderTimer = null;
let activeFilter = "all";
let currentDownloads = [];
const brandSuffix = "getintodevice.com";

const apiUrl = (path) => `${configuredApiBase}${path}`;

const assetUrl = (url) => {
  if (!url || String(url).startsWith("http")) return url || "#";
  return apiUrl(url);
};

const platformMeta = {
  youtube: { label: "YouTube", icon: "YT", className: "platform-youtube" },
  tiktok: { label: "TikTok", icon: "TT", className: "platform-tiktok" },
  instagram: { label: "Instagram", icon: "IG", className: "platform-instagram" },
  facebook: { label: "Facebook", icon: "FB", className: "platform-facebook" },
  twitter: { label: "X / Twitter", icon: "X", className: "platform-twitter" },
  pinterest: { label: "Pinterest", icon: "PI", className: "platform-pinterest" },
  vimeo: { label: "Vimeo", icon: "VI", className: "platform-vimeo" },
  reddit: { label: "Reddit", icon: "RD", className: "platform-reddit" },
  soundcloud: { label: "SoundCloud", icon: "SC", className: "platform-soundcloud" },
  generic: { label: "Generic video pages", icon: "SD", className: "platform-generic" }
};

const pageContent = {
  home: {
    eyebrow: "Creator media workspace",
    title: "Download clean social media assets.",
    subtitle: "Paste a public link, preview the media, inspect creator metadata, and save the best available video or thumbnail.",
    supportedTitle: "Social media video downloader",
    supportedCopy: "One focused workspace for TikTok, Instagram Reels, YouTube Shorts, Facebook, X, Pinterest, and generic video links.",
    placeholder: "Paste TikTok, Instagram, YouTube, Facebook, X..."
  },
  tiktok: {
    eyebrow: "TikTok video downloader",
    title: "Download TikTok videos without the clutter.",
    subtitle: "Analyze public TikTok links, find no-watermark options when available, and save HD video or thumbnails.",
    supportedTitle: "TikTok video downloader no watermark",
    supportedCopy: "Built around high-intent TikTok keywords: no watermark, MP4, HD video, thumbnails, and creator metadata.",
    placeholder: "Paste a TikTok video URL..."
  },
  instagram: {
    eyebrow: "Instagram Reels downloader",
    title: "Save Instagram Reels and thumbnails.",
    subtitle: "Paste a public Reel or post link to preview media, profile details, and clean download options.",
    supportedTitle: "Instagram reels downloader",
    supportedCopy: "Targeted for reels, Instagram video downloader, HD MP4 downloads, and public creator previews.",
    placeholder: "Paste an Instagram Reel URL..."
  },
  youtube: {
    eyebrow: "YouTube Shorts downloader",
    title: "Download YouTube Shorts in a creator-ready view.",
    subtitle: "Analyze Shorts links, view channel metadata, and save available video or thumbnail assets.",
    supportedTitle: "YouTube shorts downloader",
    supportedCopy: "Supports YouTube Shorts downloader, HD video downloader, MP4 downloads, and thumbnail downloads.",
    placeholder: "Paste a YouTube Shorts URL..."
  },
  facebook: {
    eyebrow: "Facebook video downloader",
    title: "Save public Facebook videos.",
    subtitle: "Analyze public Facebook media links and download available MP4 assets with metadata.",
    supportedTitle: "Facebook video downloader",
    supportedCopy: "Focused on public Facebook video download, HD MP4 assets, thumbnails, and source previews.",
    placeholder: "Paste a Facebook video URL..."
  },
  twitter: {
    eyebrow: "Twitter X video downloader",
    title: "Download public X and Twitter videos.",
    subtitle: "Paste a public post link to extract available video formats, thumbnails, and creator metadata.",
    supportedTitle: "Twitter X video downloader",
    supportedCopy: "Built for X video downloader, Twitter video download, MP4 assets, and public post previews.",
    placeholder: "Paste an X or Twitter video URL..."
  },
  pinterest: {
    eyebrow: "Pinterest video downloader",
    title: "Save Pinterest videos and pin thumbnails.",
    subtitle: "Analyze public pins, preview media, and download available video or thumbnail assets.",
    supportedTitle: "Pinterest video downloader",
    supportedCopy: "Targets Pinterest video download, pin thumbnail download, HD media, and public creator data.",
    placeholder: "Paste a Pinterest video URL..."
  }
};

const supportedPlatforms = [
  "TikTok video downloader",
  "Instagram Reels downloader",
  "YouTube Shorts downloader",
  "Facebook video downloader",
  "Twitter X video downloader",
  "Pinterest video downloader",
  "HD video downloader",
  "Download video thumbnail",
  "MP4 downloader",
  "No-watermark options",
  "Generic video pages"
];

const applyPageContent = () => {
  const content = pageContent[pageKey] || pageContent.home;
  const meta = platformMeta[pageKey] || platformMeta.generic;
  document.querySelector("#page-eyebrow").textContent = content.eyebrow;
  document.querySelector("#page-title").textContent = content.title;
  document.querySelector("#page-subtitle").textContent = content.subtitle;
  document.querySelector("#supported-title").textContent = content.supportedTitle;
  document.querySelector("#supported-copy").textContent = content.supportedCopy;
  input.placeholder = content.placeholder;
  brandMark.textContent = pageKey === "home" ? "SD" : meta.icon;
  brandMark.className = `brand-mark ${meta.className}`;
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const active = link.getAttribute("href") === window.location.pathname;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
  });
};

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
};

const loaderStages = [
  { percent: 18, title: "Checking link...", detail: "Validating public URL and platform hints" },
  { percent: 42, title: "Detecting platform...", detail: "Matching the source to the best extractor" },
  { percent: 68, title: "Reading metadata...", detail: "Collecting title, thumbnail, creator, and formats" },
  { percent: 88, title: "Preparing assets...", detail: "Building secure preview and download links" }
];

const updateLoaderProgress = (percent, heading, detail) => {
  loaderPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  loaderTitle.textContent = heading;
  loaderDetail.textContent = detail;
  processSteps.forEach((step, index) => {
    const threshold = loaderStages[index]?.percent || 100;
    step.classList.toggle("done", percent >= threshold);
    step.classList.toggle("active", percent < threshold && index === processSteps.length - 1 ? false : percent >= (loaderStages[index - 1]?.percent || 0) && percent < threshold);
  });
};

const startProcessLoader = () => {
  let index = 0;
  clearInterval(loaderTimer);
  updateLoaderProgress(loaderStages[0].percent, loaderStages[0].title, loaderStages[0].detail);
  loaderTimer = setInterval(() => {
    index = Math.min(index + 1, loaderStages.length - 1);
    const stage = loaderStages[index];
    updateLoaderProgress(stage.percent, stage.title, stage.detail);
    if (index === loaderStages.length - 1) clearInterval(loaderTimer);
  }, 900);
};

const finishProcessLoader = () => {
  clearInterval(loaderTimer);
  updateLoaderProgress(100, "Assets ready.", "Download cards are prepared for this public link");
};

const setLoading = (isLoading, heading = "Analyzing link...", detail = "Preparing download options") => {
  button.disabled = isLoading;
  input.disabled = isLoading;
  loader.hidden = !isLoading;
  if (isLoading) {
    loaderTitle.textContent = heading;
    loaderDetail.textContent = detail;
  } else {
    clearInterval(loaderTimer);
  }
};

const safeFileName = (name) =>
  String(name || "social-download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "social-download";

const brandedDownloadName = (name, extension = "") => {
  const cleanExtension = String(extension || "").replace(/^\./, "").toLowerCase();
  const baseName = String(name || "social-download")
    .replace(new RegExp(`\\s*-\\s*${brandSuffix.replace(".", "\\.")}\\s*$`, "i"), "")
    .replace(/\.[a-z0-9]{2,5}$/i, "");
  const suffix = cleanExtension ? `.${cleanExtension}` : "";
  return safeFileName(`${baseName} - ${brandSuffix}${suffix}`);
};

const makeBadge = (value) => {
  const badge = document.createElement("span");
  badge.className = "result-badge";
  badge.textContent = value;
  return badge;
};

const setPlatformIcon = (key, label, icon) => {
  const meta = platformMeta[key] || platformMeta.generic;
  platformIcon.className = `platform-icon ${meta.className}`;
  platformIcon.textContent = icon || meta.icon;
  platformIcon.setAttribute("aria-label", label || meta.label);
};

const setPrimaryAction = (link, meta, item, fallbackLabel) => {
  link.hidden = !item;
  if (!item) {
    link.href = "#";
    meta.textContent = fallbackLabel;
    return;
  }
  link.href = assetUrl(item.download_url);
  link.download = brandedDownloadName(
    `${title.textContent || "social-download"}-${item.label || fallbackLabel}`,
    item.extension
  );
  meta.textContent = [item.resolution, item.extension?.toUpperCase(), item.size].filter(Boolean).join(" - ") || fallbackLabel;
};

const selectPreviewItem = (data, downloads) => {
  const primary = data.primary_actions || {};
  return (
    primary.high_quality ||
    downloads.find((item) => item.type === "video") ||
    downloads.find((item) => item.type === "image") ||
    null
  );
};

const renderSmartPreview = (data, downloads) => {
  const previewItem = selectPreviewItem(data, downloads);
  smartPreview.hidden = true;
  smartPreview.removeAttribute("src");
  thumbnail.src = data.thumbnail || "";
  thumbnail.hidden = false;

  if (previewItem?.type === "video" && previewItem.preview_url) {
    smartPreview.src = assetUrl(previewItem.preview_url);
    smartPreview.hidden = false;
    thumbnail.hidden = Boolean(data.thumbnail);
    smartPreview.addEventListener(
      "error",
      () => {
        smartPreview.hidden = true;
        thumbnail.hidden = false;
      },
      { once: true }
    );
  }
};

const renderCreator = (data) => {
  const creator = data.creator || {};
  const hasCreator = Boolean(creator.name || creator.handle || creator.avatar || creator.profile_url);
  creatorCard.hidden = !hasCreator;
  if (!hasCreator) return;

  creatorName.textContent = creator.name || "Public creator";
  creatorHandle.textContent = [creator.handle, creator.verified ? "Verified" : ""].filter(Boolean).join(" - ");
  creatorStats.replaceChildren(
    ...[
      creator.followers ? ["Followers", creator.followers] : null,
      creator.video_count ? ["Videos", creator.video_count] : null,
      data.media?.view_count ? ["Views", data.media.view_count] : null,
      data.media?.like_count ? ["Likes", data.media.like_count] : null
    ]
      .filter(Boolean)
      .map(([label, value]) => {
        const stat = document.createElement("span");
        stat.className = "creator-stat";
        stat.innerHTML = `<strong>${value}</strong><small>${label}</small>`;
        return stat;
      })
  );

  creatorAvatar.textContent = (creator.name || data.platform_icon || "SD").slice(0, 2).toUpperCase();
  creatorAvatar.style.backgroundImage = creator.avatar ? `url("${creator.avatar}")` : data.thumbnail ? `url("${data.thumbnail}")` : "";
  creatorAvatar.classList.toggle("has-image", Boolean(creator.avatar));
  creatorAvatar.classList.toggle("fallback-image", !creator.avatar && Boolean(data.thumbnail));

  creatorLink.href = creator.profile_url || "#";
  creatorLink.hidden = !creator.profile_url;
};

const renderResults = (data) => {
  const downloads = Array.isArray(data.downloads) ? data.downloads : Array.isArray(data.videos) ? data.videos : [];
  const platformKey = data.platform_key || "generic";
  const primaryActions = data.primary_actions || {};
  currentDownloads = downloads;

  title.textContent = data.title || "Download ready";
  count.textContent = `${downloads.length} download option${downloads.length === 1 ? "" : "s"} found`;
  thumbnail.alt = data.thumbnail ? data.title || "Media thumbnail" : "";
  renderSmartPreview(data, downloads);
  setPlatformIcon(platformKey, data.platform_label, data.platform_icon);

  resultBadges.replaceChildren(
    ...[
      data.platform_label || data.platform,
      data.creator?.name,
      data.duration,
      data.media?.view_count ? `${data.media.view_count} views` : "",
      data.media?.like_count ? `${data.media.like_count} likes` : ""
    ]
      .filter(Boolean)
      .map(makeBadge)
  );

  setPrimaryAction(highDownload, highMeta, primaryActions.high_quality, "Best video");
  setPrimaryAction(normalDownload, normalMeta, primaryActions.normal_quality, "Smaller video");
  setPrimaryAction(thumbnailDownload, thumbMeta, primaryActions.thumbnail_hd, "Preview image");
  sourceLink.href = data.source_url || "#";
  sourceLink.hidden = !data.source_url;

  renderCreator(data);
  renderOutputSummary(downloads);
  renderDownloadCards(data, downloads);
  result.hidden = false;
};

const renderOutputSummary = (downloads) => {
  const counts = downloads.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.type || "video"] = (acc[item.type || "video"] || 0) + 1;
      return acc;
    },
    { total: 0, video: 0, audio: 0, image: 0 }
  );
  outputSummary.replaceChildren(
    ...[
      ["Total", counts.total],
      ["Video", counts.video],
      ["Audio", counts.audio],
      ["Images", counts.image]
    ].map(([label, value]) => {
      const item = document.createElement("span");
      item.className = "summary-pill";
      item.innerHTML = `<strong>${value}</strong><small>${label}</small>`;
      return item;
    })
  );
};

const renderDownloadCards = (data, downloads) => {
  const filtered = activeFilter === "all" ? downloads : downloads.filter((item) => (item.type || "video") === activeFilter);
  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "option empty-output";
    empty.innerHTML = `<div class="option-title">No ${activeFilter} assets found</div><p>This link did not expose that asset type. Try All or another public URL.</p>`;
    options.replaceChildren(empty);
    return;
  }
  options.replaceChildren(
    ...filtered.map((item, index) => {
      const originalIndex = downloads.indexOf(item);
      const card = document.createElement("article");
      card.className = `option ${originalIndex === 0 ? "option-best" : ""}`;

      const top = document.createElement("div");
      top.className = "option-top";

      const optionTitle = document.createElement("div");
      optionTitle.className = "option-title";
      optionTitle.textContent = `${originalIndex === 0 ? "Best - " : ""}${item.label || item.resolution || `Option ${originalIndex + 1}`}`;

      const badge = document.createElement("span");
      badge.className = `asset-badge asset-${item.type || "video"}`;
      badge.textContent = item.badge || item.type || "Asset";
      top.append(optionTitle, badge);

      const meta = document.createElement("div");
      meta.className = "meta";
      [item.type, item.resolution, item.extension?.toUpperCase(), item.size].filter(Boolean).forEach((value) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = value;
        meta.append(pill);
      });

      const actions = document.createElement("div");
      actions.className = "option-actions";

      const preview = document.createElement("a");
      preview.className = "preview-link";
      preview.href = assetUrl(item.preview_url || item.download_url);
      preview.target = "_blank";
      preview.rel = "noreferrer";
      preview.textContent = "Preview";

      const link = document.createElement("a");
      link.className = "download-link";
      link.href = assetUrl(item.download_url || `/api/download?id=${encodeURIComponent(item.id)}`);
      link.download = brandedDownloadName(
        `${data.title || "social-download"}-${item.resolution || originalIndex + 1}`,
        item.extension
      );
      link.textContent = "Download";

      actions.append(preview, link);
      card.append(top, meta, actions);
      return card;
    })
  );
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  setLoading(true, "Analyzing link...", "Fetching public metadata with yt-dlp");
  startProcessLoader();
  result.hidden = true;
  creatorCard.hidden = true;
  setStatus("");

  try {
    const response = await fetch(apiUrl("/api/video-info"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw new Error(data.error || "Could not fetch media details.");
    }

    finishProcessLoader();
    renderResults(data);
    setStatus("Links are ready.");
  } catch (error) {
    setStatus(error.message || "This public link could not be analyzed. Try another public media URL.", true);
  } finally {
    setLoading(false);
  }
});

filterButtons.forEach((buttonEl) => {
  buttonEl.addEventListener("click", () => {
    activeFilter = buttonEl.dataset.filter || "all";
    filterButtons.forEach((item) => item.classList.toggle("active", item === buttonEl));
    if (!result.hidden) {
      const data = {
        title: title.textContent || "social-download"
      };
      renderDownloadCards(data, currentDownloads);
    }
  });
});

bottomNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    bottomNavLinks.forEach((item) => item.classList.toggle("active", item === link));
  });
});

applyPageContent();

platforms.replaceChildren(
  ...supportedPlatforms.map((platform) => {
    const chip = document.createElement("span");
    chip.className = "platform-chip";
    chip.textContent = platform;
    return chip;
  })
);
