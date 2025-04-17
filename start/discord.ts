import env from '#start/env'
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.login(env.get('DISCORD_TOKEN'))
