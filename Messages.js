const fs = require("fs");
require("dotenv").config();
const { recHit } = require("./mssql/mssql.js");
// Clase Messages
class Messages {
  // Método constructor
  constructor() {}

  // Método para agregar un mensaje de usuario
  addMessage(phone, message) {
    return new Promise((resolve, reject) => {
      const date = new Date();
      const sql = `INSERT INTO WatsappBotState values (GETDATE(), '${phone}', '${process.env.WA_PHONE_NUMBER_ID}', 'user_message', NULL, '${message}');`;

      recHit("fac_iterum", sql)
        .then(() => {
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  // Método para agregar una respuesta del asistente
  addRespone(phone, message) {
    return new Promise((resolve, reject) => {
      // Actualizar el archivo de respaldo
      const date = new Date();
      const sql = `INSERT INTO WatsappBotState values (GETDATE(), '${process.env.WA_PHONE_NUMBER_ID}', '${phone}', 'bot_message', NULL, '${message}');`;

      recHit("fac_iterum", sql)
        .then(() => {
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  }

  // Método para obtener los mensajes de un número de teléfono
  getMessages(phone) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT TOP 100 * FROM WatsappBotState WHERE Origen = '${phone}' OR Desti = '${phone}' ORDER BY tmst DESC;`;
      recHit("fac_iterum", sql)
        .then((result) => {
          const resultado = result.recordset.map((element) => {
            return {
              role: element.Origen === phone ? "user" : "assistant",
              content: element.Valor,
            };
          });
          resolve(resultado.reverse());
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  // Método para obtener el último mensaje de un número de teléfono
  getLastMessage(phone) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT TOP 1 * FROM WatsappBotState WHERE Origen = '${phone}' OR Desti = '${phone}' ORDER BY tmst DESC;`;
      recHit("fac_iterum", sql)
        .then((result) => {
          const resultado = result.recordset.map((element) => {
            return {
              role: element.Origen === phone ? "user" : "assistant",
              content: element.Valor,
            };
          });
          resolve(resultado[0]);
        })
        .catch(() => {
          reject();
        });
    });
  }

  // Método para obtener el segundo último mensaje de un número de teléfono
  getSecondLastMessage(phone) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT TOP 2 * FROM WatsappBotState WHERE Origen = '${phone}' OR Desti = '${phone}' ORDER BY tmst DESC;`;
      recHit("fac_iterum", sql)
        .then((result) => {
          const resultado = result.recordset.map((element) => {
            return {
              role: element.Origen === phone ? "user" : "assistant",
              content: element.Valor,
            };
          });
          resolve(resultado[1]);
        })
        .catch(() => {
          reject();
        });
    });
  }

  // Método para eliminar todos los mensajes de un número de teléfono
  deleteMessages(phone) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM WatsappBotState WHERE Origen = '${phone}' OR Desti = '${phone}';`;
      recHit("fac_iterum", sql)
        .then(() => {
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  }
}

// Crear una instancia de la clase Messages y la exporta
const messages = new Messages();
module.exports = messages;
