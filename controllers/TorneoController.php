<?php
require_once 'core/Controller.php';
require_once 'models/Torneo.php';

class TorneoController extends Controller {
    // Página principal de torneos
    public function index() {
        $torneos = new Torneo();
        //$torneos = $torneos ->search();
        $torneos = $torneos->getTorneos();
        $this->view('torneo', ['torneos' => $torneos]);
    }

    // Buscar torneos
    public function search() {
        $torneo = new Torneo();
        
        if (isset($_POST['query'])) {
            $query = $_POST['query'];
            //$query = 15193348;
            $resultados = $torneo->getResultado($query);
            header('Content-Type: application/json');
            echo json_encode($resultados);
        }
    }
    
    //poblar torneo
    public function insert(){
        $torneo = new Torneo();
        if (isset($_POST['url'])){
            $url = $_POST['url'];
            $resultado = array('resultado'=>$torneo->insertarTorneoEnlace($url));
            echo json_encode($resultado);
        }
    }
}