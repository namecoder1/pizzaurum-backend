import twilio from "twilio";

const { Twilio } = twilio;

export const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
