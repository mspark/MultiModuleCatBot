import Filesystem from "fs/promises";
import { DbService } from "../database/DbService";
import { Utils } from "../globals_utils";
import { PictureCacheModel } from "./types";
import { CatDbService } from "./cat_service_db";

export class PicturesFileReader {
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
		this.catDbService = dbService.getCustomDbService(db => new CatDbService(db)) as CatDbService;
	}

	public async initCache(picturesPath: string | undefined): Promise<void> {
		if (!picturesPath) {
			console.log("Warning: No PICTURE_DIR_PATH in .env specified. Using ./pictures/")
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
		console.log("Filled cache with " + pictureModels.length + " paths")
		this.picturePaths = pictureModels;
	}

	private readCache(): void {
		this.picturePaths = this.catDbService.loadPictures();
		console.log("Loaded " + this.picturePaths.length + " picture paths from database");
	}

	public async getRealtivePicPaths(): Promise<string[]> {
		return await this.readAllFiles(this.dir);
	}

	public async getSubDirectorys(): Promise<string[]> {
		return await this.readAllDirectory(this.dir);
	}

	private async readAndParseFiles(): Promise<PictureCacheModel[]> {
		const files = await this.getRealtivePicPaths();
		const cacheEntrys: PictureCacheModel[] = [];
		for (let index = 0; index < files.length; index++) {
			const singleFilePath = files[index];
			const catname = await this.catNameFromFile(singleFilePath);
			const pictureCacheEntry: PictureCacheModel = { id: index + 1, picturePath: singleFilePath};
			if (catname) {
				pictureCacheEntry.catName = catname;
			}
			cacheEntrys.push(pictureCacheEntry);
			console.log("Found " + singleFilePath);
		}
		return cacheEntrys;
	}

	public async catNameFromFile(path: string): Promise<string | undefined> {
		const possibleCatname = this.removeWorkDirFromPath(path).split("/")[1]; // first element is always empty; the second element could be the file itself or a dir
			let catname: string | undefined = undefined;
		if (await this.isDirectory(this.dir + "/" + possibleCatname)) {
			catname = possibleCatname;
		}
		return catname;
	}

	private async isDirectory(fullPathFile: string): Promise<boolean> {
		const fileStat = await Filesystem.stat(fullPathFile);
		return fileStat.isDirectory();
	}

	private async readAllDirectory(path: string): Promise<string[]> {
		return await this.getFiles(path, async f => await this.isDirectory(f));
	}

	private async readAllFiles(path: string): Promise<string[]> {
		const dirs: string[] = await this.readAllDirectory(path)
		let files: string[] = await this.getFiles(path, async f => !dirs.includes(f))
		for (let index = dirs.length - 1; index >= 0; index--) {
			const element = dirs[index];
			files = files.concat(await this.readAllFiles(element));
		}
		return files;
	}

	/**
	 * Hacky function to filter async through the listed files.
	 * Lists all files in {@link this.dir} and filters them with the given method.
	 * 
	 * @param filter - The method to be filter all files with
	 */
	private async getFiles(dir: string, filter: (file:string) => Promise<boolean>): Promise<string[]> {
		const files = await Filesystem.readdir(dir);
		const filteredList: string[] = [];
		for (let index = 0; index < files.length; index++) {
			const element = dir + "/" + files[index];
			if (await filter(element)) {
				filteredList.push(element);
			}
		}
		return filteredList;
	}

	public getPicturesPath(): PictureCacheModel[] {
		return this.picturePaths;
	}

	public async getCatNames(): Promise<string[]> {
		const dirs = await this.readAllDirectory(this.dir);
		return dirs.map(d => this.removeWorkDirFromPath(d)).map(cats => Utils.removeOngoingSlash(cats));
	}

	private removeWorkDirFromPath(path: string): string {
		return path.substr(this.dir.length, path.length) 
	}
}