# Projet de création d'un serveur web en Node JS accompagné d'un Tripadvisor

## Description
C'est un site qui est sensé répertorier les recommendations de restaurants des personnes enregistrés en tant que commentateur dont tout le monde peut avoir accès aux recommendations. 

## Faire tourner le site Web 
Il faut créer un fichier .env qui contient les paramètres secret de notre base de données de la forme : ``` DB_PASSWORD=password_root``` et ```DB_NAME=nom_de_bdd ``` 
(le nom de base de données est pas forcément secret mais t'inquiète)

Il faut aussi mettre une valeur pour le port sur lequel le site se lance avec une ligne : ```PORT=8000``` par exemple

Ensuite à l'aide de docker (à installer) il faut lancer la commande :
``` docker compose --env-file .env up ```

L'utilisateur peut aussi mettre des valeurs différentes dans le fichier .env pour les constantes : ```SECRET_KEY```, ```SALT``` et ```MDP_ADMIN```

La configuration actuelle utilisant le module nodemon, il n'est pas nécéssaire de supprimer les contenaires après chaque modification des fichiers coté serveur. 


