import { Message } from "discord.js";

/* eslint-disable semi */
export default interface PrefixGuildProvider {
  provideCustomPrefix(message: Message): string | undefined
}
