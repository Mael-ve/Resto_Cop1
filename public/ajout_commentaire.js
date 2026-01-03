let params = new URLSearchParams(location.search)
let nom_resto = params.get("nom_resto")

if(!nom_resto){
    location.replace("/index.html"); // si y'a pas de nom de resto on renvoie la page principale
}

let titre_form = document.getElementById("nom_resto");
titre_form.innerHTML = `Commenté le resto : ${nom_resto.toUpperCase()}`;

(async () => {
    let token = get_cookie("Token");
    let is_auth_valid = await is_authentification_valid(token);
    if (!token || !is_auth_valid) {
        location.replace("/connexion.html");
    }
})()


async function is_authentification_valid(token) {
    let r = await fetch("/api/me", { headers: { "authorization": token } });
    return (r.status === 200);
}

async function add_comment() {
    let commentaire = document.getElementById("commentaire").value;

    let token = get_cookie("Token");
    if (!token) {
        location.replace(`/connexion.html?next=${encodeURI(`/ajout_commentaire.html?nom_resto=${nom_resto}`)}`);
        return;
    }

    let r = await fetch("/api/add_comment", {
        method: "POST", headers: { Authorization: token }, body: JSON.stringify({
            nom_resto, commentaire
        }),
    });

    if (r.status === 200){
        document.getElementById("message_erreur").innerText= "Merci d'avoir ajouté un nouveau commentaire !";
    }
    else { 
        document.getElementById("message_erreur").innerText = `Impossible d'ajouter un commentaire: ${r.statusText}`;
    }
}
