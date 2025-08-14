(async () => {
    let token = get_cookie("Token");
    if (!token || !is_authentification_valid(token)) {
        location.replace("/connexion.html");
    }
})()


async function is_authentification_valid(token) {
    let r = await fetch("/api/me", { headers: { "Authorization": token } });
    return r.status === 200
}

async function add_resto() {
    let nom_resto = document.getElementById("nom_resto").value;
    let type_resto = document.getElementById("type_resto").value;
    let adresse = document.getElementById("adresse").value;
    let ville = document.getElementById("ville").value;
    let coup_coeur = document.getElementById("coeur").checked;
    let commentaire = document.getElementById("commentaire").value;
    let prix = document.getElementById("prix").value;


    let token = get_cookie("Token");
    if (!token) {
        location.replace("/connexion.html?next=/ajout_resto.html");
        return;
    }

    let r = await fetch("/api/add_resto", {
        method: "POST", headers: { Authorization: token }, body: JSON.stringify({
            nom_resto, type_resto, adresse, ville, coup_coeur, commentaire, prix
        }),
    });

    if (r.status != 200) {
        document.getElementById("message_erreur").innerText = `Impossible d'ajouter un restaurant: ${r.statusText}`;
    }
} 