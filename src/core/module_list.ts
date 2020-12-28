/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import CatModule from "../catModule/CatModule";
import DbService from "../database/DbService";
import { Globals } from "../Utils";
import GuildManagementModule from "../guildModule/GuildManagementModule";
import Module from "./GenericModule";

export default async function getModuleList(): Promise<Module[]> {
  const dbservice = await DbService.newInstance();
  return [
    await CatModule.newInstance(Globals.CONFIG.catPicturesPath, dbservice),
    new GuildManagementModule(dbservice),
  ];
}
