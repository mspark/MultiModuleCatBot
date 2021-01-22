export interface PictureCacheModel {
  id: string,
  catName?: string,
  picturePath: string,
  author?: string,
  createDate? : string
  cameraModel?: string
}

export interface SendPicturesModel {
  guildId: string,
  sendPictureId: string
}

export interface CatBotGuildStatistic {
  guildId: string,
  picturesViewed: number,
}

export interface Statistics {
  guildStats: CatBotGuildStatistic[],
  overallPicturesViewed: number,
}

export class NoPicturesLeftError extends Error {}
