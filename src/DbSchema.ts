import { CatModuleStatistics, PictureCacheModel, SendPicturesModel } from "./CatModule";

export const PICTURES_IDENTIFIER = "cat_pictures";
export const GUILD_DB_IDENTIFIER = "guilds";
export const SEND_CACHE_IDENTIFIER = "cat_sendCache";
export const CATBOT_STATS_IDENTIFIER = "cat_stats";

export interface DbSchema {
    init: boolean,
    guilds: string[],
    cat_pictures: PictureCacheModel[],
    cat_sendCache: SendPicturesModel[],
    cat_stats: CatModuleStatistics
}

export const defaultSchema = {
    init: true,
    cat_pictures: [],
    guilds: [],
    cat_sendCache: [],
    cat_stats: {}
};