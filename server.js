const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID || null;
const ADMIN_ROLE_ID = "1204175689612402688"; // Your Admin Role ID

app.post('/ghl-webhook', async (req, res) => {
  console.log('Incoming webhook data:', req.body);

  // Extract top-level contact fields
  const {
    contact_id: contactId,
    phone = '',
    first_name: firstNameRaw = '',
    last_name: lastNameRaw = ''
  } = req.body;

  // Extract customData fields
  const {
    firstName = '',
    lastName = '',
    email = '',
    phone: phoneFromCustom = '',
    companyName = '',
    GHL_RETURN_URL = ''
  } = req.body.customData || {};

  // Fallbacks if missing
  const safeFirstName = firstName || firstNameRaw || '';
  const safeLastName = lastName || lastNameRaw || '';
  const safePhone = phoneFromCustom || phone || '';
  const safeCompany = companyName || 'no-name';

  // Build clean Discord-safe channel name
  const cleanCompany = safeCompany
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

  const cleanFullName = `${safeFirstName}-${safeLastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

  const channelName = `${cleanCompany}-${cleanFullName}`.substring(0, 100);

  if (!channelName) {
    console.error('❌ Channel name is invalid:', channelName);
    return res.status(400).send('Invalid channel name');
  }

  try {
    // 1. Create the private text channel
    const textChannelResponse = await axios.post(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        name: channelName,
        type: 0, // Text
        parent_id: CATEGORY_ID || undefined,
        permission_overwrites: [
          {
            id: GUILD_ID,
            type: 0,
            deny: "1024"
          },
          {
            id: ADMIN_ROLE_ID,
            type: 0,
            allow: "1024"
          }
        ]
      },
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const textChannelId = textChannelResponse.data.id;

    // 2. Create the private voice channel
    await axios.post(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        name: `${channelName}-voice`,
        type: 2, // Voice
        parent_id: CATEGORY_ID || undefined,
        permission_overwrites: [
          {
            id: GUILD_ID,
            type: 0,
            deny: "1024"
          },
          {
            id: ADMIN_ROLE_ID,
            type: 0,
            allow: "1024"
          }
        ]
      },
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    // 3. Generate a one-time invite to the text channel
    const inviteResponse = await axios.post(
      `https://discord.com/api/v10/channels/${textChannelId}/invites`,
      {
        max_age: 86400,
        max_uses: 1,
        unique: true
      },
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const inviteLink = `https://discord.gg/${inviteResponse.data.code}`;
    console.log(`✅ Invite link for ${email}: ${inviteLink}`);

    // 4. Send the invite back to GoHighLevel
    if (GHL_RETURN_URL) {
      await axios.post(GHL_RETURN_URL, {
        contactId,
        firstName: safeFirstName,
        lastName: safeLastName,
        email,
        phone: safePhone,
        companyName: safeCompany,
        inviteLink
      });

      console.log(`✅ Webhook sent to GHL: ${GHL_RETURN_URL}`);
    } else {
      console.warn('⚠️ No GHL return URL provided — invite not sent back.');
    }

    res.status(200).json({
      message: 'Private text and voice channels created, invite sent to GHL',
      invite: inviteLink
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    res.status(500).send('Something went wrong');
  }
});

app.listen(3000, () => console.log('🚀 Server is running on port 3000'));
