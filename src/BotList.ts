import { CatBot } from "./CatBot";
import { DbService } from "./dbservice";
import { GenericBot } from "./GenericBot";
import { GuildManagementBot } from "./GuildBot";


export async function getBotList(): Promise<GenericBot[]> {
    const dbservice = await DbService.newInstance();;
    return [
        await CatBot.newInstance(process.env.PICTURE_DIR_PATH, dbservice),
        new GuildManagementBot(dbservice),
    ]
}