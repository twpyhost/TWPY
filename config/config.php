<?php

class Config{
    //variables para la conexion
    private $host = "define aqui el host de tu DB";
    private $base = "nombre de tu base de datos";
    private $usuario = "usuario de la DB";
    private $contrasena = "pass de la conexion a la db";
    private $apikey = "tu api key en caso de utilizarla";
    private $passphrase = "Passprhase para tu consulta de la api";

    //metodos para retornar los valores
    public function GetDBHost(){
        return $this->host;
    }

    public function GetDBName(){
        return $this->base;
    }

    public function GetDBUser(){
        return $this->usuario;
    }

    public function GetDBPass(){
        return $this->contrasena;
    }

    public function GetAPIKey(){
        return $this->apikey;
    }

    public function GetPassPhrase(){
        return $this->passphrase;
    }

    public function GetDBArgs(){
        return [
            "DB_HOST"=>$this->GetDBHost(),
            "DB_NAME"=>$this->GetDBName(),
            "DB_USER"=>$this->GetDBUser(),
            "DB_PASS"=>$this->GetDBPass()
        ];
    }

}
?>