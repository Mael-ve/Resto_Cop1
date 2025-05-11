// Importation des modules/Frameworks utiles 

const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("@mysql/xdevapi");


// Gestion de la base de donnée 

const DB_config = {
    password : "#Cop1BG69",
    user : "root",
    host : "localhost",
    port : 33060,
    schema : "Site_Resto"
}
mysql.getSession(DB_config)
    .then(session =>{
        return session.getSchema("Site_Resto").getTable('commentateur').count();
    })
    .then(count => {
        console.log(count);
    })

// Constante du serveur 

const port = 8000;

const MIME_TYPES = {
    default: "application/octet-stream",
    html: "text/html; charset=UTF-8",
    js: "text/javascript",
    css: "text/css",
    png: "image/png",
    jpg: "image/jpeg",
    gif: "image/gif",
    ico: "image/x-icon",
    svg: "image/svg+xml",
};
 
// traitement des requêtes statique du client

const serveur = http.createServer((req, res) => {
    let filename = req.url;
    if (req.url === "/"){
        filename = "/index.html";
    }
    const extension = path.extname(filename).substring(1).toLowerCase();
    fs.readFile(__dirname + "/site_client" + filename, (err, data) => {
        if (err) 
            console.log(`${err}`);
        else{
            res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
            res.end(data);
        }
    })
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne à l'adresse http://localhost:${port}/`);
});