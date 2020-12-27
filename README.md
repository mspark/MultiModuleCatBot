# MultiModuleCatBot
Discord Bot for sending Cat Pictures. 


# Setup
## Create `.env`
```
API_TOKEN=
BOT_ADMINS=
PICTURE_DIR_PATH
```
**API_TOKEN**: Discord API token

**BOT_ADMINS**: Comma seperated list of discord ids who have full access to bot amdin commands

**PICTURE_DIR_PATH**: Relative path to pictures

## Pictures
Subdirectorys are supported. Every directory in `PICTURE_DIR_PATH` is scanned for files recursively. The first directory should be the cats name. 
The specific cats can be called via `!picture <catname`
