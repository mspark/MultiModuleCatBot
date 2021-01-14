/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import Filesystem from "fs/promises";
import DbService from "../database/DbService";
import { Utils } from "../Utils";
import CatDbService from "./CatDbService";
import { PictureCacheModel } from "./types";

export default class PicturesFileReader {
  private dir: string;

  private picturePaths: PictureCacheModel[];

  private catDbService: CatDbService;

  /**
   * Consider calling this.initCache afterwards.
   *
   * @param dbService
   */
  constructor(dbService: DbService) {
    this.dir = "";
    this.picturePaths = [];
    this.catDbService = dbService.getCustomDbService((db) => new CatDbService(db)) as CatDbService;
  }

  public async initCache(picturesPath: string | undefined): Promise<void> {
    if (!picturesPath) {
      console.log("Warning: No PICTURE_DIR_PATH in .env specified. Using ./pictures/");
    }
    this.dir = Utils.removeTrailingSlash(picturesPath ?? "pictures/");
    if (this.catDbService.hasPictures()) {
      this.readCache();
    } else {
      await this.fillCache();
    }
  }

  public async fillCache(): Promise<void> {
    const pictureModels = (await this.readAndParseFiles()).sort();
    this.catDbService.refreshPicturePath(pictureModels);
    console.log(`Filled cache with ${pictureModels.length} paths`);
    this.picturePaths = pictureModels;
  }

  private readCache(): void {
    this.picturePaths = this.catDbService.loadPictures();
    console.log(`Loaded ${this.picturePaths.length} picture paths from database`);
  }

  public async getRealtivePicPaths(): Promise<string[]> {
    return PicturesFileReader.readAllFiles(this.dir);
  }

  public async getSubDirectorys(): Promise<string[]> {
    return PicturesFileReader.readAllDirectory(this.dir);
  }

  private async readAndParseFiles(): Promise<PictureCacheModel[]> {
    const files = await this.getRealtivePicPaths();
    const cacheEntrys: PictureCacheModel[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const singleFilePath = files[index];
      // disabled: get an ordered output
      // eslint-disable-next-line no-await-in-loop
      const catname = await this.catNameFromFile(singleFilePath);
      const pictureCacheEntry: PictureCacheModel = { id: index + 1, picturePath: singleFilePath };
      if (catname) {
        pictureCacheEntry.catName = catname;
      }
      cacheEntrys.push(pictureCacheEntry);
      console.log(`Found ${singleFilePath}`);
    }
    return cacheEntrys;
  }

  public async catNameFromFile(path: string): Promise<string | undefined> {
    // first element is always empty; the second element could be the file itself or a dir
    const possibleCatname = this.removeWorkDirFromPath(path).split("/")[1];
    let catname: string | undefined;
    if (await PicturesFileReader.isDirectory(`${this.dir}/${possibleCatname}`)) {
      catname = possibleCatname;
    }
    return catname;
  }

  public getPicturesPath(): PictureCacheModel[] {
    return this.picturePaths;
  }

  public async getCatNames(): Promise<string[]> {
    const dirs = await PicturesFileReader.readAllDirectory(this.dir);
    return dirs.map((d) => this.removeWorkDirFromPath(d)).map((cats) => Utils.removeOngoingSlash(cats));
  }

  private removeWorkDirFromPath(path: string): string {
    return path.substr(this.dir.length, path.length);
  }

  private static async isDirectory(fullPathFile: string): Promise<boolean> {
    const fileStat = await Filesystem.stat(fullPathFile);
    return fileStat.isDirectory();
  }

  private static async readAllDirectory(path: string): Promise<string[]> {
    return PicturesFileReader.getFiles(path, async (f) => PicturesFileReader.isDirectory(f));
  }

  public static async readAllFiles(path: string): Promise<string[]> {
    const dirs = await PicturesFileReader.readAllDirectory(path);
    let files = await PicturesFileReader.getFiles(path, async (f) => !dirs.includes(f));
    await Promise.all(
      dirs.map((d) => PicturesFileReader.readAllFiles(d)),
    ).then((result) => {
      result.forEach((filesInDir) => {
        files = files.concat(filesInDir);
      });
    });
    return files;
  }

  /**
   * Hacky function to filter async through the listed files.
   * Lists all files in {@link this.dir} and filters them with the given method.
   *
   * @param filter - The method to be filter all files with
   */
  private static async getFiles(dir: string, filter: (file: string) => Promise<boolean>): Promise<string[]> {
    const files = await Filesystem.readdir(dir);
    const filteredList: string[] = [];
    await Promise.all(
      files.map(async (file) => {
        const fullFilePath = `${dir}/${file}`;
        if (await filter(fullFilePath)) {
          filteredList.push(fullFilePath);
        }
      }),
    );
    return filteredList;
  }
}
