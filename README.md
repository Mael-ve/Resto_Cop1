form database : 

CREATE TABLE commentateur (
  	id int(255) unsigned NOT NULL AUTO_INCREMENT,
  	pseudo varchar(50),
  	lien_tete varchar(255) DEFAULT NULL,
  	PRIMARY KEY (id)
  	)

CREATE table restaurants (
	nom varchar(255),
	type_resto varchar(255),
	localisation varchar(255),
	ville varchar(255),
	id_commentateur int(255) unsigned NOT NULL REFERENCES commentateur(id),
	coup_coeur bool,
	commentaire TEXT,
	prix TEXT,
	PRIMARY KEY (nom)
)
