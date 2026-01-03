function showResponsiveMenu() {
  let menu = document.getElementById("list-filtre");
  if (menu.className === "") {
    menu.className = "open";
  } else {
    menu.className = "";                    
  }
}

function menu_add_resto() {
    let token = get_cookie("Token");
    if (token) {
        location.replace("/ajout_resto.html");
    }
    else {
        location.replace(`/connexion.html?next=${encodeURI("/ajout_resto.html")}`);
    }
}

function menu_add_comment(){
    let params = new URLSearchParams(location.search);
    let nom_resto = params.get("nom_resto")
    let token = get_cookie("Token");
    if (token) {
        location.replace(`/ajout_commentaire.html?nom_resto=${nom_resto}`);
    }
    else {
        location.replace(`/connexion.html?next=${encodeURI(`/ajout_commentaire.html?nom_resto=${nom_resto}`)}`);
    }
}

function get_cookie(name) {
    let r = document.cookie.split(";").map(v => v.trimStart()).map(str => str.split("=")).find(([n, _]) => n === name);
    if (r) return r[1];
    return null;
}