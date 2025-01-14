
<?php
require_once("config/conexion.php");
class Torneo extends Conectar{
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
            $sql = "SELECT T.Nombre_torneo,U.usuario,tp.posicion,tp.puntaje FROM Torneo_posiciones tp JOIN Torneo T ON tp.juego_id =T.id_juego AND tp.Torneo_id=T.id_torneo JOIN                          usuarios U ON U.id_usuario=tp.usuario_id WHERE tp.Torneo_id=? ORDER BY tp.posicion ASC";
            $sql = $conexion->prepare($sql);
            $sql->execute([$torneo]);

            return $resultado= $sql->fetchAll(PDO::FETCH_ASSOC);
            //return "query existoso";

        }catch(Exception $e){
            return "error".$e->getMessage();
        }
    }
    public function insertarTorneo($juego,$id,$nombre,$fecha){
        $mensaje ="registro insertado correctamente";
        $conexion = parent::conexion();
        $sql1 ="SELECT COUNT(1) Control FROM Torneo WHERE id_torneo=?";
        $sql2 = "INSERT INTO Torneo(id_juego,id_torneo,Nombre_torneo,fecha_torneo) values(?,?, ?, ?)";
        try{
            $sql1 = $conexion->prepare($sql1);
            $sql1->execute([$id]);
            //controlamos el resultado
            $control =$sql1->fetchAll(PDO::FETCH_ASSOC);
            if($control[0]["Control"]==0){
                $sql2 = $conexion->prepare($sql2);
                if($nombre == null || $fecha ==null){
                    //tengo que obtener los datos de la api
                    $nombre = "no tenia nombre";
                    $fecha = getdate();
                    $sql2->execute(params:[$juego,$id,$nombre,$fecha]);
                }else{
                    $sql2->execute(params:[$juego,$id,$nombre,$fecha]);
                }
            }else{
                $mensaje = "ya existe un registro para ese torneo: ".$id;
            }
        } catch(Exception $ex){
            $mensaje="error: ".$ex->getMessage();
        }
        return $mensaje;
    }

    public function insertarTorneoEnlace($enlace){
        $cred = new Config();
        $curl = curl_init();
        curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://api.challonge.com/v1/tournaments/'.$enlace.'.json?api_key='.$cred->getAPIKey().'&include_participants=1',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        ));

        $response = curl_exec($curl);

        curl_close($curl);

        $datos = json_decode($response,true);
        $dtorneo = $datos["tournament"];
        $msj=$this->insertarTorneo($dtorneo["game_id"],$dtorneo["id"],$dtorneo["name"],substr($dtorneo["started_at"],0,10));
        $participantes=$datos["tournament"]["participants"];
        foreach($participantes as $part){
            $dpart = $part["participant"];
            $this->insertarResultados($dtorneo["game_id"],$dpart["tournament_id"],$dpart["challonge_user_id"],$dpart["final_rank"]);
        }
        return $msj;
    }
    public function insertarResultados($juego,$torneo,$player,$posicion){
        $msj="insertado correctamente";
        $conexion=parent::conexion();
        $sql = "INSERT INTO torneo_posiciones SELECT :juego,:torneo,:player,:pos,p.puntaje FROM puntuaciones p WHERE p.juego_id = :juego AND p.posicion=:pos";
        if($player!==null){
            try{
                $sql=$conexion->prepare($sql);
                $sql=$sql->execute(params: ['juego'=>$juego,'torneo'=>$torneo,'player'=>$player,'pos'=>$posicion]);
            }catch(Exception $e){
                $msj = "error: ".$e->getMessage();
            }
        }
    }
}
/*$test = new Torneo();
echo var_dump($test->getResultado(15193348));*/
?>
