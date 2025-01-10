<?php
// Habilitar errores para desarrollo (opcional, deshabilitar en producción)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Cargar archivos necesarios
require_once 'controllers/HomeController.php';
require_once 'controllers/TorneoController.php';
//require_once 'controllers/RankingController.php';

// Obtener la página solicitada (parámetro "page" en la URL)
$page = isset($_GET['page']) ? $_GET['page'] : 'home';

// Enrutamiento: Dirigir la solicitud al controlador correspondiente
switch ($page) {
    case 'torneos':
        $controller = new TorneoController();
        
        if(isset($_GET["action"])){
            switch($_GET["action"]){
                case "search":
                    $controller->search();
                    break;
                case "insert":
                    $controller->insert();
                    break;
            }
            
        }else{
            $controller->index();
        }
        break;

    case 'ranking':
        $controller = new RankingController();
        $controller->index();
        break;

    case 'home': // Página de inicio (opcionalmente, como "home")
    default:
        $controller = new HomeController();
        $controller->index();
        break;
}

// Fin de index.php