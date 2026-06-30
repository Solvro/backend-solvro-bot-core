import type {
  Client,
  Interaction,
  StringSelectMenuInteraction,
} from "discord.js";

import { buttonHandlers } from "../interactions/buttons/index.js";
import selectMenuHandlers from "../interactions/selectMenus/index.js";

export function setupInteractionHandler(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isStringSelectMenu()) {
      const handler = (
        selectMenuHandlers as Record<
          string,
          | ((interaction: StringSelectMenuInteraction) => Promise<void>)
          | undefined
        >
      )[interaction.customId];
      if (handler !== undefined) {
        return handler(interaction);
      }
    }

    if (interaction.isButton()) {
      // Find handler by matching prefix
      const handler = Object.entries(buttonHandlers).find(([prefix]) =>
        interaction.customId.startsWith(prefix),
      )?.[1];

      if (handler !== undefined) {
        await handler(interaction);
      }
    }
  });
}
