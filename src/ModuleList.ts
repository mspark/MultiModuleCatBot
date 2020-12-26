import { CatModule } from "./CatModule";
import { DbService } from "./DbService";
import { Module } from "./GenericModule";
import { GuildManagementModule } from "./GuildManagementModule";
import { CONFIG } from "./main";


export async function getModuleList(): Promise<Module[]> {
    const dbservice = await DbService.newInstance();;
    return [
        await CatModule.newInstance(CONFIG.catPicturesPath, dbservice),
        new GuildManagementModule(dbservice),
    ]
}