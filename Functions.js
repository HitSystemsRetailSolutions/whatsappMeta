const { recHit } = require("./mssql/mssql");

class Functions {
  // contador de pedidos
  numCount = 0;
  // funcion de añadir pedido
  addOrder(func, num) {
    console.log("haciendo pedido");

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
    }-${++this.numCount}[negative: off][magnify: width 1; height 1][bold: off]
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
    // Imprimir tickets
    const sql = `INSERT INTO impresoraCola (id, Impresora, Texte, tmstpeticio) VALUES (newid(),'Tienda_842_Tot', '${ticket} ', getdate());`;
    recHit("fac_tena", sql);

    // Añadimos pedido a la base de datos
    let pedidoString = argumentos.items
      .map((item) => item.name)
      .join(", ")
      .slice(0, -2);

    const sqlFicha = `INSERT INTO WatsappBotState VALUES (GETDATE(), '${num}', '${process.env.WA_PHONE_NUMBER_ID}', 'user_order', NULL, ${pedidoString})`;

    recHit("fac_iterum", sqlFicha).catch((e) => console.log(e));

    const tiempo =
      argumentos.paymentMethod.toUpperCase() === "TARJETA" ? 50 : 30;
    return "Pedido recibido, tardara " + tiempo + " minutos aproximadamente";
    // return ticket;
  }
}

const functions = new Functions();
module.exports = {
  functions,
};
