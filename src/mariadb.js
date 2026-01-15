const waitPort = require('wait-port');
const fs = require('fs');
const mariadb = require('mariadb');

const outils = require("./outils.js");
let pool;

async function init(){

    await waitPort({ 
        host: process.env.MARIADB_HOST, 
        port: 3306,
        timeout: 100000,
        waitForDns: true,
    });

    pool = mariadb.createPool({
    host: process.env.MARIADB_HOST,
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DB,
    connectionLimit: 5,
    idleTimeout: 60000,
    acquireTimeout: 10000
    });

    await pool.query(
        `CREATE TABLE IF NOT EXISTS commentateurs(
            id INT NOT NULL AUTO_INCREMENT,
            username VARCHAR(50),
            lien_tete VARCHAR(255) DEFAULT NULL,
            mdp VARCHAR(255),
            PRIMARY KEY(id) )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS restaurants (
                    id INT NOT NULL AUTO_INCREMENT,
                    nom VARCHAR(255),
                    type_resto VARCHAR(255),
                    adresse VARCHAR(255),
                    ville VARCHAR(255),
                    id_commentateur INT(255), 
                    coup_coeur BOOL,
                    prix TEXT DEFAULT NULL,
                    date_ajout DATETIME, 
                    PRIMARY KEY (id),
                    FOREIGN KEY (id_commentateur) REFERENCES commentateurs (id) )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS commentaires (
                    id_comment INT NOT NULL AUTO_INCREMENT,
                    id_resto INT,
                    id_commentateur INT,
                    commentaire TEXT DEFAULT NULL,
                    PRIMARY KEY (id_comment),
                    FOREIGN KEY (id_resto) REFERENCES restaurants (id),
                    FOREIGN KEY (id_commentateur) REFERENCES commentateurs (id) )`);

    console.log("Les tables sont bien initialisés");
}

