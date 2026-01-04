let params = new URLSearchParams(location.search);
let id_resto = params.get("id_resto")

if(!id_resto){
    location.replace('/index.html');
    // si y'a pas de nom de resto, l'utilisateur est renvoyé à la page principale 
}

async function get_commentaire(){
    const reponse = await fetch(`/api/get_commentaire?id_resto=${id_resto}`);
    const data = await reponse.json();
    return data;
}

function affiche_commentaire(commentaires){

    //modifie title
    let head = document.getElementsByTagName("title");
    head[0].innerHTML = `${commentaires[0].nom.toUpperCase()}` ;

    //modifie le menu
    let bouton = document.getElementById("bouton_droite");
    bouton.innerHTML = `<a href="/connexion.html?next=/page_resto.html?id_resto=${id_resto}"> Connexion</a>`

    //modifie le titre 
    let titre = document.getElementById("titre");
    titre.innerHTML = `${commentaires[0].nom.toUpperCase()} (${commentaires[0].ville.toUpperCase()})`;

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

async function is_authentification_valid(token) {
    let r = await fetch("/api/me", { headers: { "authorization": token } });
    return (r.status === 200);
}

async function affichage_admin(commentaires){

    //modifie title
    let head = document.getElementsByTagName("title");
    head[0].innerHTML = `${commentaires[0].nom.toUpperCase()}` ;

    //modifie le menu
    let bouton = document.getElementById("bouton_droite");
    bouton.innerHTML = "";

    //modifie le titre 
    let titre = document.getElementById("titre");
    titre.innerHTML = `${commentaires[0].nom.toUpperCase()} (${commentaires[0].ville.toUpperCase()})`;

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

    //ajout d'une croix pour supprimer des commentaires
    if(commentaires[0].commentaire != null){
        commentaires.forEach(comment => {
            list_comment.innerHTML += `
            <div class="commentaire">
                <button id="croix" onclick="suppr_comment(${comment.id_comment})"> X </button> 
				<h3>${comment.username.toUpperCase()}</h3>
                ${comment.commentaire}
			</div>
            `;
        });
    }

    list_comment.innerHTML += `
        <div id="ajout_comment">
			<label for="commentaire"> Nouveau Commentaire : </label>
            <textarea id="commentaire" name="commentaire"></textarea>

			<button onclick="add_comment()">Publier le commentaire</button>

            <div id="message_erreur"></div>
		</div>`;
}

async function init(){
    const data = await get_commentaire();
    let token = get_cookie("Token");
    let is_auth_valid = await is_authentification_valid(token);
    if (!token || !is_auth_valid) {
        affiche_commentaire(data);
    }
    else{
        affichage_admin(data);
    }
}

init();

async function add_comment(){
    let commentaire = document.getElementById("commentaire").value;

    let token = get_cookie("Token");
    if (!token) {
        location.replace(`/connexion.html?next=/page_resto.html?id_resto=${id_resto}`);
        return;
    }

    let r = await fetch("/api/add_comment", {
        method: "POST", headers: { Authorization: token }, body: JSON.stringify({
            id_resto, commentaire
        }),
    });

    if (r.status === 200){
        location.reload();
    }
    else { 
        document.getElementById("message_erreur").innerText = `Impossible d'ajouter un Commentaire: ${r.statusText}`;
    }
}

async function suppr_comment(id_comment){

    let token = get_cookie("Token");
    if(!token){
        location.replace(`/connexion.html?next=/page_resto.html?id_resto=${id_resto}`);
        return;
    }

    let r = await fetch("/api/suppr_comment", {
        method:"POST", headers: { Authorization: token}, body: JSON.stringify({
            id_comment
        })
    })

    if(r.status === 200){
        location.reload();
    }
    else{
        document.getElementById("message_erreur").innerText = `Impossible de supprimer le Commentaire: ${r.statusText}`;
    }
}
