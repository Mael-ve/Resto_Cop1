const waitPort = require('wait-port');
const fs = require('fs');
const mariadb = require('mariadb/callback');

const requete_sql = { //dictionnaire (clé : filtre appliqué a la base de donnée, valeur: requete sql associé)
    "": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants ORDER BY date_ajout DESC LIMIT 10`,
    "lyon": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="lyon"`,
    "paris": `SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville="paris"`
}; 

let conn;

async function init(){

    await waitPort({ 
        host: process.env.MARIADB_HOST, 
        port: 3306,
        timeout: 10000,
        waitForDns: true,
    });

    conn = mariadb.createConnection({
        host: process.env.MARIADB_HOST,
        user: process.env.MARIADB_USER,
        password: process.env.MARIADB_PASSWORD,
        database: process.env.MARIADB_DB
    });

    return new Promise((resolve, reject) => {
        conn.query(
            `CREATE TABLE IF NOT EXISTS commentateur (
                id int(255) unsigned NOT NULL,
                pseudo varchar(50),
                lien_tete varchar(255) DEFAULT NULL,
                mdp varchar(50),
                PRIMARY KEY (id) )`,
            (err) => {
                if (err) return reject(err);

                conn.query(`CREATE TABLE IF NOT EXISTS restaurants (
                                nom varchar(255),
                                type_resto varchar(255),
                                localisation varchar(255),
                                ville varchar(255),
                                id_commentateur int(255) unsigned NOT NULL REFERENCES commentateur(id), 
                                coup_coeur bool,
                                commentaire TEXT,
                                prix TEXT,
                                date_ajout DATETIME, 
                                PRIMARY KEY (nom)
                            )`,
                        (err) => {
                            if (err) return reject(err);

                            console.log(`Connected to mysql db at host ${process.env.MARIADB_HOST}`);
                            resolve();
                        });
            }
        ); 
    });
}

async function get_resto(url, res){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
    const filtre = querystring.parse(url.query).filtre;
    try{
        const results = await conn.query(requete_sql[filtre]);
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
            await conn.query(
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
        const param_recu = await conn.query(
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

module.exports = {
    init,
    get_resto,
    requete_add_resto,
    verification_identification,
};