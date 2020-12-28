import CatModule from "../catModule/cat_modul";
import { DbService } from "../database/DbService";
import { Module } from "./GenericModule";
import { GuildManagementModule } from "../guildModule/guild_module";
import { Globals } from "../globals_utils";


export async function getModuleList(): Promise<Module[]> {
    const dbservice = await DbService.newInstance();
    return [
        await CatModule.newInstance(Globals.CONFIG.catPicturesPath, dbservice),
        new GuildManagementModule(dbservice),
    ]
}