let params = new URLSearchParams(location.search);
let nom_resto = params.get("nom_resto")

if(!nom_resto){
    location.replace('/index.html');
    // si y'a pas de nom de resto, l'utilisateur est renvoyé à la page principale 
}

async function get_commentaire(){
    const reponse = await fetch(`/api/get_commentaire?nom_resto=${nom_resto}`);
    const data = await reponse.json();
    return data;
}

function affiche_commentaire(commentaires){



}

async function init(){
    const data = await get_commentaire();
    console.log(data);
}

init();