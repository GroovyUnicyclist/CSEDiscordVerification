import * as dotenv from 'dotenv';
dotenv.config();

import { GatewayIntentBits } from 'discord-api-types';
import { ButtonInteraction, Client, Interaction, ModalSubmitInteraction } from 'discord.js';
import sgMail from '@sendgrid/mail';
import fs from 'fs';

// The Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Sets Sendgrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// The object which creates a modal for entering your email
const emailModal = {
    title: "Enter Your Email Address",
    customId: "email_modal",
    components: [{
        type: 1,
        components: [{
            type: 4,
            custom_id: "email_field",
            label: "Email",
            style: 1,
            min_length: 11,
            required: true,
            placeholder: "brutus.1@osu.edu"
        }]
    }]
}

// The object which creates a modal for entering your verification code
const codeModal = {
    title: "Enter Your Verification Code",
    customId: "code_modal",
    components: [{
        type: 1,
        components: [{
            type: 4,
            custom_id: "code_field",
            label: "Code",
            style: 1,
            min_length: 6,
            max_length: 6,
            required: true,
            placeholder: "Enter the 6 digit verification code sent to your email"
        }]
    }]
}

// The object which creates a button for the prompt to reenter your email
const reenterButton = [{
    type: 1,
    components: [
        {
            type: 2,
            label: "Reenter Email",
            style: 3,
            custom_id: "email_reenter"
        }
    ]
}];

// The map which contains the verification codes that corresond to the users who requested them
let codes: Map<string, string> = new Map()
let emails: Map<string, string> = new Map()

/**
 * Checks if the specified user has been verified
 * @param interaction the interaction for which this check is being performed for
 * @param user the id of the user whose verification status is being checked
 * @returns whether or not the specified user has been verified
 */
async function isVerified(interaction: Interaction, user: string): Promise<boolean> {
    // Check if the user has the verified role
    if (interaction.guild?.members.cache.get(user)?.roles.cache.has(process.env.VERIFIED_ROLE)) {
        // Notifies the user that they have already been verified if the interaction is repliable
        if (interaction.isRepliable()) {
            await interaction.reply({ content: 'Error: You are already verified!', ephemeral: true }).catch(console.error);
        }
        return true;
    }
    return false;
}

/**
 * Handles Discord button interaction events
 */
async function handleButton(interaction: ButtonInteraction) {
    // The id of the user submitting the modal interaction
    const user = interaction.user.id;
    switch (interaction.customId) {
        // Email button
        case "email":
            // Ensures user has not already verified
            if (!await isVerified(interaction, user)) {
                // Sends followup if user has already entered their email, in case they need to try to resend their email
                if (codes.has(user)) {
                    await interaction.reply({ content: 'You\'ve already entered your email. Would you like to reenter your email and get a new code?', components: reenterButton , ephemeral: true }).catch(console.error);
                } else {
                    // Shows the modal to enter email
                    await interaction.showModal(emailModal).catch(console.error);
                }
            }
            break;
        // Email button when notified that email has already been entered
        case "email_reenter":
            // Ensures user has not already verified
            if (!await isVerified(interaction, user)) {
                // Shows the modal to enter email
                await interaction.showModal(emailModal).catch(console.error);
            }
            break;
        // Verification code button
        case "code":
            // Ensures user has not already verified
            if (!await isVerified(interaction, user)) {
                // Ensures has already entered an email and received a code in their email
                if (codes.has(user)) {
                    // Shows the modal to enter verification code
                    await interaction.showModal(codeModal).catch(console.error);
                } else {
                    await interaction.reply({ content: 'Please press the other button to enter your email first.', ephemeral: true }).catch(console.error);
                }
            }
            break;
    
        default:
            await interaction.reply({ content: 'Error: Unknown interaction', ephemeral: true }).catch(console.error);
            break;
    }
}

/**
 * Sends an email containing the verification code to the specificed user through Sendgrid
 * @param email The email of the user
 * @param code The verification code to send to theuser
 */
