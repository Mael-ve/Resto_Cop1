function init_connexion(){
    if(document.cookie === ""){
        location.replace("/connexion.html");
    }
}

init_connexion();