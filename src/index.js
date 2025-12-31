// Importation des modules/Frameworks utiles 

const http = require("http");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const { scrypt, timingSafeEqual } = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(scrypt);
const jwtVerifyAsync = promisify(jwt.verify);

const DB = require('./serveur/mariadb.js');


// Constante du serveur 

const PORT = 8000;
const SECRET_KEY = 'Bloup-Bloup'; //clé d'encodage des jwt 
const SALT = 'salt';

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
        "/me": {authentification_required  : true, process: api_me},
        "/get_resto": {authentification_required : false, process: DB.get_resto_grille},
        "/get_commentaire": {authentification_required: false, process: DB.get_commentaire}
    },
    "POST": {
        "/login" : { process: login},
        "/add_resto": { authentification_required: true, process: DB.add_resto }
    }
}

Array.prototype.last = function () {
    return this[this.length - 1];
}

async function hash_password(password) {
    let buf = await scryptAsync(password, SALT, 64);
    return buf.toString("hex");
}

function read_body(req) {
    return new Promise((resolve, _reject) => {
        let body = "";
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            resolve(body)
        });
    });
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

function api_me(_, res, _, user) {
    res.writeHead(200);
    res.end(JSON.stringify(user));
}

async function login(req, res){
    let body = await read_body(req);
    let json;
    try {
        json = JSON.parse(body);
    } catch (e) {
        res.writeHead(400, "Not JSON");
        res.end();
        return;
    }

    let { username, password } = json;

    if (!username) {
        res.writeHead(400, "No username specified");
        res.end();
        return;
    }
    if (!password && password !== "") {
        res.writeHead(400, "No password specified");
        res.end();
        return;
    }

    let identifiant = await DB.retourne_identification(username)
    if (!identifiant[0]) {
        res.writeHead(401, "Invalid username");
        res.end();
        return;
    }

    let { id, mdp } = identifiant[0];

    let hashed_password = await hash_password(password);

    if (!timingSafeEqual(Buffer.from(mdp, "hex"), Buffer.from(hashed_password, "hex"))) {
        res.writeHead(401, "Invalid password");
        res.end();
        return;
    }

    let payload = { id, username, exp: Date.now() + 30 * 60 };
    let token = jwt.sign(payload, SECRET_KEY);

    res.writeHead(200);
    res.end(JSON.stringify({ token }))
}

async function authentification(req) {
    if (!req.headers)
        return null;

    let token = req.headers["authorization"]

    try {
        let { id, username, exp: _ } = await jwtVerifyAsync(token, SECRET_KEY);
        return { id, username };
    } catch (error) {
        return null;
    }
}


async function traitement_endpoint(nom_endpoint, url, req, res){
    let endpoints = ENDPOINTS[req.method];
    let endpoint = endpoints ? endpoints[nom_endpoint] : undefined;

    if(!endpoint){
        res.writeHead(404);
        res.end();
        return;
    }

    let {authentification_required, process} = endpoint;

    let user = null;
    if(authentification_required){
        user = await authentification(req);
        if (user === null){
            res.writeHead(401, "Invalid Authentification");
            res.end();
            return;
        }
    }

    process(req, res, url, user);

}

// serveur qui toune au port 8000 

const serveur = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    let url = new URL(`http://localhost${req.url}`);

    if (req.url.startsWith("/api/")){
        let endpoint = url.pathname.slice(4);
        traitement_endpoint(endpoint, url, req, res);
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


DB.init().then(async () => {
    let hash_pwd = await hash_password("test");
    DB.ajout_commmentateur_test(hash_pwd);
    serveur.listen(PORT, () => console.log(`Serveur démarré au port ${PORT}`));
}).catch((err)=>{
    console.error(err);
    process.exit(1);
});
