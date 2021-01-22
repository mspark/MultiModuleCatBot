/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import CatModule from "../catModule/CatModule";
import { CONFIG } from "../Config";
import DbService from "../database/DbService";
import GuildManagementModule from "../guildModule/GuildManagementModule";
import Module from "./Module";

export default async function getModuleList(): Promise<Module[]> {
  const dbservice = await DbService.newInstance();
  return [
    await CatModule.newInstance(CONFIG.catPicturesPath, dbservice),
    new GuildManagementModule(dbservice),
  ];
}
