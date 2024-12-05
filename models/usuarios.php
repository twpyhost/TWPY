<?php
require_once("../config/conexion.php");
class Usuarios extends Conectar{
    public function getUsuarios(){
        try{
            $conexion=parent::conexion();
            $sql = "SELECT * FROM usuarios";
            $sql = $conexion->prepare($sql);
            $sql->execute();

            return $resultado= $sql->fetchAll(PDO::FETCH_ASSOC);
            //return "query existoso";

        }catch(Exception $e){
            return "error".$e->getMessage();
        }
    }
}
//$test = new Usuarios();
//echo $test->getUsuarios();
?>