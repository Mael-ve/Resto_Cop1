Requetes de création des bases de données utilisées :

CREATE TABLE commentateur (
  	id int(255) unsigned NOT NULL,
  	pseudo varchar(50),
  	lien_tete varchar(255) DEFAULT NULL,
	mdp varchar(50),
  	PRIMARY KEY (id)
  	)

CREATE TABLE restaurants (
	nom varchar(255),
	type_resto varchar(255),
	localisation varchar(255),
	ville varchar(255),
	id_commentateur int(255) unsigned NOT NULL REFERENCES commentateur(id), 
	coup_coeur bool,
	commentaire TEXT,
	prix TEXT,
	date_ajout DATETIME, 
	PRIMARY KEY (nom)
)

