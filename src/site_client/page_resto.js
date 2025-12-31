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

    //modifie title
    let head = document.getElementsByTagName("title");
    head[0].innerHTML = `${nom_resto.toUpperCase()}` ;

    //modifie le titre 
    let titre = document.getElementById("titre");
    titre.innerHTML = `${nom_resto.toUpperCase()} (${commentaires[0].ville.toUpperCase()})`;

    //affiche un coeur si coup de coeur
    let emplacement_coeur = document.getElementById("emplacement_coeur");
    if(commentaires[0].coup_coeur){
        emplacement_coeur.innerHTML = "<span id='coeur'></span>";
    }

    //affichage de l'adresse, du prix et des commentaires si y'en a... 
    let list_comment = document.getElementById("list_commentaire");
    list_comment.innerHTML = '';

    list_comment.innerHTML += `
    <div id="adresse">
		<h3>ADRESSE</h3>
		${commentaires[0].adresse}
	</div>
    `;

    list_comment.innerHTML += `
    <div id="prix">
		<h3>PRIX</h3>
        ${commentaires[0].prix}
	</div>
    `;

    if(commentaires[0].commentaire != null){
        commentaires.forEach(comment => {
            list_comment.innerHTML += `
            <div class="commentaire">
				<h3>${comment.username}</h3>
                ${comment.commentaire}
			</div>
            `;
        });
    }

}

async function init(){
    const data = await get_commentaire();
    console.log(data);
    affiche_commentaire(data);
}

init();