const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Load env vars
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID || null;
const ADMIN_ROLE_ID = "1204175689612402688"; // your admin role ID

app.post('/ghl-webhook', async (req, res) => {
    console.log('Incoming webhook data:', req.body);

    // Pull values from customData
    const { firstName = '', lastName = '', email = '', GHL_RETURN_URL = '' } = req.body.customData || {};

    // Generate a clean channel name
    const fullName = `${firstName} ${lastName}`.trim();
    const channelName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (!channelName) {
        console.error('Channel name is invalid:', channelName);
        return res.status(400).send('Invalid channel name');
    }

    try {
        // Step 1: Create the private Discord channel
        const channelResponse = await axios.post(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
            {
                name: channelName,
                type: 0,
                parent_id: CATEGORY_ID || undefined,
                permission_overwrites: [
                    {
                        id: GUILD_ID, // @everyone
                        type: 0,
                        deny: "1024"  // VIEW_CHANNEL
                    },
                    {
                        id: ADMIN_ROLE_ID, // Admin role
                        type: 0,
                        allow: "1024"
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const channelId = channelResponse.data.id;

        // Step 2: Create an invite link
        const inviteResponse = await axios.post(
            `https://discord.com/api/v10/channels/${channelId}/invites`,
            {
                max_age: 86400, // 1 day
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

        // Step 3: Send the invite link back to GoHighLevel
        if (GHL_RETURN_URL) {
            await axios.post(GHL_RETURN_URL, {
                email,
                inviteLink
            });
            console.log(`Webhook sent to GHL: ${GHL_RETURN_URL}`);
        } else {
            console.warn('No GHL return URL provided — invite link not sent back.');
        }

        res.status(200).json({ message: 'Private channel created and invite sent to GHL', invite: inviteLink });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).send('Something went wrong');
    }
});

app.listen(3000, () => console.log('Server is running on port 3000'));
