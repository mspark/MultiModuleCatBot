/* eslint-disable import/extensions */
import PicturesFileReader from "./PicturesFileReader";
import * as Utils from "../Utils";
import { NoPicturesLeftError, PictureCacheModel, SendPicturesModel } from "./types";

export default class CatPicturesFinder {
  private retrieveAction: () => Promise<PictureCacheModel[]>;

  constructor(private picReader: PicturesFileReader,
      private alreadySentPictures: SendPicturesModel[], catname?: string) {
    if (catname) {
      this.retrieveAction = () => this.retrieveCatPic(catname);
    } else {
      this.retrieveAction = () => this.getNotSendPictures();
    }
  }

  public async tryRetrieveRandomPicCacheEntry(): Promise<PictureCacheModel> {
    const items = await this.retrieveAction();
    if (items.length > 0) {
      return items[Math.floor(Math.random() * items.length)];
    }
    throw new NoPicturesLeftError("No valid pictures left");
  }

  private async getNotSendPictures(): Promise<PictureCacheModel[]> {
    return this.picReader.getPicturesPath()
      .filter((picturePath) => !this.alreadySentPictures
        .map((entry) => entry.sendPictureId)
        .includes(picturePath.id));
  }

  /**
   * Returns a cat pic. Photos of the given cat which weren't send yet, are preferred.
   *
   * @param guildId Specifies the discord server
   * @param catname The desired cat
   */
  private async retrieveCatPic(catname: string): Promise<PictureCacheModel[]> {
    const notSendPictures = await this.getNotSendPictures();
    let picsWithCatname = await this.filterAllForCatname(notSendPictures, catname);
    if (picsWithCatname.length === 0) {
      // the user wants to see a cat where all photos are already watched once
      // To solve this: don't filter the already send and use all pictures
      picsWithCatname = await this.filterAllForCatname(this.picReader.getPicturesPath(), catname);
    }
    return picsWithCatname;
  }

  private async filterAllForCatname(items: PictureCacheModel[], catname: string): Promise<PictureCacheModel[]> {
    const pred: Utils.Predicate<PictureCacheModel> = (p) => !!this.picReader.extractCatNameFromFilepath(p.picturePath);
    const modelsWithCatnames = await Utils.asyncFilter(items, pred);
    return modelsWithCatnames.filter((p) => p.catName?.toLowerCase() === catname.toLowerCase());
  }
}
