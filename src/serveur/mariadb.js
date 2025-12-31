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
                id INT(255),
                username VARCHAR(50),
                lien_tete VARCHAR(255) DEFAULT NULL,
                mdp VARCHAR(255),
                PRIMARY KEY(id) )`,
            (err) => {
                if (err) return reject(err);

                conn.query(`CREATE TABLE IF NOT EXISTS restaurants (
                                nom VARCHAR(255),
                                type_resto VARCHAR(255),
                                adresse VARCHAR(255),
                                ville VARCHAR(255),
                                id_commentateur INT(255), 
                                coup_coeur BOOL,
                                prix TEXT DEFAULT NULL,
                                date_ajout DATETIME, 
                                PRIMARY KEY (nom),
                                FOREIGN KEY (id_commentateur) REFERENCES commentateurs (id) )`,
                    (err) => {
                        if (err) return reject(err);
                        
                        conn.query(`CREATE TABLE IF NOT EXISTS commentaires (
                                        id_resto VARCHAR(50),
                                        id_commentateur INT(255),
                                        commentaire TEXT DEFAULT NULL,
                                        FOREIGN KEY (id_resto) REFERENCES restaurants (nom),
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
    await conn.query("INSERT INTO commentateurs VALUES(0, 'admin', NULL, ?)", [hash_pwd]);
    console.log("l'ajout du commentateur test a été fait");
}

async function get_resto_grille(_, res, url, _){
    //fonction qui renvoie les restaurants associés à une requete ne precisant que la ville du resto
    let ville = url.searchParams.get("ville");
    let coup_coeur = url.searchParams.get("coup_coeur");

    let requete = `SELECT nom, type_resto, ville, coup_coeur, username 
                FROM restaurants INNER JOIN commentateurs ON id=id_commentateur `;
    let ajout_un_filtre = false;

    if (ville) {
        requete += `WHERE ville='${ville}' `;
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

    requete += "ORDER BY date_ajout DESC LIMIT 10";

    let restaurants = await query(requete);

    res.writeHead(200);
    res.end(JSON.stringify(restaurants));
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

async function add_resto(req, res, _, user) {
    let body = await read_body(req);
    let json = JSON.parse(body);

    function check_exists(val) {
        if (!json[val]) {
            res.writeHead(400, `Le champ ${val} n'est pas rempli`);
            res.end();
            return false;
        }
        return true;
    }

    if (!(check_exists("nom_resto") && check_exists("type_resto") && check_exists("adresse") && check_exists("ville") && check_exists("prix") )) return;

    try{
        await query(
            "INSERT INTO restaurants VALUES(?, ?, ?, ?, ?, ?, ?, now())"
            , [json.nom_resto.toLowerCase(), json.type_resto.toLowerCase(), json.adresse, json.ville.toLowerCase(),
            user.id, json.coup_coeur, json.prix.toLowerCase()]
        );

        await query(
            "INSERT INTO commentaires VALUES(?, ?, ?)",
            [json.nom_resto.toLowerCase(), user.id, json["commentaire"] ? json["commentaire"] :"NULL"]
        );

        res.writeHead(200);
        res.end();
    }
    catch(error){
        console.log(error);
        res.writeHead(406, `Il existe déjà un restaurant du nom de ${json.nom_resto}`);
        res.end();
    }
}

async function get_commentaire(_, res, url, _){
    let nom_resto = url.searchParams.get("nom_resto");

    if(!nom_resto){
        res.writeHead(400, "Aucun resto n'est précisé");
        res.end();
        return;
    }

    let commentaires = query(`SELECT adresse, ville, prix, coup_coeur, commentaire, username
        FROM restaurants INNER JOIN 
        (commentaires INNER JOIN commentateurs ON id_commentateur=id)
        ON id_resto=nom WHERE nom='${nom_resto}'`)

    res.writeHead(200);
    res.end(JSON.stringify(commentaires));
}

async function retourne_identification(username){
    let r = await query("SELECT id, mdp FROM commentateurs WHERE username = ?", [username])
    return r;
}

module.exports = {
    init,
    ajout_commmentateur_test,
    get_resto_grille,
    add_resto,
    get_commentaire,
    retourne_identification,
};