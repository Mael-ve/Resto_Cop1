// Importation des modules/Frameworks utiles 

const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("@mysql/xdevapi");


// Gestion de la base de donnée 

const DB_config = {
    password : "#Cop1BG69",
    user : "root",
    host : "localhost",
    port : 33060,
    schema : "Site_Resto"
}
mysql.getSession(DB_config)
    .then(session =>{
        return session.getSchema("Site_Resto").getTable('commentateur').count();
    })
    .then(count => {
        console.log(count);
    })

// Constante du serveur 

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

const PATH = path.join(process.cwd(), "./site_client");

const toBool = [() => true, () => false];

// traitement des requêtes statique du client

const prepareFile = async (url) =>{
    const Chemin_tab = [PATH, url];
    if (url.endsWith("/")){
        Chemin_tab.push("index.html");
    }
    const chemin =path.join(...Chemin_tab);
    const pathTraversal = !chemin.startsWith(PATH);
    const exists = await fs.promises.access(chemin).then(...toBool);
    const found = !pathTraversal && exists;
    const streamPath = found ? chemin : PATH + "/404.html";
    const ext = path.extname(streamPath).substring(1).toLowerCase();
    const stream = fs.createReadStream(streamPath);
    return {found, ext, stream};
}  

const server = http.createServer(async (req, res) => {
    const fichier = await prepareFile(req.url);
    const status = fichier.found ? 200 : 400;
    const Type = MIME_TYPES[fichier.ext] || MIME_TYPES.default;
    res.writeHead(status, {"Content-Type" : Type});
    fichier.stream.pipe(res);
    console.log(`${req.method} ${req.url}`);
})


server.listen(port, () => {
    console.log(`Le serveur tourne à l'adresse http://localhost:${port}/`);
});