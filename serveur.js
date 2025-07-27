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

async function requete_get_resto(URL, res){
    const ville = URL.query.ville
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

async function requete_add_resto(URL, res){
    connection.query(
        `INSERT INTO restaurants VALUES(
            ${URL.query.nom_resto},
            ${URL.query.type_resto},
            ${URL.query.adresse},
            ${URL.query.ville}, 
            1,
            ${URL.query.coup_coeur},
            ${URL.query.commentaire},
            ${URL.query.prix} )`,
        (err, results, _) =>{
        if(err){
            console.log(err);
            res.writeHead(500);
            res.end();
        }
        else{
            res.writeHead(200);
            res.end();
        }
    })
}

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

// serveur qui toune au port 8000 

const serveur = http.createServer(async (req, res) => {
    const URL= url.parse(req.url);
    if(URL.query != null){
        if(res.method == 'GET'){
            await requete_get_resto(URL, res); 
        }else{
            await requete_add_resto(URL, res);
        }
    }else{
        await retourne_page_client(URL, res);
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne au port ${port}`);
});