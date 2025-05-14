const liste_restoHTML = document.getElementById("test")

let liste_resto = [{nom: "Naanwich'riz", type_resto: "indien", localisation: "7 rue Désirée, au dessus de l’opéra", coup_coeur: 0}];

async function get_data(){
    const reponse = await fetch("/Lyon.");
    const data = await reponse.json();
    return data;
}

const addDataHTML = () =>{
    liste_restoHTML.innerHTML = '';
    if(liste_resto.length > 0){
        liste_resto.forEach(resto => {
            let newResto = document.createElement("li");
        })
    }
}

const initApp = async () =>{
    //liste_resto = await get_data();
    console.log(liste_resto);  
}

initApp();

