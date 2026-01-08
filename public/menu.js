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
        location.replace(`/connexion.html?next=/ajout_resto.html`);
    }
}

async function menu_filtre(){
	let r = await fetch("/api/get_ville");
	let data = await r.json();

	let emplacement = document.getElementById("ville");
	
	data.forEach(elem => {
		emplacement.innerHTML += `
			<label for="${elem.ville}">${elem.ville.toUpperCase()}</label>
			<input type="checkbox" id="${elem.ville}"name="${elem.ville}" value="unchecked" unchecked/>
		`;
	});
}

function get_cookie(name) {
    let r = document.cookie.split(";").map(v => v.trimStart()).map(str => str.split("=")).find(([n, _]) => n === name);
    if (r) return r[1];
    return null;
}