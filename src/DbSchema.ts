import { CatModuleStatistics, PictureCacheModel, SendPicturesModel } from "./CatModule";
import { GuildSchema } from "./GuildManagementModule";

export const PICTURES_IDENTIFIER = "cat_pictures";
export const GUILD_DB_IDENTIFIER = "guilds";
export const SEND_CACHE_IDENTIFIER = "cat_sendCache";
export const CATBOT_STATS_IDENTIFIER = "cat_stats";

export interface DbSchema {
    init: boolean,
    guilds: GuildSchema[],
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