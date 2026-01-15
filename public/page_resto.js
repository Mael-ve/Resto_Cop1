let params = new URLSearchParams(location.search);
let id_resto = params.get("id_resto")

if(!id_resto){
    location.replace('/index.html');
    // si y'a pas de nom de resto, l'utilisateur est renvoyé à la page principale 
}

async function get_info_resto(){
    const reponse = await fetch(`/api/get_resto_unique?id_resto=${id_resto}`);
    const data = await reponse.json();
    return data;
}

async function get_commentaire(){
    const reponse = await fetch(`/api/get_commentaire?id_resto=${id_resto}`);
    const data = await reponse.json();
    return data;
}

function affiche_commentaire(info_resto, commentaires){

    //modifie title
    let head = document.getElementsByTagName("title");
    head[0].innerHTML = `${info_resto.nom.toUpperCase()}` ;

    //modifie le menu
    let bouton = document.getElementById("bouton_droite");
    bouton.innerHTML = `<a href="/connexion.html?next=/page_resto.html?id_resto=${id_resto}"> Connexion</a>`

    //modifie le titre 
    let titre = document.getElementById("titre");
    titre.innerHTML = `${info_resto.nom.toUpperCase()} (${info_resto.ville.toUpperCase()})`;

    //affiche un coeur si coup de coeur
    let emplacement_coeur = document.getElementById("emplacement_coeur");
    if(info_resto.coup_coeur){
        emplacement_coeur.innerHTML = "<span id='coeur'></span>";
    }

    //affichage de l'adresse, du prix et des commentaires si y'en a... 
    let list_comment = document.getElementById("list_commentaire");
    list_comment.innerHTML = '';

    list_comment.innerHTML += `
    <div id="adresse">
		<h3>ADRESSE</h3>
		${info_resto.adresse}
	</div>
    `;

    list_comment.innerHTML += `
    <div id="prix">
		<h3>PRIX</h3>
        ${info_resto.prix}
	</div>
    `;

    if(commentaires[0]){
        if(commentaires[0].commentaire != null){
            commentaires.forEach(comment => {
                list_comment.innerHTML += `
                <div class="commentaire">
                    <h3>${comment.username.toUpperCase()}</h3>
                    ${comment.commentaire}
                </div>
                `;
            });
        }
    }

}

async function is_authentification_valid(token) {
    let r = await fetch("/api/me", { headers: { "authorization": token } });
    return (r.status === 200);
}

async function affichage_admin(info_resto, commentaires){

    //modifie title
    let head = document.getElementsByTagName("title");
    head[0].innerHTML = `${info_resto.nom.toUpperCase()}` ;

    //modifie le menu
    let bouton = document.getElementById("bouton_droite");
    bouton.innerHTML = "";

    //modifie le titre 
    let titre = document.getElementById("titre");
    titre.innerHTML = `${info_resto.nom.toUpperCase()} (${info_resto.ville.toUpperCase()})`;

    //affiche un coeur si coup de coeur
    let emplacement_coeur = document.getElementById("emplacement_coeur");
    if(info_resto.coup_coeur){
        emplacement_coeur.innerHTML = "<span id='coeur'></span>";
    }

    //affichage de l'adresse, du prix et des commentaires si y'en a... 
    let list_comment = document.getElementById("list_commentaire");
    list_comment.innerHTML = '';

    list_comment.innerHTML += `
    <div id="adresse">
		<h3>ADRESSE</h3>
		${info_resto.adresse}
	</div>
    `;

    list_comment.innerHTML += `
    <div id="prix">
		<h3>PRIX</h3>
        ${info_resto.prix}
	</div>
    `;

    //ajout d'une croix pour supprimer des commentaires
    if(commentaires[0]){
        if(commentaires[0].commentaire != null){
            commentaires.forEach(comment => {
                list_comment.innerHTML += `
                <div class="commentaire">
                    <button id="croix" onclick="suppr_comment(${comment.id_comment})"> X </button> 
                    <button id="crayon" onclick="edit_comment(${comment.id_comment}, this.closest('.commentaire'))"> &#9998 </button>
                    <h3>${comment.username.toUpperCase()}</h3>
                    ${comment.commentaire}
                </div>
                `;
            });
        }
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
    const info_resto = await get_info_resto();
    const comment= await get_commentaire();
    let token = get_cookie("Token");
    let is_auth_valid = await is_authentification_valid(token);
    if (!token || !is_auth_valid) {
        affiche_commentaire(info_resto[0], comment);
    }
    else{
        affichage_admin(info_resto[0], comment);
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

async function edit_comment(id_comment, div_comment) {

   let token = get_cookie("Token");
    if(!token){
        location.replace(`/connexion.html?next=/page_resto.html?id_resto=${id_resto}`);
        return;
    }

    const reponse = await fetch(`/api/get_comment_by_id?id=${id_comment}`);
    const comment = await reponse.json();

    div_comment.innerHTML =`
            <h3>${comment[0].username.toUpperCase()}</h3>
            <label for="update_commentaire"> Nouveau Commentaire : </label>
            <textarea id="update_commentaire" name="update_commentaire">
            ${comment[0].commentaire}
            </textarea>
            <button onclick="update_comment(${id_comment})">Publier le commentaire</button>
        `;
}

async function update_comment(id_comment) {
    const commentaire = document.getElementById("update_commentaire").value;

    let token = get_cookie("Token");
    if (!token) {
        location.replace(`/connexion.html?next=/page_resto.html?id_resto=${id_resto}`);
        return;
    }

    let r = await fetch("/api/update_comment", {
        method: "POST", headers: { Authorization: token }, body: JSON.stringify({
            id_comment, commentaire
        }),
    });

    if (r.status === 200){
        location.reload();
    }
    else { 
        document.getElementById("message_erreur").innerText = `Impossible d'ajouter un Commentaire: ${r.statusText}`;
    }
}