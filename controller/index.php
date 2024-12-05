<?php
switch($_GET["op"]){
    case "torneo":
        require("torneos.php");
        break;
    default:
        //echo "no hay nada";
    ?>
        <div id="fondo">
        <div class="wb-hr"></div>
            <h1>La Pagina web estara disponible pronto</h1>
            <div class="wb-domain">twpy.great-site.net</div>
            <div class="wb-list">
                <div><b>En la pagina podras:</b></div>
                <ol>
                    <li>Seguir el ranking de la comunidad</li>
                    <li>Verificar los resultados de los torneos</li>
                    <li>Otras funcionalidades en el futuro</li>
                </ol>
            </div>
            <div class="wb-hr"></div>
            <div class="wb-powered">Powered by <a href="https://site.pro/?utm_source=b2b&amp;utm_medium=free&amp;utm_campaign=under_construction&amp;utm_content=twpy.great-site.net" title="Site.pro" target="_blank">Site.pro</a></div>
    </div>
    <?php
    break;
}
?>
<!--  <div id="fondo">
        <div class="wb-hr"></div>
            <h1>La Pagina web estara disponible pronto</h1>
            <div class="wb-domain">twpy.great-site.net</div>
            <div class="wb-list">
                <div><b>En la pagina podras:</b></div>
                <ol>
                    <li>Seguir el ranking de la comunidad</li>
                    <li>Verificar los resultados de los torneos</li>
                    <li>Otras funcionalidades en el futuro</li>
                </ol>
            </div>
            <div class="wb-hr"></div>
            <div class="wb-powered">Powered by <a href="https://site.pro/?utm_source=b2b&amp;utm_medium=free&amp;utm_campaign=under_construction&amp;utm_content=twpy.great-site.net" title="Site.pro" target="_blank">Site.pro</a></div>
    </div>-->