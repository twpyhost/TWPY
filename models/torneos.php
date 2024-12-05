
<?php
require_once("config/conexion.php");
class Torneos extends Conectar{
    public function getTorneos(){
        try{
            $conexion=parent::conexion();
            $sql = "SELECT * FROM Torneo";
            $sql = $conexion->prepare($sql);
            $sql->execute();

            return $resultado= $sql->fetchAll(PDO::FETCH_ASSOC);
            //return "query existoso";

        }catch(Exception $e){
            return "error".$e->getMessage();
        }
    }
    public function getResultado($torneo){
        try{
            //15193348
            $conexion=parent::conexion();
            $sql = "SELECT * FROM Torneo_posiciones WHERE Torneo_id=? ORDER BY posicion ASC";
            $sql = $conexion->prepare($sql);
            $sql->execute([$torneo]);

            return $resultado= $sql->fetchAll(PDO::FETCH_ASSOC);
            //return "query existoso";

        }catch(Exception $e){
            return "error".$e->getMessage();
        }
    }
}
//$test=new Torneos();
//echo $test->getResultado(15193348);
?>