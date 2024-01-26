require("dotenv").config();
const { Bot } = require("./Bot.js");
const { OpenAI } = require("openai");
const messages = require("./Messages");
const googleMapsClient = require("@google/maps").createClient({
  key: "AIzaSyD-MBOkeqLuhCMXYpFH5jeje4Ae5exmuYE",
});

const fs = require("fs");
const { functions } = require("./Functions.js");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const verificarDireccion = (direccion) => {
  return new Promise((resolve, reject) => {
    googleMapsClient.geocode({ address: direccion }, (err, response) => {
      if (!err) {
        // Aquí puedes verificar si la respuesta contiene los datos de geolocalización
        if (response.json.results.length > 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      } else {
        reject(err);
      }
    });
  });
};

const getResponse = async (msg, num) => {
  let chatCompletion = null;

  try {
    // envia el conjunto de mensajes al gpt
    let sysprompt = fs.readFileSync("syspromt.txt", "utf8");

    sysprompt = sysprompt.replace(
      "[LA HORA QUE ES]",
      new Date().toLocaleTimeString()
    );

    console.log({ [num]: msg });

    chatCompletion = await openai.chat.completions
      .create({
        messages: [
          {
            role: "system",
            content: sysprompt,
          },
          ...msg,
        ],
        model: "gpt-3.5-turbo-1106",
        functions: [
          {
            name: "addOrder",
            description: "Adds a client order",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                      },
                      quantity: {
                        type: "integer",
                      },
                      price: {
                        type: "number",
                      },
                    },
                    required: ["name", "quantity", "price"],
                  },
                  description: "An array with items that has been ordered",
                },
                paymentMethod: {
                  type: "string",
                  Option: ["EFECTIVO", "TARJETA"],
                  description: "The payment method used",
                },
                client: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "The name of the client",
                    },
                    address: {
                      type: "string",
                      description: "The address of the client",
                    },
                    postalCode: {
                      type: "string",
                      description:
                        "The client postal code on of [08320,08328,08329]",
                    },
                  },
                  required: ["name", "address", "postalCode"],
                  description: "The client that made the order",
                },
              },
              required: ["items", "paymentMethod", "client"],
            },
          },
        ],

        function_call: "auto",
      })
      .catch((e) => {
        console.error("Error al comunicarse con OpenAI:", e);
        throw new Error("error comunicando con el gpt");
      });
  } catch (e) {
    console.error("Error manejado:", e.message);
    return e.message;
  }
  // mira si el gpt quiere ejecutar una funcion
  const func = chatCompletion.choices[0].message.function_call;
  if (func) {
    let respuetaFuncion = "";
    switch (func.name) {
      case "addOrder":
        respuetaFuncion = functions.addOrder(func, num);
        messages.deleteMessages(num);
        break;
      default:
        respuetaFuncion = "No se ha encontrado la funcion";
        break;
    }

    return respuetaFuncion;
  }

  // recoje la respuesta del gpt y la devuelve al usuario
  let response = chatCompletion.choices[0].message.content;
  return `${response}`;
};

const bot = new Bot(handleNewMsg);

async function handleNewMsg(msg) {
  // añade el mensaje al registro
  messages
    .addMessage(msg.from, msg.text.body)
    .then(() => {
      // obtiene la respuesta del gpt
      messages
        .getMessages(msg.from)
        .then((mensajes) => {
          getResponse(mensajes, msg.from)
            .then((respuesta) => {
              // envia el mensaje
              if (respuesta.includes("Confirmación de impresión del ticket")) {
                // Borra los mensajes una vez que el ticket ha sido impreso
                messages.deleteMessages(msg.from).catch((e) => console.log(e));
              } else {
                // Si no se ha impreso el ticket, añade la respuesta al registro
                messages
                  .addRespone(msg.from, respuesta)
                  .catch((e) =>
                    console.log(
                      "No se ha podido añadir la respuesta en la BBDD"
                    )
                  );
              }
              // envia el mensaje
              bot
                .sendTextMessage(respuesta, msg.from)
                .catch((e) => console.log(e));
            })
            .catch((e) => {
              console.log(e);
              respuesta = "error comunicando con el gpt";
              bot.sendTextMessage(respuesta, msg.from);
            });
        })
        .catch((e) => {
          console.log(e);
        });
    })
    .catch((e) => {
      console.log(e);
    });
}
