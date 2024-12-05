<?php
require_once("../config/conexion.php");
require_once("../models/usuarios.php");

$usuarios=new Usuarios();
switch($_GET["op"]){
    case "hola":
        echo "hola";
        break;
    default:
        $datos = $usuarios->getUsuarios();
        echo json_encode($datos);
        break;
}

?>