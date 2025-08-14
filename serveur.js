const http = require("http");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const bdd = require("./access_bdd.json");
const mariadb = require("mariadb");
const { scrypt, timingSafeEqual } = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(scrypt);
const jwtVerifyAsync = promisify(jwt.verify);

const PORT = 8000;
const SECRET_KEY = 'Bloup-Bloup'; //clé d'encodage des jwt 
const SALT = "salt";

const PAGES_TO_EDIT = {};
const ENDPOINTS = {
    "GET": {
        "/me": { authentification_required: true, process: api_me },
        "/get_resto": { authentification_required: false, process: get_resto }
    },
    "POST": {
        "/login": { process: login },
        "/add_resto": { authentification_required: true, process: add_resto }
    }
};

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

Array.prototype.last = function () {
    return this[this.length - 1];
}

let connection = null;
(async () => {
    connection = await mariadb.createConnection({
        user: bdd.user,
        host: bdd.host,
        password: bdd.password,
        database: bdd.database
    });
})()

async function login(req, res) {
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

    let r = await connection.query("SELECT id, mdp FROM commentateur WHERE pseudo = ?", username);
    if (!r[0]) {
        res.writeHead(401, "Invalid username");
        res.end();
        return;
    }

    let { id, mdp } = r[0];

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

function api_me(_, res, _, user) {
    res.end(JSON.stringify(user));
}

async function get_resto(_, res, url) {
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

/// Return an user object if authentification succeeded or null if not.
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

function serve_static(url, res) {
    if (url.pathname.includes("..")) {
        res.writeHead(400);
        res.end();
        return;
    }

    let path = url.pathname;
    if (path === "/") {
        path = "/index.html";
    }
    else if (path == "/favicon.ico") {
        path = "/favicon_io/favicon.ico";
    }

    let full_path = __dirname + "/site_client" + path;
    console.log(`Serving ${full_path}`);



    fs.readFile(full_path, (err, data) => {
        if (err && err.code === "ENOENT") {
            res.writeHead(404);
            fs.readFile(__dirname + "/site_client/404.html", (_, data) => {
                res.end(data);
            });
        }
        else if (err) {
            console.log(`Internal server error reading ${full_path}`);
            res.writeHead(500);
            res.end();
        }
        else {

            if (PAGES_TO_EDIT[path] !== undefined) {
                // TODO
            }

            let extension = full_path.split(".").last();

            res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || MIME_TYPES.default });
            res.end(data);
        }
    })
}

async function serve_endpoint(endpoint_name, url, req, res) {
    let endpoints = ENDPOINTS[req.method];
    let endpoint = endpoints ? endpoints[endpoint_name] : undefined;

    if (!endpoint) {
        res.writeHead(404);
        res.end();
        return;
    }

    let { authentification_required, process } = endpoint;

    let user = null;
    if (authentification_required) {
        user = await authentification(req);
        if (user === null) {
            res.writeHead(401, "Invalid Authentification");
            res.end();
            return;
        }
    }

    process(req, res, url, user);

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

async function hash_password(password) {
    let buf = await scryptAsync(password, SALT, 64);
    return buf.toString("hex");
}

http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    let url = new URL(`http://localhost${req.url}`);

    if (req.url.startsWith("/api/")) {
        let endpoint = url.pathname.slice(4);
        serve_endpoint(endpoint, url, req, res);
    }
    else {
        if (req.method === "GET") {
            serve_static(url, res);
        }
        else {
            res.writeHead(405);
            res.end();
        }
    }

}).listen(PORT);

console.log(`Server started on port ${PORT}`);

