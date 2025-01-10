<?php
include 'includes/head.php';
?>
<button id="insert-btn">Actualizar Datos</button>
<button id="consult-btn">Consultar Datos</button>

    <div id="search-container" style="display:none;">
        <input type="text" id="search-input" placeholder="Buscar torneo...">
        <button onclick="search()">Buscar</button>
    </div>

    <div id="insert-container" style="display:none;">
        <input type="text" id="insert-input" placeholder="Insertar torneo...">
        <button onclick="insert()">Insertar</button>
    </div>

    <div id="Tabla">
        <?php foreach ($torneos as $torneo): ?>
            <p><?php $valor=json_encode($torneo);
            echo $valor; ?></p>
        <?php endforeach; ?>
    </div>
<?php
include 'includes/foot.php';