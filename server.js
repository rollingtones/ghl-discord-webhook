const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID || null;

app.post('/ghl-webhook', async (req, res) => {
    // 🔍 Show the full webhook payload
    console.log('Incoming webhook data:', req.body);

    // ✅ Pull data from customData object
    const { firstName = '', lastName = '', email = '' } = req.body.customData || {};

    const fullName = `${firstName} ${lastName}`.trim();
    const channelName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (!channelName) {
        console.error('Channel name is invalid:', channelName);
        return res.status(400).send('Invalid channel name');
    }

    try {
        const channelResponse = await axios.post(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
            {
                name: channelName,
                type: 0,
                parent_id: CATEGORY_ID || undefined,
            },
            {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const channelId = channelResponse.data.id;

        const inviteResponse = await axios.post(
            `https://discord.com/api/v10/channels/${channelId}/invites`,
            {
                max_age: 86400,
                max_uses: 1,
                unique: true,
            },
            {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const inviteLink = `https://discord.gg/${inviteResponse.data.code}`;
        console.log(`Send this to ${email}: ${inviteLink}`);

        res.status(200).json({ message: 'Channel created', invite: inviteLink });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).send('Something went wrong creating the channel');
    }
});

app.listen(3000, () => console.log('Server is running on port 3000'));
