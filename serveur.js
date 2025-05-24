// Importation des modules/Frameworks utiles 

const http = require("http");
const stream = require("node:stream")
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");


// Constante du serveur 

// à load dans un fichier externe
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

const requete_BDD = ["lyon", "paris"]; // utiliser un dico 

 
// traitement des requêtes du client

function return_404(res){
    fs.readFile(__dirname + "/site_client/404.html", (err, data) => {
        if(err){
            console.log("fichier 404 n'existe pas", err);
            res.writeHead(500);
            res.end();
        }
        else{
            res.writeHead(404);
            res.end(data);
        }
    })
}

function retourne_page_client(url, res){
    if(!url.match(/\.\./)){ // match("..") ne fonctionne pas, vérfie s'il n'y pas /.. dans l'url pour la sécurité
        if (url === "/"){
            url = "/index.html";
        }
        const extension = path.extname(url).substring(1).toLowerCase(); // retourne l'extension du fichier cherché
        fs.readFile(__dirname + "/site_client" + url, (err, data) => {
            if (err) 
                return_404(res);
            else{
                res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                res.end(data);
            }
        })
    }
}

function requete_api_get_resto(ville, res){
    connection.query(
        `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville='${ville}'`, 
        (err, results, _) =>{
        if(err){
            console.log(err);
            res.writeHead(500);
            res.end();
        }
        else{
            const retour = JSON.stringify(results);
            res.writeHead(200);
            res.end(retour);
        }
    })
}

// serveur qui toune au port 8000 

const regex_api = /\/(.*)\/(.*)\?(.*)=(.*)/

const serveur = http.createServer((req, res) => {
    const requete = req.url.match(regex_api);
    if(requete != null){  // regarde si la requete est une requete api (requete à un serveur externe, ici serveur de base de donnée)
        requete_api_get_resto(requete[4], res); // pour l'instant seul requte d'api valide
    }else{
        retourne_page_client(req.url, res);
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne au port ${port}`);
});