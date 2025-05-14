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

const requete_BDD = ["lyon", "paris"];
 
// traitement des requêtes du client

function return_404(res){
    fs.readFile(__dirname + "/site_client/404.html", (err, data) => {
        if(err){
            console.log("Normalement impossible, le fichier existe");
        }
        else{
            res.writeHead(404);
            res.end(data);
        }
    })
}

function IsRequeteBDDValide(url){
    // cherche si la requete est une requete à la base de donnée
    return url.split(/\/api\/get_resto\?=/)
            .some((mot) => {return requete_BDD.indexOf(mot) > -1});
}

const serveur = http.createServer((req, res) => {
    if(IsRequeteBDDValide(req.url)){  // regarde si la requete est une requete à la base de donnée
        const ville = req.url.split(/\/api\/get_resto\?=/)[1];
        connection.query(
            `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville='${ville}'`, 
            (err, results, field) =>{
            if(err){
                console.log(err);
            }
            else{
                const retour = JSON.stringify(results);
                res.writeHead(200);
                res.end(retour);
            }
        })
    }else{
        let filename = req.url;
        if(!filename.match(/\.\./)){
            if (filename === "/"){
                filename = "/index.html";
            }
            const extension = path.extname(filename).substring(1).toLowerCase();
            fs.readFile(__dirname + "/site_client" + filename, (err, data) => {
                if (err) 
                    return_404(res);
                else{
                    res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                    res.end(data);
                }
            })
        }
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne à l'adresse http://localhost:${port}/`);
});