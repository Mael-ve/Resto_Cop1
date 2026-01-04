(async () => {
    let token = get_cookie("Token");
    let is_auth_valid = await is_authentification_supervalid(token);
    if (!token || !is_auth_valid) {
        location.replace("/connexion.html");
    }
})()


async function is_authentification_supervalid(token) {
    let r = await fetch("/api/me", { headers: { "authorization": token } });
    const data = await r.json();
    return (r.status === 200)&&(data.id === 1);
}

async function add_perso() {
    let pseudo = document.getElementById("pseudo").value;
    let mdp = document.getElementById("mdp").value;

    let token = get_cookie("Token");
    if (!token) {
        location.replace("/connexion.html?next=/add_perso.html");
        return;
    }

    let r = await fetch("/api/add_perso", {
        method: "POST", headers: { Authorization: token }, body: JSON.stringify({
            pseudo, mdp
        }),
    });

    if (r.status === 200){
        document.getElementById("message_erreur").innerText= "Merci d'avoir ajouté un admin !";
    }
    else { 
        document.getElementById("message_erreur").innerText = `Impossible d'ajouter un admin: ${r.statusText}`;
    }
}