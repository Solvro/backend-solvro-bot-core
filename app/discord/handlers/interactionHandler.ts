import { Client, Interaction } from 'discord.js';
import selectMenuHandlers from '../interactions/selectMenus/index.js';
import { buttonHandlers } from '../interactions/buttons/index.js';

export function setupInteractionHandler(client: Client) {
    client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isStringSelectMenu()) {
            const handler = selectMenuHandlers[interaction.customId]
            if (handler) return handler(interaction)
        }

        if (interaction.isButton()) {
            // Find handler by matching prefix
            const handler = Object.entries(buttonHandlers).find(([prefix]) =>
                interaction.customId.startsWith(prefix)
            )?.[1]

            if (handler) await handler(interaction)
        }
    })
}
