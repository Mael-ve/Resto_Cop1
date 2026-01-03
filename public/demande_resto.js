const liste_restoHTML = document.getElementById("Liste_resto")

let liste_resto = [];
// resto à prendre en exemple pour les graphismes (type de renvoie dans un tableau de la requete fetch("/Lyon."))
// {nom: "Naanwich'riz", type_resto: "indien", localisation: "7 rue Désirée, au dessus de l’opéra", coup_coeur: 0}

async function get_data(){
    const reponse = await fetch("/api/get_resto");
    const data = await reponse.json();
    return data;
}

const addDataHTML = () =>{
    // chaque resto a les propriété suivantes : nom, type_resto, adresse, ville, coup_coeur et l'username de celui qui l'a ajouté 
    liste_restoHTML.innerHTML = '';

    if(liste_resto.length > 0){

        liste_resto.forEach(resto => {
            let newResto = document.createElement("div");
            newResto.classList.add('resto'); // classe de chaque restaurant 

            // forme du resto dans sa grille
            newResto.innerHTML = `
            <a href="page_resto.html?nom_resto=${resto.nom}">
            <h3>${resto.nom.toUpperCase()} (${resto.ville.toUpperCase()}) </h3>
            <p><b>${resto.type_resto}</b> proposé par <b>${resto.username}</b></p>  
            </a> `;

            if(resto.coup_coeur){
                newResto.innerHTML += "<span id='coeur'></span>"
            }

            liste_restoHTML.appendChild(newResto);
        })
    }
}

async function filtre_resto(){
    let requete = "/api/get_resto";
    let checkboxes = window.document.getElementsByTagName('input');
    let a_premier_element = false
    for(var i = 0; i < checkboxes.length; i++){
        if(checkboxes[i].checked){
            let parent = checkboxes[i].closest("li");
            if(a_premier_element){
                requete += `&${parent.id}=${checkboxes[i].id}`;
            }
            else{
                requete += `?${parent.id}=${checkboxes[i].id}`;
                a_premier_element=true;
            }
        }
    }
    const reponse = await fetch(requete);
    const data = await reponse.json();
    liste_resto = await data;
    addDataHTML();

    let menu = document.getElementById("list-filtre");
    if (menu.className === "") {
        menu.className = "open";
    } else {
        menu.className = "";                    
    }
}

const initApp = async () =>{
    liste_resto = await get_data();
    addDataHTML();
}

initApp();

