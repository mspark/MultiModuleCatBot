export interface PictureCacheModel {
  id: number,
  catName?: string,
  picturePath: string,
  author?: string,
  timestamp? : Date
}

export interface SendPicturesModel {
  guildId: string,
  sendPictureId: number
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
