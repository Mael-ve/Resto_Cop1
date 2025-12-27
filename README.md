# Projet de création d'un serveur web en Node JS accompagné d'un Tripadvisor

## Description
C'est un site qui est sensé répertorié les recommendations de restaurants des personnes enregistrés en tant que commentateur dont tout le monde peut avoir accès aux recommendations. 

## Faire tourner le site Web 
Il faut créer un fichier DB.env qui contient les paramètres secret de notre base de données de la forme :
``` DB_PASSWORD=password_root \n DB_NAME=nom_de_bdd ```

Ensuite à l'aide de docker (à installer) il faut lancer la commande :
``` docker compose --env-file DB.env up ```

La configuration actuelle utilisant le module nodemon, il n'est pas nécéssaire de supprimer les contenaires après chaque modification des fichiers coté serveur. 


