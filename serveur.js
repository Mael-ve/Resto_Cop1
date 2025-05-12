// Importation des modules/Frameworks utiles 

const http = require("http");
const stream = require("node:stream")
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");


// Constante du serveur 

const DB_config = {
    password : "#Cop1BG69",
    user : "root",
    host : "localhost",
    database : "Site_Resto"
}

const connection = mysql.createConnection(DB_config);

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
 
// traitement des requêtes du client

const serveur = http.createServer((req, res) => {
    if(req.url.endsWith(".")){   // un "." correspond à une requete à la base de donnée
        connection.query(
            "SELECT * FROM restaurants", 
            (err, results, field) =>{
            if(err){
                console.log(err);
            }
            else{
                const retour = JSON.stringify(results);
                res.writeHead(200);
                res.end (retour);
            }
        })
    }else{
        let filename = req.url;
        if (req.url === "/"){
            filename = "/index.html";
        }
        const extension = path.extname(filename).substring(1).toLowerCase();
        fs.readFile(__dirname + "/site_client" + filename, (err, data) => {
            if (err) 
                console.log(err);
            else{
                res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                res.end(data);
            }
        })
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne à l'adresse http://localhost:${port}/`);
});