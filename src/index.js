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

const PORT = 8000;
const SECRET_KEY = 'Bloup-Bloup'; //clé d'encodage des jwt 

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

const ENDPOINTS={
    "GET": {
        //"/me": {authentification_required  : true, process: api_me},
        "/get_resto": {authentification_required : false, process: DB.get_resto}
    },
    "POST": {
        "/login" : { process: login}
    }
}

Array.prototype.last = function () {
    return this[this.length - 1];
}
 
// traitement des requêtes du client

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

function serveur_statique(url, res){
    if(url.pathname.includes("..")){
        res.writeHead(400);
        res.end();
        return;
    }

    let chemin = url.pathname;
    if(chemin === "/"){
        chemin = "/index.html";
    }
    else if (chemin == "/favicon.ico") {
        chemin = "/favicon_io/favicon.ico";
    }

    let chemin_total = __dirname + "/site_client" + chemin;
    console.log(`Renvoie ${chemin_total}`);

    fs.readFile(chemin_total, (err, data) => {
        if(err && err.code === "ENOENT"){
            console.log("fichier non trouvé");
            res.writeHead(404);
            fs.readFile(__dirname + "/site_client/404.html", (_, data) =>{
                res.end(data);
            });
        }
        else if (err){
            console.log(`Erreur interne pour lire ${chemin_total}`);
            res.writeHead(500);
            res.end();
        }
        else{
            let extension = chemin_total.split(".").last();

            res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || MIME_TYPES.default });
            res.end(data);
        }
    })
}

async function login(){

}

async function traitement_endpoint(nom_endpoint, url, req, res){
    let endpoints = ENDPOINTS[req.method];
    let endpoint = endpoints ? endpoints[nom_endpoint] : undefined;

    if(!endpoint){
        res.writeHead(404);
        res.end();
        return;
    }

    let {authentification_required, process} = actions;

    let user = null;
    if(authentification_required){
        // user = await authentification
        if (user === null){
            res.writeHead(401, "Invalid Authentification");
            res.end();
            return;
        }
    }

    process(req, res, url, user);

}

// serveur qui toune au port 8000 

const serveur2 = http.createServer(async (req, res) => {
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
                await retourne_page_client_statique(url.pathname, res); 
            }
        }
    }
    console.log(`${req.method} ${req.url}`);
})

const serveur = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    let url = new URL(`http://localhost${req.url}`);

    if (req.url.startsWith("/api/")){
        let endpoint = url.pathname.slice(4);
        //serve_endpoint
        res.end();
    }
    else{
        if(req.method === "GET"){
            serveur_statique(url, res);
        }
        else{
            res.writeHead(405);
            res.end();
        }
    }
});

DB.init().then(() => {
    serveur.listen(PORT, () => console.log(`Serveur démarré au port ${PORT}`));
}).catch((err)=>{
    console.error(err);
    process.exit(1);
});
