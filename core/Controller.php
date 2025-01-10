<?php
class Controller {
    public function view($viewName, $data = []) {
        extract($data);
        include 'views/' . $viewName . '.php';
    }
}
?>