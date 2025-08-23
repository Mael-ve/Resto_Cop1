async function verifie_cookie(){
    const est_bon_token = await fetch("/ajout_resto.html", {method : 'POST', body : document.cookie});
    const reponse = await est_bon_token.json();
    return reponse === true;
}

async function init_connexion(){
    if(document.cookie === ""){
        location.replace("/connexion.html?modif=les cookies sont vides ");
    }
    else{
        const cookie_valable = await verifie_cookie();
        if(!cookie_valable){
            location.replace("/connexion.html?modif=Session expiré. Merci de vous reconnecter.");
        }
        else{
            if(location.pathname === "/connexion.html"){
                location.replace("/ajout_resto.html?modif=");
            }
        }
    }
}

init_connexion();