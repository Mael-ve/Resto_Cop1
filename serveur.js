// Importation des modules/Frameworks utiles 

const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("@mysql/xdevapi");


// Constante du serveur 

const DB_config = {
    password : "#Cop1BG69",
    user : "root",
    host : "localhost",
    port : 33060,
    schema : "Site_resto"
}

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
        mysql.getSession(DB_config)
            .then((session) => {
                res.writeHead(200);
                session.sql("SElECT * FROM restaurants")
                    .execute((row) => {
                        let retour = JSON.stringify(row);
                        res.write(retour);
                    });
                res.end();
            })
            .catch((err) => {
                console.log(err);
            })
    }else{
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
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne à l'adresse http://localhost:${port}/`);
});