// Importation des modules/Frameworks utiles 

const url = require("node:url");
const bdd = require("./access_bdd.js");
const http = require("http");
const stream = require("node:stream")
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");


// Constante du serveur 

const connection = mysql.createConnection(bdd.DB_config);

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

async function retourne_page_client(URL, res){
    let chemin = URL.pathname;
    if(!chemin.match(/\.\./)){ // match("..") ne fonctionne pas, vérfie s'il n'y pas /.. dans l'url pour la sécurité
        if (chemin === "/"){ 
            chemin = "/index.html";
        }
        const extension = path.extname(chemin).substring(1).toLowerCase(); // retourne l'extension du fichier cherché
        fs.readFile(__dirname + "/site_client" + chemin, "binary", (err, data) => {
            if (err) 
                return_404(res);
            else{
                let retour = data;
                res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                const modif = URL.query.ville
                if(modif != null && extension === "html"){
                    retour = retour.replace(/{{ville}}/g, modif.toUpperCase());
                }
                res.write(retour);
                res.end();
            }
        })
    }
}

 async function requete_api_get_resto(ville, res){
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

const regex_api = /\/(.*)\/(.*)\?(.*)=(.*)/;

const serveur = http.createServer(async (req, res) => {
    const requete_api = req.url.match(regex_api);
    if(requete_api != null){  // regarde si la requete est une requete api (requete à un serveur externe, ici serveur de base de donnée)
        await requete_api_get_resto(requete_api[4], res); // pour l'instant seul requete d'api valide
    }else{
        const URL =url.parse(req.url, true);
        await retourne_page_client(URL, res);
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne au port ${port}`);
});