async function sendVerificationEmail(email: string, code: string) {
    
// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const msg = {
    to: email,
    from: process.env.ORIGIN_EMAIL,
    subject: 'CSE Discord Verification Code',
    text: 'Use this code to verify your email!',
    html: `<h2>Welcome to the CSE Discord Server!</h2><p>Here is your verification code:</p><br><p>${code}</p><br><p>Invite your friends to the Discord: <a href="https://discord.gg/9dtMjkpenT">https://discord.gg/9dtMjkpenT</a></p><p>If you were not expecting this email, you may safely ignore it.</p>`,
}
sgMail
    .send(msg)
    .then(() => {
        console.log(`Email sent to ${email}`);
    })
    .catch((error) => {
        console.error(error);
    })
}

/**
 * Handles modal submit interactions from Discord for both the email modal and the verification code modal
 * @param interaction The modal submit interaction that triggered this action
 */
async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    // The id of the user submitting the modal interaction
    const user = interaction.user.id;
    switch (interaction.customId) {
        // Email modal interaction
        case "email_modal":
            // Sets the member variable to the result of searching Wild Apricot for the member by email, can be null
            
            // If email is valid, create a 6 digit code, and send the member a verification email
            const email = interaction.fields.getTextInputValue("email_field").replace("buckeyemail.", "")
            if (/^[a-zA-Z-]+.\d+@osu.edu$/.test(email)) {
                const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
                codes.set(user, code);
                emails.set(user, email);
                console.log(`Created code: ${code} for user ${user} with email ${email}`);
                await sendVerificationEmail(email, code);
                await interaction.reply({ content: 'Please check your email for your verification code. Then press the gray button above to enter your code.', ephemeral: true }).catch(console.error);
            } else {
                await interaction.reply({ content: 'You did not provide a valid OSU email! Your email must have the format `name.#@osu.edu` or `name.#@buckeyemail.osu.edu`', ephemeral: true }).catch(console.error);
            }
            break;
        // Verification code modal interaction
        case "code_modal":
            // Checks the codes map to see if the user has been assigned a code
            if (codes.has(user)) {
                // Checks if the code entered matches the code assigned
                if (interaction.fields.getTextInputValue("code_field") === codes.get(user)) {
                    // Gives the verified role to the user
                    await interaction.guild?.members.cache.get(user)?.roles.add(process.env.VERIFIED_ROLE, "verification").catch(console.error);
                    // Deletes user and their code from the map
                    codes.delete(user);
                    // Adds log of user verification to csv file
                    fs.appendFile(process.env.LOG_FILE, `${user},${emails.get(user)},${new Date()},${interaction.user.username}#${interaction.user.discriminator}\n`, function (err) {
                        if (err) throw err;
                    });
                    console.log(`User ${user} has been verified with email ${emails.get(user)}!`)
                    // Deletes user and their email from the map
                    emails.delete(user);
                    await interaction.reply({ content: 'Your account has successfully been verified! Enjoy the server!', ephemeral: true }).catch(console.error);
                } else {
                    await interaction.reply({ content: 'Error: Incorrect verification code entered', ephemeral: true }).catch(console.error);
                }
            } else {
                await interaction.reply({ content: 'Error: Verification code not found, please enter your email again', ephemeral: true }).catch(console.error);
            }
            break;
    
        default:
            await interaction.reply({ content: 'Error: Unknown interaction', ephemeral: true }).catch(console.error);
            break;
    }
}

if (client != null) {
    /**
     * Logs bot into Discord and reads token data from config.json
     */
    client.on('ready', () => {
        console.log(`Logged in as ${client.user ? client.user.tag : ''}!`);
    });

    /**
     * Handles Discord interaction events
     */
    client.on('interactionCreate', async (interaction: Interaction) => {
        try {
            if (interaction.isButton()) {
                handleButton(interaction);
            } else if (interaction.isModalSubmit()) {
                handleModalSubmit(interaction);
            }
        } catch (error) {
            console.error(error);
            if (interaction.isRepliable()) {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }).catch(console.error);
            }
        }

    });

    client.login(process.env.TOKEN);
}