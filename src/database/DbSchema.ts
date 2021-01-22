/* eslint-disable camelcase */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { CatBotGuildStatistic, PictureCacheModel, SendPicturesModel } from "../catModule/types";
import { GuildSchema } from "../guildModule/types";

export const PICTURES_IDENTIFIER = "cat_pictures";
export const GUILD_DB_IDENTIFIER = "guilds";
export const SEND_CACHE_IDENTIFIER = "cat_sendCache";
export const CATBOT_STATS_IDENTIFIER = "cat_stats";
export const CATBOT_STATS_COUNT = "cat_stats_count";

export interface DbSchema {
    init: boolean,
    guilds: GuildSchema[],
    cat_pictures: PictureCacheModel[],
    cat_sendCache: SendPicturesModel[],
    cat_stats: CatBotGuildStatistic[],
    cat_stats_count: number,
}

export const defaultSchema = {
  init: false,
  cat_pictures: [],
  guilds: [],
  cat_sendCache: [],
  cat_stats: [],
  cat_stats_count: 0,
} as DbSchema;
