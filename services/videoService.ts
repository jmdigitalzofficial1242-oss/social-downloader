import { VideoInfo } from "../types";

export const fetchVideoDetails = async (url: string): Promise<VideoInfo> => {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Please enter a valid public video URL.");
  }

  const response = await fetch("/api/video-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "Could not fetch video details.");
  }

  return data;
};
