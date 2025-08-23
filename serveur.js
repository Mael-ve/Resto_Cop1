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

const SECRET_KEY = 'Bloup-Bloup'; //clé d'encodage des jwt 

const requete_sql = { //dictionnaire (clé : filtre appliqué a la base de donnée, valeur: requete sql associé)
    "": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants ORDER BY date_ajout DESC LIMIT 10`,
    "lyon": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="lyon"`,
    "paris": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="paris"`
}; 

 
// traitement des requêtes du client

async function requete_get_resto(URL, res){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
    const filtre = querystring.parse(URL.query).filtre;
    try{
        const results = await connection.query(requete_sql[filtre]);
        res.writeHead(200);
        res.end(JSON.stringify(results));
    }
    catch (err){
        console.log(err);
        res.writeHead(500);
        res.end();
    }
}

async function requete_add_resto(request, id_commentateur){ 
    //fonction qui traite la requete url contenant un restaurant et ajoute le restaurant à la base de donnée
    let message = "Merci d'avoir ajouter un restaurant !";
    let est_vide = false;
    for(const [key, value] of Object.entries(request)){
        if(key === 'modif'){
            continue;
        }
        else{
            if(value === ''){
                est_vide = true
            }
        }
    }
    if(!est_vide){
        try{
            await connection.query(
            `INSERT INTO restaurants VALUES(
            "${request.nom_resto.toLowerCase()}",
            "${request.type_resto.toLowerCase()}",
            "${request.adresse}",
            "${request.ville.toLowerCase()}",
            ${id_commentateur}, 
            ${request.coup_coeur === null}, 
            "${request.commentaire}", 
            "${request.prix}",
            now() )`
            );

        }
        catch(err){
            message = "il y'a une erreur de bdd";
        }
    } 
    else{
        message = "Merci de remplir toutes les cases";
    }
    return message;
}

async function verification_identification(identifiant, res){
    //fonction qui verifie l'authentification d'un utilisateur
    try{
        const param_recu = await connection.query(
            `SELECT id, mdp FROM commentateur WHERE pseudo="${identifiant.username}"`
        );
        const param = param_recu[0];
        if(param.mdp === identifiant.mdp){
            const payload = {id : param.id, username : identifiant.username, exp: Date.now() + 30*60};
            const token = jwt.sign(payload, SECRET_KEY);
            res.setHeader('Set-cookie',`cookie: ${token}; Expires: ${Date.now() + 2*60*1000}`);
            console.log("le jeton de connexion est valide et est bien mis dans les cookies");
            await retourne_page_client_dynamique("/ajout_resto.html", res, "");
        }
        else{
            retourne_page_client_dynamique("/connexion.html", res, "Le mot de passe n'est pas bon");
        }
    }
    catch(err){
        console.log(err);
        retourne_page_client_dynamique("/connexion.html", res, "L'identifaint n'existe pas");
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
        if(URL.pathname.includes("/api/")){ //requete à la base de donnée
            await requete_get_resto(URL, res);
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
                            modif_tempo = await requete_add_resto(request, decoded.id);
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


serveur.listen(port, () => {
    console.log(`Le serveur tourne au port ${port}`);
});
