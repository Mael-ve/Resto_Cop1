async function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("mdp").value;

    let r = await fetch("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });

    if (r.status === 200) {
        let { token } = await r.json();
        document.cookie = "Token=" + token;

        let params = new URLSearchParams(location.search);
        let next = params.get("next") || "/ajout_resto.html";
        location.replace(next);
    }
    else {
        console.log(`Error login in: ${r.statusText}`);
        document.getElementById("message_erreur").innerText = `Erreur de connexion: ${r.statusText}`;
    }
}