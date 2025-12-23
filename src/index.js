// Importation des modules/Frameworks utiles 

const url = require("node:url");
const http = require("http");
const stream = require("node:stream")
const fs = require("fs");
const path = require("node:path");
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const { createConnection } = require("node:net");

const DB = require('./serveur/mariadb.js');


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

const API={
    "GET": {
        "/get_resto": {authentification_required : false, process: DB.get_resto}
    },
    "POST": {
        "/login" : { process: login}
    }
}

const SECRET_KEY = 'Bloup-Bloup'; //clé d'encodage des jwt 

const requete_sql = { //dictionnaire (clé : filtre appliqué a la base de donnée, valeur: requete sql associé)
    "": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants ORDER BY date_ajout DESC LIMIT 10`,
    "lyon": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="lyon"`,
    "paris": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="paris"`
}; 

 
// traitement des requêtes du client

function return_404(res){
    //retourne le fichier d'erreur 404
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

async function retourne_page_client_dynamique(chemin, res, modif){
    //traite la demande d'une page html en replaçant dans la page {{texte_a_modifier}} par la ville demander dans URL.query
    if(!chemin.match(/\.\./)){
        const extension = path.extname(chemin).substring(1).toLowerCase();
        fs.readFile(__dirname + "/site_client" + chemin, "binary", (err, data) =>{ // les fichiers pour pouvoir être modifier doivent etre ouvert en binary
            if(err){
                return_404(res);
            }else{
                let retour = data;
                res.writeHead(200, {"Content-Type" : MIME_TYPES[extension] || MIME_TYPES.default});
                retour = retour.replace(/{{texte_a_modifier}}/g, modif.toUpperCase());
                res.write(retour);
                res.end();
            }
        })
    }
}


async function retourne_page_client_statique(chemin, res){
    //retourne un fichier demandé par le chemin
    if(true || !chemin.match(/\.\./)){ //vérfie s'il n'y pas /.. dans l'url pour la sécurité
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

async function login(){

}

async function traitement_api(requete_api, url, req, res){
    let requetes_api = API[req.method];
    let actions = requetes_api ? requetes_api[requete_api] : undefined;

    if(!requetes_api){
        res.writeHead(404);
        res.end();
        return;
    }

    let {authentification_required, process} = actions;

    if(authentification_required){

    }

    process(req, res, url, user);

}

// serveur qui toune au port 8000 

const serveur = http.createServer(async (req, res) => {
    const url = new URL(`http://localhost${req.url}`);

    if(req.url.startsWith("/api/")){
        let requete_api = url.pathname.slice(4);
        traitement_api(requete_api, url, req, res);
    }

    if(req.method === 'POST'){ //si la requete est de type post -> c'est une demande de connexion
        let  body = "";
        req.on('data', (chunck) =>{
            body += chunck.toString('utf8');
            
        });
        req.on('end', ()=>{
            if(URL.pathname === "/connexion.html"){
                const identifiant = querystring.parse(body);
                verification_identification(identifiant, res);
            }
            else{ // si c'est pas connexion.html c'est que c'est une verification de connexion et que le body contient un token jwt
                jwt.verify(body, SECRET_KEY, (err, decoded) => {
                    if(err){ // si y'a une erreur c'est que body contient un token faux ou expirer
                        console.log(err);
                        res.writeHead(200);
                        res.write("false");
                        res.end();
                    }
                    else{
                        res.writeHead(200);
                        res.write("true");
                        res.end();
                    }
                })
            }
        })
    }else{
        if(false&&URL.pathname.includes("/api/")){ //requete à la base de donnée
            await DB.get_resto(URL, res);
        }
        else{
            if(URL.query != null){ // si y'a une query c'est une page où l'on doit modifier le code html coté serveur
                let chemin = URL.pathname;
                let modif_html = querystring.parse(URL.query).modif === undefined ? " " : querystring.parse(URL.query).modif;
                let request = querystring.parse(URL.query);
                if(URL.pathname === "/ajout_resto.html"&&request.nom_resto != undefined){ // Si on chercher à ajouter un resto 
                    modif_html = await jwt.verify(req.headers.cookie, SECRET_KEY, async (err, decoded) => { //on verifie le jeton de connexion
                        let modif_tempo = modif_html;
                        if(err){
                            modif_tempo="Il y'a eu une erreur, merci de vous reconnecter";
                        }
                        else{
                            modif_tempo = await DB.requete_add_resto(request, decoded.id);
                        }
                        return modif_tempo;
                    });
                }
                await retourne_page_client_dynamique(chemin, res, modif_html);
            }
            else{
                await retourne_page_client_statique(URL.pathname, res); 
            }
        }
    }
    console.log(`${req.method} ${req.url}`);
})

DB.init().then(() => {
    serveur.listen(port, () => console.log(`Le serveur tourne au port ${port}`));
}).catch((err)=>{
    console.error(err);
    process.exit(1);
});
