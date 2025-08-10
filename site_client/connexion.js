async function verifie_cookie(){
    const est_bon_token = await fetch("/ajout_resto.html", {method : 'POST', body : document.cookie});
    return (est_bon_token === "true")
}

function init_connexion(){
    if(document.cookie === "" || !verifie_cookie()){
        location.replace("/connexion.html");
    }
}

init_connexion();