async function query(sql, params) {
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(sql, params);
    } catch (err) {
        console.error("DB error:", err);
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

function check_exists(val, json, res) {
    if (!json[val]) {
        res.writeHead(400, `Le champ ${val} n'est pas rempli`);
        res.end();
        return false;
    }
    return true;
}

async function ajout_super_admin(hash_pwd){
    // fonction pour mettre un commentateur pour les test de login
    let exist_deja = await query("SELECT id FROM commentateurs WHERE id=1")
    if (!exist_deja[0]){
        await query("INSERT INTO commentateurs (username, mdp) VALUES('malou', ?)", [hash_pwd]);
        console.log("l'ajout du superadmin a été fait"); 
    }
    else{
        console.log("le superadmin est déjà crée");
    }
}

async function add_perso(req, res, _, user){

    if(user.id !== 1){
        res.writeHead(406, "Vous n'êtes pas superadmin");
        res.end();
        return;
    }

    let body = await outils.read_body(req);
    let json = await JSON.parse(body);

    if(!(check_exists("pseudo", json, res)&&check_exists("mdp", json, res))) return;

    let hash_pwd = await outils.hash_password(json.mdp)
    
    try{
        await query("INSERT INTO commentateurs (username, mdp) VALUES(?, ?)", [json.pseudo.toLowerCase(), hash_pwd]);

        res.writeHead(200);
        res.end();
    }
    catch(error){
        console.log(error);
        res.writeHead(500);
        res.end("Erreur serveur");
    }

}

async function get_resto_grille(_, res, url, _){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
    let ville = url.searchParams.get("ville");
    let coup_coeur = url.searchParams.get("coup_coeur");

    let requete = `SELECT restaurants.id, nom, type_resto, ville, coup_coeur, username 
                FROM restaurants INNER JOIN commentateurs ON commentateurs.id=id_commentateur `;
    let ajout_un_filtre = false;

    if (ville) {
        requete += `WHERE ville = ? `;
        ajout_un_filtre = true;
    }

    if(coup_coeur){
        if(ajout_un_filtre){
            requete += "AND coup_coeur=1 ";
        }
        else{
            requete += "WHERE coup_coeur=1 ";
        }
    }

    requete += "ORDER BY date_ajout DESC LIMIT 20";

    let restaurants = await query(requete, [ville]);

    res.writeHead(200);
    res.end(JSON.stringify(restaurants));
}

async function add_resto(req, res, _, user) {
    let body = await outils.read_body(req);
    let json = JSON.parse(body);

    if (!(check_exists("nom_resto", json, res) && check_exists("type_resto", json, res) && check_exists("adresse", json, res) &&
    check_exists("ville", json, res) && check_exists("prix", json, res) && check_exists("commentaire", json, res) )) return;

    try{
        await query(
            "INSERT INTO restaurants (nom, type_resto, adresse, ville, id_commentateur, coup_coeur, prix, date_ajout) VALUES(?, ?, ?, ?, ?, ?, ?, now())"
            , [json.nom_resto.toLowerCase(), json.type_resto.toLowerCase(), json.adresse, json.ville.toLowerCase(),
            user.id, json.coup_coeur, json.prix]
        );

        let id_resto = await query(
            "SELECT id FROM restaurants WHERE nom= ? AND adresse = ?", // on suppose que le couple nom et adresse sont uniques
            [json.nom_resto.toLowerCase(), json.adresse]
        )

        await query(
            "INSERT INTO commentaires (id_resto, id_commentateur, commentaire) VALUES(?, ?, ?)",
            [id_resto[0].id, user.id, json["commentaire"]]
        );

        res.writeHead(200);
        res.end();
    }
    catch(error){
        console.log(error);
        res.writeHead(500);
        res.end("Erreur serveur");
    }
}

async function get_ville(_, res, _, _){
    try{
        let villes = await query("SELECT DISTINCT(ville) FROM restaurants");

        res.writeHead(200);
        res.end(JSON.stringify(villes));
    }
    catch(error){
        console.log(error);
        res.writeHead(500);
        res.end("Erreur serveur");
    }
}

async function get_resto_unique(_, res, url, _){
    let id_resto = url.searchParams.get("id_resto");

    if(!id_resto){
        res.writeHead(400, "Aucun resto n'est précisé");
        res.end();
        return;
    } 

    let info = await query(`SELECT nom, adresse, ville, prix, coup_coeur
        FROM restaurants WHERE restaurants.id= ?`, [id_resto]);

    res.writeHead(200);
    res.end(JSON.stringify(info));
}

async function get_commentaire(_, res, url, _){
    let id_resto = url.searchParams.get("id_resto");

    if(!id_resto){
        res.writeHead(400, "Aucun resto n'est précisé");
        res.end();
        return;
    } 

    let commentaires = await query(`SELECT commentaire, username, id_comment
        FROM restaurants INNER JOIN 
        (commentaires INNER JOIN commentateurs ON id_commentateur=commentateurs.id)
        ON id_resto=restaurants.id WHERE id_resto= ?`, [id_resto]);

    res.writeHead(200);
    res.end(JSON.stringify(commentaires));
}

async function add_comment(req, res, _, user){
    let body = await outils.read_body(req);
    let json = await JSON.parse(body);

    if(!(check_exists("id_resto", json, res)&&check_exists("commentaire", json, res))) return;

    try{
        await query(
            "INSERT INTO commentaires (id_resto, id_commentateur, commentaire) VALUES(?, ?, ?)",
            [json.id_resto, user.id, json.commentaire]
        );

        res.writeHead(200);
        res.end();
    }
    catch(error){
        console.log(error);
        res.writeHead(500);
        res.end("Erreur serveur");
    }
}

async function get_comment_by_id(_, res, url, _){
    let id_comment = url.searchParams.get("id");

    if(!id_comment){
        res.writeHead(400, "Aucun commentaire précisé")
        res.end();
        return;
    }

    let comment = await query(`SELECT commentaire, username
        FROM commentaires 
        INNER JOIN commentateurs ON id_commentateur= commentateurs.id
        WHERE id_comment = ?`, [id_comment]);
    
    res.writeHead(200);
    res.end(JSON.stringify(comment));
}

async function update_comment(req, res, _, _){
    let body = await outils.read_body(req);
    let json = await JSON.parse(body);

    if(!(check_exists("id_comment", json, res)&&check_exists("commentaire", json, res))) return;

    try{
        await query("UPDATE commentaires SET commentaire = ? WHERE id_comment = ?", [json.commentaire, json.id_comment]);
        
        res.writeHead(200);
        res.end();
    }
    catch(error){
        console.log(error);
        res.writeHead(500);
        res.end("Erreur serveur");
    }
}

async function suppr_comment(req, res, _, _){
    let body = await outils.read_body(req);
    let json = await JSON.parse(body);

    if(!(check_exists("id_comment", json, res))) return;

    try{
        await query("DELETE FROM commentaires WHERE id_comment=?", [json.id_comment]);
        
        res.writeHead(200);
        res.end();
    }
    catch(error){
        console.log(error);
        res.writeHead(500);
        res.end("Erreur serveur");
    }
}

async function retourne_identification(username){
    let r = await query("SELECT id, mdp FROM commentateurs WHERE username = ?", [username.toLowerCase()])
    return r;
}

async function teardown() {
    return new Promise((acc, rej) => {
        conn.end(err => {
            if (err) rej(err);
            else acc();
        });
    });
}

module.exports = {
    init,
    ajout_super_admin,
    add_perso,
    get_resto_grille,
    add_resto,
    get_ville,
    get_resto_unique,
    get_commentaire,
    add_comment,
    get_comment_by_id,
    update_comment,
    suppr_comment,
    retourne_identification,
    teardown,
};