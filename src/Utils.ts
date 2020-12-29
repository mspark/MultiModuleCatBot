require("dotenv").config();

export namespace Utils {

    export async function asyncFilter(arr, predicate) {
      const results = await Promise.all(arr.map(predicate));

      return arr.filter((_v, index) => results[index]);
    }

    export function removeTrailingSlash(path: string): string {
      if (path.endsWith("/")) {
        return path.slice(0, -1);
      }
      return path;
    }

    export function removeOngoingSlash(path: string): string {
      if (path.startsWith("/")) {
        return path.slice(1, path.length);
      }
      return path;
    }

    export function isBotAdmin(discordUserId: string) {
      return Globals.CONFIG.botAdminList?.includes(discordUserId) ?? false;
    }

}
export namespace Globals {

    export const CONFIG = {
      apiToken: process.env.API_TOKEN,
      botAdminList: process.env.BOT_ADMINS?.split(","),
      catPicturesPath: process.env.PICTURE_DIR_PATH,
      debug: false,
    };

    export const OWN_DC_ID = "791080285990682665";
}
