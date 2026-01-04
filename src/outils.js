const {scrypt} = require("crypto");
const { promisify } = require("util");
const dotenv = require("dotenv");
dotenv.config();

const scryptAsync = promisify(scrypt);

const SALT = process.env.SALT || "salt";

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

module.exports = {
    hash_password,
    read_body,
}

