# CSEDiscordVerification

## Initial Setup
1. Clone the repository
2. `cd CSEDiscordVerification`
3. `cp .env-example .env`
4. `cp verified-example.csv verified.csv`
5. `nano .env` or whatever editor you prefer
6. Fill in your TOKEN and CLIENT_ID with your Discord bot info from the [Discord Developer portal](https://discord.com/developers/applications)
7. Set GUILD_ID to the ID of your server
8. Set VERIFICATION to the channel where you want the verification modal to appear
9. Set VERIFIED_ROLE to the role you want to give users after they verify
10. Make a [Sendgrid account](https://app.sendgrid.com/) or login to your account
11. [Make a Sendgrid API key](https://app.sendgrid.com/settings/api_keys) and copy it
12. Set the SENDGRID_API_KEY in the .env to the API key you just copied
13. Set up [single sender verification](https://app.sendgrid.com/settings/sender_auth) and set ORIGIN_EMAIL to whatever email you set it up with
14. Save and close the .env file (in nano: ctrl + x, press y, press enter)
15. `npm install`
16. `npx tsc`
17. `node out/verification-message.js`

## Running the bot
1. Run `npx tsc` if you've updated the code recently
2. `node out/bot.js`
