// Importation des modules/Frameworks utiles 

const url = require("node:url");
const bdd = require("./access_bdd.json");
const http = require("http");
const stream = require("node:stream")
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");
const querystring = require('querystring');
const jwt = require('jsonwebtoken');


// Constante du serveur 
let connection = null;
(async () => {
    connection = await mariadb.createConnection({
    user : bdd.user,
    host : bdd.host,
    password : bdd.password,
    database : bdd.database
})})()

const port = 8889;

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

const SECRET_KEY = 'Bloup-Bloup';

const requete_securisée = {
    "/ajout_resto.html": (URL, res) => {requete_add_resto(URL, res);}
}; // test de Mael

 
// traitement des requêtes du client

async function requete_get_resto(URL, res){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
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
    //fonction qui traite la requete url contenant un restaurant et ajoute le restaurant à la base de donnée
    const request = querystring.parse(URL.query);
    try{
        await connection.query(
        `INSERT INTO restaurants VALUES(
        "${request.nom_resto}",
        "${request.type_resto}",
        "${request.adresse}",
        "${request.ville}",
        1, 
        ${request.coup_coeur === null}, 
        "${request.commentaire}", 
        "${request.prix}",
        now() )`
        );
        retourne_page_client_statique("/ajout_resto.html", res);
    }
    catch(err){
        console.log(err);
        res.writeHead(500);
        res.end();
    }
}

async function verification_identification(identifiant, res){
    //fonction qui verifie l'authentification d'un utilisateur
    try{
        const param_recu = await connection.query(
            `SELECT id, mdp FROM commentateur WHERE pseudo="${identifiant.username}"`
        );
        const param = param_recu[0];
        if(param.mdp === identifiant.mdp){
            const payload = {id : param.id, username : identifiant.username, exp :Date.now()  + (2 * 60)};
            const token = jwt.sign(payload, SECRET_KEY);
            res.setHeader('Set-cookie',token);
            await retourne_page_client_statique("/ajout_resto.html", res);
        }
        else{
            res.writeHead(403);
            res.end();
        }
    }
    catch(err){
        console.log(err);
        retourne_page_client_statique("/connexion.html", res);
    }
}

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

async function retourne_page_client_dynamique(URL, res, modif){
    //traite la demande d'une page html en replaçant dans la page {{ville}} par la ville demander dans URL.query
    const chemin = URL.pathname;
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
    if(!chemin.match(/\.\./)){ //vérfie s'il n'y pas /.. dans l'url pour la sécurité
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
    if(req.method === 'POST'){ //si la requete est de type post -> c'est une demande de connexion
        let  body = "";
        req.on('data', (chunck) =>{
            body += chunck.toString('utf8');
            
        });
        req.on('end', ()=>{
            if(URL.path === "/connexion.html"){
                const identifiant = querystring.parse(body);
                verification_identification(identifiant, res);
            }
            else{ // si c'est pas connexion.html c'est que c'est une verification de connexion et que le body contient un token jwt
                jwt.verify(body, SECRET_KEY, (err, decoded) => {
                    if(err){ // si y'a une erreur c'est que body contient un token faux ou expirer
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
        if(URL.pathname.includes("/api/")){ //requete à la base de donnée
            await requete_get_resto(URL, res);
        }
        else{
            if(URL.query != null){ // si y'a une query c'est une page où l'on doit modifier le code html coté serveur
                await retourne_page_client_dynamique(URL, res, querystring.parse(URL.query).ville);
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
