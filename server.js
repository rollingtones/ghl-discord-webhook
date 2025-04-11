const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID || null;

app.post('/ghl-webhook', async (req, res) => {
    const { firstName, lastName, email } = req.body;
    const fullName = `${firstName} ${lastName}`.trim();
    const channelName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-');


    try {
        const channelRes = await axios.post(
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

        const inviteRes = await axios.post(
            `https://discord.com/api/v10/channels/${channelRes.data.id}/invites`,
            {
                max_age: 86400,
                max_uses: 1,
            },
            {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const inviteLink = `https://discord.gg/${inviteRes.data.code}`;
        console.log(`Send this to ${email}: ${inviteLink}`);
        res.status(200).json({ message: 'Channel created', invite: inviteLink });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send('Error creating channel or invite');
    }
});

app.listen(3000, () => console.log('Server is running on port 3000'));
