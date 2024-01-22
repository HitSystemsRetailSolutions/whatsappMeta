const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

class Bot {
  from = "YOUR_WHATSAPP_PHONE_NUMBER_ID";
  token = "YOUR_TEMPORARY_OR_PERMANENT_ACCESS_TOKEN";
  to = "PHONE_NUMBER_OF_RECIPIENT";
  webhookVerifyToken = "YOUR_WEBHOOK_VERIFICATION_TOKEN";

  constructor(callback) {
    this.from = process.env.WA_PHONE_NUMBER_ID;
    this.token = process.env.CLOUD_API_ACCESS_TOKEN;
    this.webhookVerifyToken = process.env.WEBHOOK_VERIFICATION_TOKEN;

    this.app = express();
    this.middlewares();
    this.routes();
    this.listen();
    this.callback = callback;
  }

  middlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
  }

  routes() {
    this.app.get(`/webhook`, (req, res) => {
      if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === this.webhookVerifyToken
      ) {
        res.status(200).send(req.query["hub.challenge"]);
      } else {
        res.sendStatus(400);
      }
    });
    this.app.post(`/webhook`, (req, res) => {
      const { entry } = req.body;
      if (entry[0]?.changes[0]?.field === "messages") {
        const msg = entry[0]?.changes[0]?.value?.messages;
        if (!msg) {
          return res.sendStatus(200);
        }
        this.callback(msg[0]);
      }

      res.sendStatus(200);
    });
  }

  listen() {
    this.app.listen(process.env.LISTENER_PORT || 3000, () => {
      console.log(`Server listening on port ${process.env.LISTENER_PORT}`);
    });
  }

  sendTextMessage(message, to) {
    const data = this.getTextMessageInput(to, message);

    const config = {
      method: "post",
      url: `https://graph.facebook.com/${process.env.VERSION}/${this.from}/messages`,
      headers: {
        Authorization: `Bearer ${process.env.CLOUD_API_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    return axios(config);
  }

  getTextMessageInput(recipient, text) {
    return JSON.stringify({
      messaging_product: "whatsapp",
      preview_url: false,
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        body: text,
      },
    });
  }
}

module.exports = {
  Bot,
};
