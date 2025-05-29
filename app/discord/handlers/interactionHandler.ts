import { Client, Interaction } from 'discord.js';
import selectMenuHandlers from '../interactions/selectMenus/index.js';


export function setupInteractionHandler(client: Client) {
    client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isStringSelectMenu()) {
            const handler = selectMenuHandlers[interaction.customId]
            if (handler) return handler(interaction)
        }

        // if (interaction.isButton()) {
        //     const handler = buttonHandlers[interaction.customId]
        //     if (handler) return handler(interaction)
        // }

        // More interractions types
    })
}
