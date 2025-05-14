const liste_restoHTML = document.getElementById("Liste_resto")
const requeteHTML = document.getElementById("titre_page");

let liste_resto = [];
// resto à prendre en exemple pour les graphismes (type de renvoie dans un tableau de la requete fetch("/Lyon."))
// {nom: "Naanwich'riz", type_resto: "indien", localisation: "7 rue Désirée, au dessus de l’opéra", coup_coeur: 0}

async function get_data(requete){
    const reponse = await fetch(`/api/get_resto?=${requete}`);
    const data = await reponse.json();
    return data;
}

const addDataHTML = () =>{
    liste_restoHTML.innerHTML = '';
    if(liste_resto.length > 0){
        liste_resto.forEach(resto => {
            let newResto = document.createElement("div");
            newResto.classList.add('Resto'); // classe de chaque restaurant 
            // forme du resto dans sa grille
            newResto.innerHTML = `
            <h3>${resto.nom}</h3>
            <p>${resto.type_resto}</p>  
            `;
            liste_restoHTML.appendChild(newResto);
        })
    }
}

const initApp = async () =>{
    const requete = requeteHTML.outerText.toLowerCase(); // recupere le titre de la page 
    liste_resto = await get_data(requete);
    addDataHTML();
}

initApp();

