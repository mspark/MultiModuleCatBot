import dotenv from "dotenv";

dotenv.config();

// eslint-disable-next-line import/prefer-default-export
export const CONFIG = {
  apiToken: process.env.API_TOKEN,
  botAdminList: process.env.BOT_ADMINS?.split(","),
  catPicturesPath: process.env.PICTURE_DIR_PATH,
  debug: false,
};
