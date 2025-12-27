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
                id INT(255) UNSIGNED NOT NULL AUTO_INCREMENT,
                identifiant VARCHAR(50),
                lien_tete VARCHAR(255) DEFAULT NULL,
                mdp VARCHAR(50),
                PRIMARY KEY(id) )`,
            (err) => {
                if (err) return reject(err);

                conn.query(`CREATE TABLE IF NOT EXISTS restaurants (
                                id INT(255) UNSIGNED NOT NULL AUTO_INCREMENT,
                                nom VARCHAR(255),
                                type_resto VARCHAR(255),
                                adresse VARCHAR(255),
                                ville VARCHAR(255),
                                id_commentateur int(255) UNSIGNED NOT NULL, 
                                date_ajout DATETIME, 
                                PRIMARY KEY (id),
                                FOREIGN KEY (id_commentateur) REFERENCES commentateurs (id) )`,
                    (err) => {
                        if (err) return reject(err);
                        
                        conn.query(`CREATE TABLE commentaire (
                                        id_resto INT(255) UNSIGNED NOT NULL,
                                        id_commentateur INT(255) UNSIGNED NOT NULL,
                                        coup_coeur BOOL,
                                        commentaire TEXT,
                                        prix TEXT,
                                        FOREIGN KEY (id_resto) REFERENCES restaurants (id),
                                        FOREIGN KEY (id_commentateur) REFERENCES commentateurs (id) )`,
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

async function get_resto(_, res, url, _){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
    let ville = url.searchParams.get("ville");
    if (!ville) {
        res.writeHead(400, "No ville specified");
        res.end();
        return;
    }

    let restaurants = await connection.query("SELECT nom, type_resto, localisation, coup_coeur FROM restaurants WHERE ville = ?", ville.toLowerCase());

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

    await connection.query(
        "INSERT INTO restaurants VALUES(?, ?, ?, ?, ?, ?, ?, ?, now())", json.nom_resto.toLowerCase(), json.type_resto.toLowerCase(), json.adresse, json.ville.toLowerCase(),
        user.id, json.coup_coeur, json.commetaire, json.prix
    );
    res.writeHead(200);
    res.end();
}

function retourne_identification(username){
    return connection.query("SELECT id, mdp FROM commentateur WHERE pseudo = ?", username);
}

module.exports = {
    init,
    get_resto,
    add_resto,
    retourne_identification,
};