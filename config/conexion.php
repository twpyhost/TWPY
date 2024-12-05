<?php

require_once 'config.php';

class Conectar{

    protected $dbh;

    public function conexion(){      
        try{
            $db = new Config();
            $cone = $db->GetDBArgs();
            //$args = "mysql: host=".$cone["DB_HOST"].";dbname=".$cone["DB_NAME"].",".$cone["DB_USER"].",".$cone["DB_PASS"];
            $con = $this->dbh = new PDO("mysql:host=".$cone["DB_HOST"].";dbname=".$cone["DB_NAME"],$cone["DB_USER"],$cone["DB_PASS"]);
            $con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $con;

        }catch(Exception $ex){
            die("Error en la conexion".$ex->getMessage());
            //return "Conexion fallida".$ex->getMessage();
        }
    }
}
?>