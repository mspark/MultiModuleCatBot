/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import Filesystem from "fs/promises";
import ExifImage from "exif";
import Util from "util";
import DbService from "../database/DbService";
import * as Utils from "../Utils";
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
    const pictureModels = await this.readAndParseFiles();
    this.catDbService.refreshPictureCache(pictureModels);
    console.log(`Filled database cache with ${pictureModels.length} files`);
    this.picturePaths = pictureModels;
  }

  private readCache(): void {
    this.picturePaths = this.catDbService.loadPictures();
    console.log(`Loaded ${this.picturePaths.length} picture paths from database`);
  }

  public async getRealtivePicPaths(): Promise<string[]> {
    return PicturesFileReader.readAllFilenamesRecursive(this.dir);
  }

  public async getSubDirectorys(): Promise<string[]> {
    return PicturesFileReader.readAllFilenamesInDir(this.dir);
  }

  private async readAndParseFiles(): Promise<PictureCacheModel[]> {
    const files = await this.getRealtivePicPaths();
    return Promise.all(
      files.map(async (singleFilePath) => {
        const file = await this.readFile(singleFilePath);
        console.log(`Load: ${singleFilePath}`);
        return file;
      }),
    );
  }

  private async readFile(path: string): Promise<PictureCacheModel> {
    const pic: PictureCacheModel = await PicturesFileReader.fillWithExifData({ id: path, picturePath: path });
    const catname = await this.extractCatNameFromFilepath(path);
    pic.catName = catname; // maybe undefined
    return pic;
  }

  private static async fillWithExifData(picEntry: PictureCacheModel): Promise<PictureCacheModel> {
    const retrieveExifData = Util.promisify(ExifImage);
    const newPicEntry = picEntry;
    try {
      const data = await retrieveExifData(picEntry.picturePath);
      newPicEntry.createDate = data.exif.CreateDate;
      newPicEntry.cameraModel = data.image.Model;
    } catch (e) {
      console.log(`Image does not support exif data: ${picEntry.picturePath}`);
    }
    return newPicEntry;
  }

  public async extractCatNameFromFilepath(path: string): Promise<string | undefined> {
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
    const dirs = await PicturesFileReader.readAllFilenamesInDir(this.dir);
    return dirs.map((d) => this.removeWorkDirFromPath(d)).map((cats) => Utils.removeOngoingSlash(cats));
  }

  private removeWorkDirFromPath(path: string): string {
    return path.substr(this.dir.length, path.length);
  }

  private static async isDirectory(fullPathFile: string): Promise<boolean> {
    const fileStat = await Filesystem.stat(fullPathFile);
    return fileStat.isDirectory();
  }

  private static async readAllFilenamesInDir(path: string): Promise<string[]> {
    return PicturesFileReader.getFiles(path, async (f) => PicturesFileReader.isDirectory(f));
  }

  public static async readAllFilenamesRecursive(path: string): Promise<string[]> {
    const dirs = await PicturesFileReader.readAllFilenamesInDir(path);
    let files = await PicturesFileReader.getFiles(path, async (f) => !dirs.includes(f));
    await Promise.all(
      dirs.map((d) => PicturesFileReader.readAllFilenamesRecursive(d)),
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
