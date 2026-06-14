export interface VideoDownload {
  id?: string;
  label?: string;
  resolution: string;
  type?: string;
  extension?: string;
  format_id?: string;
  has_audio?: boolean;
  has_video?: boolean;
  badge?: string;
  is_watermarked?: boolean;
  download_url: string;
  preview_url?: string;
  size?: string | number;
}

export interface CreatorInfo {
  name?: string;
  handle?: string;
  avatar?: string;
  profile_url?: string;
  followers?: string;
  video_count?: string;
  verified?: boolean;
}

export interface MediaInfo {
  title: string;
  thumbnail: string;
  duration?: string;
  view_count?: string;
  like_count?: string;
  upload_date?: string;
}

export interface PrimaryActions {
  high_quality?: VideoDownload | null;
  normal_quality?: VideoDownload | null;
  thumbnail_hd?: VideoDownload | null;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  platform?: string;
  platform_key?: string;
  platform_label?: string;
  platform_icon?: string;
  uploader?: string;
  duration?: string;
  source_url?: string;
  media?: MediaInfo;
  creator?: CreatorInfo;
  primary_actions?: PrimaryActions;
  downloads?: VideoDownload[];
  videos: VideoDownload[];
}
