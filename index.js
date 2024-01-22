require("dotenv").config();
const { Bot } = require("./Bot.js");
const { OpenAI } = require("openai");
const messages = require("./Messages");
const googleMapsClient = require("@google/maps").createClient({
  key: "AIzaSyD-MBOkeqLuhCMXYpFH5jeje4Ae5exmuYE",
});

const fs = require("fs");

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

let numCount = 0;

const getResponse = async (msg, num) => {
  let chatCompletion = null;
  const contact = messages.contactInfo[num];
  const orderHistory = messages.orderHistory[num];
  let extra = "";
  /*  
    ? `\nYou are talking to ${contact.name}, he lives in the address ${contact.address}. Remember it when you make the order. But ALWAYS aks him to confirm his direction, it's very important`
    : "";
  console.log(orderHistory);
  if (orderHistory) {
    extra += `\n\n The client haves ordered ${orderHistory.length} times in the past. The last orders were:\n`;
    extra += JSON.stringify(orderHistory);
  }

  console.log(extra);
*/

  try {
    // envia el conjunto de mensajes al gpt
    let sysprompt = fs.readFileSync("syspromt.txt", "utf8");

    sysprompt = sysprompt.replace(
      "[LA HORA QUE ES]",
      new Date().toLocaleTimeString()
    );
    console.log(sysprompt);

    chatCompletion = await openai.chat.completions
      .create({
        messages: [
          {
            role: "system",
            content: sysprompt + extra,
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
            function: async function (data) {
              // Verifica si el nombre del cliente está presente
              if (!data.client.name) {
                return {
                  response:
                    "Por favor, dime tu nombre para completar el pedido.",
                };
              }
              // Verifica si el Codigo postal esta presente
              if (!data.client.postalCode) {
                return {
                  response:
                    "Por favor, dime tu codigo postal para completar el pedido.",
                };
              }
              // Verifica si la direccion esta presente
              if (!data.client.address) {
                return {
                  response:
                    "Por favor, dime tu direccion para completar el pedido.",
                };
              }

              // Verifica si la direccion es valida
              if (!(await verificarDireccion(data.client.address))) {
                return {
                  response:
                    "Lo siento, la direccion proporcionada no es valida.",
                };
              }

              const allowedPostalCodes = ["08320", "08328", "08329"];
              if (!allowedPostalCodes.includes(data.client.postalCode)) {
                return {
                  response:
                    "Lo siento, no realizamos entregas en el código postal proporcionado. Los códigos postales permitidos son: 08232, 08345, 08443.",
                };
              }

              return {
                // Respuesta de éxito con los detalles del pedido
              };
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
    const date = new Date();
    const argumentos = JSON.parse(func.arguments);
    console.log(func.arguments);
    const ticket = `[align: center][bold: on]
    Numero de pedido 
    [magnify: width 3; height 3]
    [negative: on]${
      argumentos.client.postalCode === "08328"
        ? "A"
        : argumentos.client.postalCode === "08320"
        ? "M"
        : "T"
    }-${++numCount}[negative: off][magnify: width 1; height 1][bold: off]
    GONDAL ISTAMBUL
    C/SEVILLA 5 (08320) EL MASNOU
    619369404
    
    [bold: on]
    DATOS DEL PEDIDO
    [bold: off]
    ${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()}   ${date.getHours()}:${date.getMinutes()}
    ${argumentos.items
      .map((item) => {
        return `[column: left ${item.quantity}x ${item.name} ; right ${item.price}€ ]`;
      })
      .join("\n")}
    [bold: on]
    [magnify: width 2; height 2]
    [negative: on]
    ${argumentos.paymentMethod.toUpperCase()}
    [negative: off]
    [magnify: width 1; height 1]
    
    DATOS DEL CLIENTE
    [bold: off]
    ${argumentos.client.name}
    ${num}
    ${argumentos.client.address}
    
    [barcode: type qr; data ${`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      argumentos.client.address
    )}`} ; error-correction L; cell 8; model 2]`;
    // TODO: implementar funciones
    console.log(func.arguments);
    const sql = `INSERT INTO impresoraCola (id, Impresora, Texte, tmstpeticio) VALUES (newid(),'Obrador_117_Tot', '${ticket} ', getdate());`;
    // recHit("fac_carne", sql);
    messages.contactInfo[num] = {
      name: argumentos.client.name,
      address: argumentos.client.address,
    };

    // guardo los 2 ultimos pedidos
    /*
    if (messages.orderHistory[num]) {
      messages.orderHistory[num].push(argumentos.items);
    } else {
      messages.orderHistory[num] = [argumentos.items];
    }
    messages.orderHistory[num] = messages.orderHistory[num].slice(-2);
*/

    const tiempo =
      argumentos.paymentMethod.toUpperCase() === "TARJETA" ? 50 : 30;
    //return "Pedido recibido, tardara " + tiempo + " minutos aproximadamente";
    return ticket;
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
      let mensaje = "";
      messages
        .getMessages(msg.from)
        .then((mensajes) => {
          getResponse(mensajes, msg.from)
            .then((respuesta) => {
              mensaje = respuesta;
              // envia el mensaje
              if (mensaje.includes("Confirmación de impresión del ticket")) {
                // Borra los mensajes una vez que el ticket ha sido impreso
                messages.deleteMessages(msg.from);
              } else {
                // Si no se ha impreso el ticket, añade la respuesta al registro
                messages.addRespone(msg.from, mensaje);
              }
              // envia el mensaje
              bot.sendTextMessage(mensaje, msg.from);
            })
            .catch((e) => {
              mensaje = "error comunicando con el gpt";
              bot.sendTextMessage(mensaje, msg.from);
            });
        })
        .catch((e) => {
          console.log("error al recuperar los mensajes del usuario");
        });
    })
    .catch((e) => {
      console.log(e);
    });
}
