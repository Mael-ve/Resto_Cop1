async function verifie_cookie(){
    const est_bon_token = await fetch("/ajout_resto.html", {method : 'POST', body : document.cookie});
    const reponse = await est_bon_token.json();
    return reponse === true;
}

async function init_connexion(){
    const cookie_valable = await verifie_cookie();
    if(document.cookie === "" || !cookie_valable ){
        location.replace("/connexion.html");
    }
    else{
        if(location.pathname === "/connexion.html"){
            location.replace("/ajout_resto.html");
        }
    }
}

init_connexion();