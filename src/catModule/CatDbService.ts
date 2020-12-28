/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import Lowdb from "lowdb";
import { DbSchema, PICTURES_IDENTIFIER, SEND_CACHE_IDENTIFIER } from "../database/DbSchema";
import GenericDbService from "../database/GenericDbService";
import { PictureCacheModel, SendPicturesModel } from "./types";

export default class CatDbService extends GenericDbService {
  // eslint-disable-next-line no-unused-vars
  constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
    super();
  }

  public loadPictures(): PictureCacheModel[] {
    return this.db.get(PICTURES_IDENTIFIER).value() ?? [];
  }

  public refreshPicturePath(models: PictureCacheModel[]): void {
    const pictures = this.db.get(PICTURES_IDENTIFIER);
    pictures.remove((a) => true).write(); // delete all
    models.forEach((e) => pictures.push(e).write());
  }

  public hasPictures(): boolean {
    return this.loadPictures().length > 0;
  }

  public async addSendPicture(model: SendPicturesModel): Promise<void> {
    await this.db.get(SEND_CACHE_IDENTIFIER).push(model).write();
  }

  public async deleteSendPictures(guildId?: string): Promise<void> {
    const dbs = this.db.get(SEND_CACHE_IDENTIFIER);
    if (guildId) {
      dbs.remove((a) => a.guildId === guildId);
    } else {
      dbs.remove((a) => true);
    }
    await dbs.write();
  }

  public alreadySentPictures(guildId: string): SendPicturesModel[] {
    const content = this.db.get(SEND_CACHE_IDENTIFIER).value() ?? [];
    return content.filter((a) => a.guildId === guildId);
  }
}
