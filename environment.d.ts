// Types for the .env fiels
declare global {
    namespace NodeJS {
      interface ProcessEnv {
        TOKEN: string;
        CLIENT_ID: string;
        GUILD_ID: string;
        VERIFICATION_CHANNEL: string;
        VERIFIED_ROLE: string;
        SENDGRID_API_KEY: string;
        LOG_FILE: string;
        ORIGIN_EMAIL: string;
      }
    }
  }
  
  // If this file has no import/export statements (i.e. is a script)
  // convert it into a module by adding an empty export statement.
  export {}