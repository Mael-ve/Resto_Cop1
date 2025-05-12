const liste_resto = document.getElementById("test")

async function get_data(){
    const reponse = await fetch("/Lyon.");
    const data = await reponse.json();
    return data
}

const data = get_data();
const deconstruit = () => {
    data.then((res) =>{
        liste_resto.innerHTML = "<li>" +JSON.stringify(res[0]) + "</li>";
        liste_resto.innerHTML = "<li>" +JSON.stringify(res[1]) + "</li>";
    })
}

deconstruit();
