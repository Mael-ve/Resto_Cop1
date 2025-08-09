// Importation des modules/Frameworks utiles 

const url = require("node:url");
const bdd = require("./access_bdd.json");
const http = require("http");
const stream = require("node:stream")
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");
const querystring = require('querystring');


// Constante du serveur 
let connection = null;
(async () => {
    connection = await mariadb.createConnection({
    user : bdd.user,
    host : bdd.host,
    password : bdd.password,
    database : bdd.database
})})()

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

const requete_securisée = {
    "/ajout_resto.html": (URL, res) => {requete_add_resto(URL, res);}
}; 

 
// traitement des requêtes du client

async function requete_get_resto(URL, res){
    const ville = querystring.parse(URL.query).ville;
    try{
        const results = await connection.query(`SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="${ville}"`);
        res.writeHead(200);
        res.end(JSON.stringify(results));
    }
    catch (err){
        console.log(err);
        res.writeHead(500);
        res.end();
    }
}

async function requete_add_resto(URL, res){ 
    console.log("bon appel");
    const request = querystring.parse(URL.query);
    try{
        await connection.query(
        `INSERT INTO restaurants VALUES("${request.nom_resto}", "${request.type_resto}", "${request.adresse}","${request.ville}", 1, ${request.coup_coeur === null}, "${request.commentaire}", "${request.prix}" )`,
        );
        retourne_page_client_statique("/ajout_resto.html", res);
    }
    catch(err){
        console.log(err);
        res.writeHead(500);
        res.end();
    }
}

function verification_identification(URL, res){
    const request = querystring.parse(URL.query);
    connection.query(`SELECT mot_passe FROM commentateur where pseudo='${request.username}'`, (err, results, _)=>{
        if(err){
            console.log(err);
            res.writeHead(500);
            res.end();
        }
        else{
            if(results[0].mot_passe === request.mdp){
                retourne_page_client_statique("/ajout_resto.html", res);
            }
            else{
                return_404(res);
            }
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

async function retourne_page_client_dynamique(URL, res){
    const chemin = URL.pathname;
    if(!chemin.match(/\.\./)){
        const extension = path.extname(chemin).substring(1).toLowerCase();
        fs.readFile(__dirname + "/site_client" + chemin, "binary", (err, data) =>{
            if(err){
                return_404(res);
            }else{
                let retour = data;
                res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                const modif = querystring.parse(URL.query).ville;
                retour = retour.replace(/{{ville}}/g, modif.toUpperCase());
                res.write(retour);
                res.end();
            }
        })
    }
}


async function retourne_page_client_statique(chemin, res){
    if(!chemin.match(/\.\./)){ // match("..") ne fonctionne pas, vérfie s'il n'y pas /.. dans l'url pour la sécurité
        if (chemin === "/"){ 
            chemin = "/index.html";
        }

        const extension = path.extname(chemin).substring(1).toLowerCase(); // retourne l'extension du fichier cherché
        let chemin_abs = "";
        if(extension === 'ico' || extension === 'png'){
            chemin_abs = __dirname + "/site_client/favicon_io" + chemin;
        }
        else{
            chemin_abs = __dirname + "/site_client" + chemin;
        }

        fs.readFile(chemin_abs, (err, data) => {
            if (err) 
                return_404(res);
            else{
                res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                res.write(data);
                res.end();
            }
        })
    }
}

// serveur qui toune au port 8000 

const serveur = http.createServer(async (req, res) => {
    const URL= url.parse(req.url);
    if(req.method === 'post'){
        res.writeHead(200);
        res.end();
    }else{
        if(URL.pathname.includes("/api/")){
            await requete_get_resto(URL, res);
        }
        else{
            if(URL.query != null){
                await retourne_page_client_dynamique(URL, res);
            }
            else{
                await retourne_page_client_statique(URL.pathname, res); 
            }

        }
    }
    console.log(`${req.method} ${req.url}`);
})


serveur.listen(port, () => {
    console.log(`Le serveur tourne au port ${port}`);
});
