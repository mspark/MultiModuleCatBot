import { CatModule } from "./CatModule";
import { DbService } from "./DbService";
import { Module } from "./GenericModule";
import { GuildManagementModule } from "./GuildManagementModule";


export async function getModuleList(): Promise<Module[]> {
    const dbservice = await DbService.newInstance();;
    return [
        await CatModule.newInstance(process.env.PICTURE_DIR_PATH, dbservice),
        new GuildManagementModule(dbservice),
    ]
}