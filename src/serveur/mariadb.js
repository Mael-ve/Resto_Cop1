const waitPort = require('wait-port');
const fs = require('fs');
const mariadb = require('mariadb/callback');

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
            `CREATE TABLE IF NOT EXISTS commentateurs(
                identifiant VARCHAR(50),
                lien_tete VARCHAR(255) DEFAULT NULL,
                mdp VARCHAR(255),
                PRIMARY KEY(identifiant) )`,
            (err) => {
                if (err) return reject(err);

                conn.query(`CREATE TABLE IF NOT EXISTS restaurants (
                                nom VARCHAR(255),
                                type_resto VARCHAR(255),
                                adresse VARCHAR(255),
                                ville VARCHAR(255),
                                id_commentateur VARCHAR(50), 
                                date_ajout DATETIME, 
                                PRIMARY KEY (nom),
                                FOREIGN KEY (id_commentateur) REFERENCES commentateurs (identifiant) )`,
                    (err) => {
                        if (err) return reject(err);
                        
                        conn.query(`CREATE TABLE IF NOT EXISTS commentaires (
                                        id_resto VARCHAR(50),
                                        id_commentateur VARCHAR(50),
                                        coup_coeur BOOL,
                                        commentaire TEXT,
                                        prix TEXT,
                                        FOREIGN KEY (id_resto) REFERENCES restaurants (nom),
                                        FOREIGN KEY (id_commentateur) REFERENCES commentateurs (identifiant) )`,
                            (err) => {
                                if (err) return reject(err);

                                console.log(`Connected to mysql db at host ${process.env.MARIADB_HOST}`);
                                resolve();
                            }
                        );
                    }
                );
            }
        ); 
    });
}

function query(sql, params) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    })
}

async function ajout_commmentateur_test(hash_pwd){
    // fonction pour mettre un commentateur pour les test de login
    await conn.query("INSERT INTO commentateurs VALUES('admin', NULL, ?)", [hash_pwd]);
    console.log("l'ajout du commentateur test a été fait");
}

async function get_resto(_, res, url, _){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
    let ville = url.searchParams.get("ville");
    if (!ville) {
        res.writeHead(400, "No ville specified");
        res.end();
        return;
    }

    let restaurants = await conn.query("SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville = ?", ville.toLowerCase());

    res.writeHead(200);
    res.end(JSON.stringify(restaurants));
}

async function add_resto(req, res, _, user) {
    let body = read_body(req);
    let json = JSON.parse(body);

    function check_exists(val) {
        if (!json[val]) {
            res.writeHead(400, `No ${val} field in body`);
            res.end();
            return false;
        }
        return true;
    }

    if (!(check_exists("nom_resto") && check_exists("type_resto") && check_exists("adresse") && check_exists("ville") && check_exists("coup_coeur") && check_exists("commentaire") &&
        check_exists("prix"))) return;

    await conn.query(
        `INSERT INTO restaurants  VALUES( ?, ?, ?, ?, ?, now())`
        , json.nom_resto.toLowerCase(), json.type_resto.toLowerCase(), json.adresse, json.ville.toLowerCase(),
        user.id,
    );
    res.writeHead(200);
    res.end();
}

async function retourne_identification(username){
    let r = await query("SELECT identifiant, mdp FROM commentateurs WHERE identifiant = ?", [username])
    return r;
}

module.exports = {
    init,
    ajout_commmentateur_test,
    get_resto,
    add_resto,
    retourne_identification,
};